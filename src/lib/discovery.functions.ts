import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { callAI, extractToolArgs } from "@/lib/ai.server";
import {
  fcSearch,
  extractPhone,
  extractInstagramHandle,
  verifyOwnWebsite,
  isOwnDomain,
} from "@/lib/firecrawl.server";
import { AUTO_NICHES, roundRobinCities, pickRandom } from "@/lib/discovery";

type Cand = {
  url: string;
  title: string;
  description: string;
  niche: string;
  city: string;
};

type NormalizedLead = {
  name: string;
  niche: string;
  city: string;
  instagram: string;
  phone: string;
  website: string;
  source_url: string;
  has_website: boolean;
  address: string;
  ai_analysis: string;
  score_reasons: string[];
  score: "cold" | "warm" | "hot" | "very_hot";
};

// Marcadores para descartar franquias/grandes redes/órgãos públicos
const BLOCK_PATTERNS = [
  /franquia/i,
  /franchising/i,
  /prefeitura/i,
  /governo/i,
  /minist[ée]rio/i,
  /secretaria/i,
  /sesc/i,
  /sesi/i,
  /senac/i,
  /senai/i,
  /mcdonald/i,
  /burger king/i,
  /subway/i,
  /magazine luiza/i,
  /casas bahia/i,
  /americanas/i,
  /carrefour/i,
  /pão de aç[uú]car/i,
  /extra hiper/i,
  /assa[ií]/i,
  /atacad[ãa]o/i,
  /drogaria s[ãa]o paulo/i,
  /droga raia/i,
  /pague menos/i,
  /o boticário/i,
  /natura /i,
];

function looksBlocked(text: string) {
  return BLOCK_PATTERNS.some((r) => r.test(text));
}

export const runAutoDiscovery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      name: z.string().trim().min(2).max(120).optional(),
      max_leads: z.number().int().min(5).max(200).default(30),
    }),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;

    const target = data.max_leads;
    const campaignName =
      data.name?.trim() ||
      `Descoberta Automática · ${new Date().toLocaleDateString("pt-BR")}`;

    const { data: campaign, error: cErr } = await supabase
      .from("campaigns")
      .insert({
        user_id: userId,
        name: campaignName,
        niche: "Descoberta Automática",
        city: "Brasil (cobertura nacional)",
        notes: `Meta: ${target} oportunidades. Cobertura nacional.`,
        max_leads: target,
        status: "running",
      })
      .select()
      .single();
    if (cErr) throw new Error(cErr.message);

    const cities = roundRobinCities(); // ordem por região, embaralhado
    const nicheRotation = pickRandom(AUTO_NICHES, AUTO_NICHES.length); // shuffle todos
    const seenUrls = new Set<string>();
    const seenNames = new Set<string>();
    let totalInserted = 0;
    let cityIdx = 0;
    let nicheIdx = 0;
    const CONCURRENCY = 3;
    // Hard cap para não gastar todos os créditos: no máximo 4× o alvo em cidades analisadas
    const MAX_CITY_BATCHES = Math.min(
      Math.ceil(cities.length / CONCURRENCY),
      Math.max(20, Math.ceil((target * 4) / CONCURRENCY)),
    );

    for (let batch = 0; batch < MAX_CITY_BATCHES && totalInserted < target; batch++) {
      const cityBatch = cities.slice(
        cityIdx,
        Math.min(cityIdx + CONCURRENCY, cities.length),
      );
      cityIdx += CONCURRENCY;
      if (cityBatch.length === 0) break;

      // Dois nichos por cidade, rotacionando
      const combos: Array<{ niche: string; city: string }> = [];
      for (const c of cityBatch) {
        for (let k = 0; k < 2; k++) {
          combos.push({
            niche: nicheRotation[nicheIdx % nicheRotation.length],
            city: c.name,
          });
          nicheIdx++;
        }
      }

      const perQuery = 4;
      const searches = await Promise.all(
        combos.map(async ({ niche, city }) => {
          try {
            const [ig, web] = await Promise.all([
              fcSearch(`${niche} ${city} site:instagram.com`, { limit: perQuery }),
              fcSearch(`${niche} ${city} whatsapp -franquia -rede -prefeitura`, {
                limit: perQuery,
              }),
            ]);
            return { niche, city, results: [...ig, ...web] };
          } catch {
            return { niche, city, results: [] };
          }
        }),
      );

      const candidates: Cand[] = [];
      for (const s of searches) {
        for (const r of s.results) {
          const key = r.url.replace(/\?.*$/, "").toLowerCase();
          if (seenUrls.has(key)) continue;
          seenUrls.add(key);
          const blob = `${r.title ?? ""} ${r.description ?? ""}`;
          if (looksBlocked(blob)) continue;
          candidates.push({
            url: r.url,
            title: r.title ?? "",
            description: r.description ?? "",
            niche: s.niche,
            city: s.city,
          });
        }
      }
      if (candidates.length === 0) continue;

      const enriched = candidates.map((c) => {
        const blob = `${c.title}\n${c.description}\n${c.url}`;
        return {
          ...c,
          phone: extractPhone(blob),
          instagram: extractInstagramHandle(c.url) ?? extractInstagramHandle(blob),
        };
      });

      // IA normaliza este batch. Pedimos mais que o restante para ter margem
      // após filtro de oportunidade (empresas com boa presença digital são
      // descartadas).
      const remaining = target - totalInserted;
      const askFor = Math.min(enriched.length, Math.max(remaining * 2, 10));

      let parsed: { leads: NormalizedLead[] };
      try {
        const json = await callAI({
          messages: [
            {
              role: "system",
              content:
                "Você é um agente de prospecção B2B. Normalize resultados REAIS do Google em leads reais. NUNCA invente empresas ou dados. Se algo não estiver no resultado, retorne vazio. Priorize PMEs locais brasileiras. DESCARTE: franquias nacionais, grandes redes, marketplaces, órgãos públicos, empresas fechadas. Score deve incluir motivos objetivos (checklist).",
            },
            {
              role: "user",
              content:
                "Resultados brutos do Google:\n" +
                JSON.stringify(enriched, null, 2) +
                `\n\nGere no máximo ${askFor} leads únicos, priorizando os com maior potencial (sem site aparente, com Instagram ativo, com WhatsApp).`,
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "return_leads",
                parameters: {
                  type: "object",
                  properties: {
                    leads: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          name: { type: "string" },
                          niche: { type: "string" },
                          city: { type: "string" },
                          instagram: { type: "string" },
                          phone: { type: "string" },
                          website: { type: "string" },
                          source_url: { type: "string" },
                          has_website: { type: "boolean" },
                          address: { type: "string" },
                          ai_analysis: { type: "string" },
                          score_reasons: {
                            type: "array",
                            items: { type: "string" },
                          },
                          score: {
                            type: "string",
                            enum: ["cold", "warm", "hot", "very_hot"],
                          },
                        },
                        required: [
                          "name",
                          "niche",
                          "city",
                          "instagram",
                          "phone",
                          "website",
                          "source_url",
                          "has_website",
                          "address",
                          "ai_analysis",
                          "score_reasons",
                          "score",
                        ],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: ["leads"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "return_leads" } },
        });
        parsed = extractToolArgs<{ leads: NormalizedLead[] }>(json);
      } catch (e) {
        console.error("AI batch failed", e);
        continue;
      }

      const filtered = parsed.leads.filter((l) => {
        if (!l.name || l.name.trim().length < 2) return false;
        const key = l.name.toLowerCase().trim();
        if (seenNames.has(key)) return false;
        if (looksBlocked(l.name)) return false;
        seenNames.add(key);
        return true;
      });

      // Verificação anti-falso-positivo de site
      const verified = await Promise.all(
        filtered.map(async (l) => {
          let website = l.website && isOwnDomain(l.website) ? l.website : "";
          if (!website) {
            const found = await verifyOwnWebsite({
              name: l.name,
              city: l.city,
              instagramHandle: l.instagram || null,
            });
            if (found) website = found;
          }
          const hasWebsite = !!website;
          let score = l.score;
          let reasons = (l.score_reasons ?? []).filter(
            (r) => !/sem\s*site|n[ãa]o\s*possui\s*site/i.test(r),
          );
          if (hasWebsite) {
            if (score === "hot" || score === "very_hot") score = "warm";
            reasons.push("Site encontrado durante verificação");
          } else {
            reasons.unshift("Site não encontrado automaticamente");
          }
          if (l.instagram) reasons.push("Instagram ativo");
          if (l.phone) reasons.push("WhatsApp/Telefone disponível");
          reasons = Array.from(new Set(reasons));
          return { ...l, website, has_website: hasWebsite, score, score_reasons: reasons };
        }),
      );

      // Só oportunidades: descarta quem tem site OK e nenhuma outra fraqueza
      const opportunities = verified.filter((l) => {
        if (!l.has_website) return true; // sem site = oportunidade clara
        // com site: manter apenas se score sugerir presença digital fraca
        return l.score === "warm" || l.score === "hot" || l.score === "very_hot";
      });

      const toInsert = opportunities.slice(0, remaining).map((l) => ({
        campaign_id: campaign.id,
        user_id: userId,
        name: l.name.trim(),
        phone: l.phone || null,
        whatsapp: l.phone || null,
        instagram: l.instagram || null,
        address: l.address || null,
        website: l.website || null,
        source_url: l.source_url || null,
        has_website: l.has_website,
        score: l.score,
        status: "new" as const,
        ai_analysis: l.ai_analysis || null,
        ai_problems: l.score_reasons ?? [],
        raw_data: {
          discovered_niche: l.niche,
          discovered_city: l.city,
          score_reasons: l.score_reasons,
          auto_discovery: true,
        },
      }));

      if (toInsert.length > 0) {
        const { error: insErr } = await supabase.from("leads").insert(toInsert);
        if (insErr) {
          console.error("Insert error", insErr);
        } else {
          totalInserted += toInsert.length;
          // Atualiza contador na campanha para o UI ver progresso
          await supabase
            .from("campaigns")
            .update({ updated_at: new Date().toISOString() })
            .eq("id", campaign.id);
        }
      }
    }

    await supabase
      .from("campaigns")
      .update({ status: "completed" })
      .eq("id", campaign.id);

    return { campaignId: campaign.id, inserted: totalInserted, target };
  });
