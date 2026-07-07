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
import { AUTO_NICHES, AUTO_CITIES, pickRandom } from "@/lib/discovery";

type Cand = {
  url: string;
  title: string;
  description: string;
  niche: string;
  city: string;
};

export const runAutoDiscovery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      name: z.string().trim().min(2).max(120).optional(),
      max_leads: z.number().int().min(5).max(50).default(24),
      iterations: z.number().int().min(2).max(12).default(6),
    }),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;

    const campaignName =
      data.name?.trim() ||
      `Descoberta Automática · ${new Date().toLocaleDateString("pt-BR")}`;

    // Cria campanha container
    const { data: campaign, error: cErr } = await supabase
      .from("campaigns")
      .insert({
        user_id: userId,
        name: campaignName,
        niche: "Descoberta Automática",
        city: "Brasil",
        notes: "Campanha criada via Descoberta Automática",
        max_leads: data.max_leads,
        status: "running",
      })
      .select()
      .single();
    if (cErr) throw new Error(cErr.message);

    // Combinações aleatórias niche × city
    const niches = pickRandom(AUTO_NICHES, data.iterations);
    const cities = pickRandom(AUTO_CITIES, Math.min(data.iterations, AUTO_CITIES.length));
    const combos: Array<{ niche: string; city: string }> = [];
    for (let i = 0; i < data.iterations; i++) {
      combos.push({
        niche: niches[i % niches.length],
        city: cities[i % cities.length],
      });
    }

    // Busca em paralelo, com foco em pequenos negócios (sem franquias grandes)
    const perQuery = 5;
    const searches = await Promise.all(
      combos.map(async ({ niche, city }) => {
        try {
          const [ig, web] = await Promise.all([
            fcSearch(`${niche} ${city} site:instagram.com`, { limit: perQuery }),
            fcSearch(`${niche} ${city} whatsapp -franquia -rede`, { limit: perQuery }),
          ]);
          return { niche, city, results: [...ig, ...web] };
        } catch {
          return { niche, city, results: [] };
        }
      }),
    );

    // Dedup por URL
    const seen = new Set<string>();
    const candidates: Cand[] = [];
    for (const s of searches) {
      for (const r of s.results) {
        const key = r.url.replace(/\?.*$/, "").toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        candidates.push({
          url: r.url,
          title: r.title ?? "",
          description: r.description ?? "",
          niche: s.niche,
          city: s.city,
        });
      }
    }

    const trimmed = candidates.slice(0, data.max_leads * 2);

    if (trimmed.length === 0) {
      await supabase.from("campaigns").update({ status: "completed" }).eq("id", campaign.id);
      return { campaignId: campaign.id, inserted: 0 };
    }

    // Pré-extração local
    const enriched = trimmed.map((c) => {
      const blob = `${c.title}\n${c.description}\n${c.url}`;
      return {
        ...c,
        phone: extractPhone(blob),
        instagram: extractInstagramHandle(c.url) ?? extractInstagramHandle(blob),
      };
    });

    // IA normaliza e pontua — com raciocínio explicando o score
    const json = await callAI({
      messages: [
        {
          role: "system",
          content:
            "Você é um agente de prospecção. Normaliza resultados REAIS do Google em leads reais. NUNCA invente empresas ou dados. Se algo não estiver no resultado, retorne vazio. Priorize PMEs locais. Evite franquias nacionais, grandes redes e marketplaces. Score deve ter uma lista de motivos objetivos (checklist).",
        },
        {
          role: "user",
          content:
            "Resultados brutos do Google de vários nichos/cidades brasileiras:\n" +
            JSON.stringify(enriched, null, 2) +
            "\n\nGere no máximo " +
            data.max_leads +
            " leads únicos, priorizando os com maior potencial (sem site aparente, com Instagram ativo, com WhatsApp).",
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
                        description:
                          "Checklist objetivo justificando o score (ex.: 'Sem site identificado', 'Instagram ativo', 'WhatsApp disponível').",
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

    const parsed = extractToolArgs<{
      leads: Array<{
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
      }>;
    }>(json);

    const filtered = parsed.leads.filter((l) => l.name && l.name.trim().length > 1);

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
        // dedupe reasons
        reasons = Array.from(new Set(reasons));
        return { ...l, website, has_website: hasWebsite, score, score_reasons: reasons };
      }),
    );

    const rows = verified.map((l) => ({
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

    if (rows.length > 0) {
      const { error: insErr } = await supabase.from("leads").insert(rows);
      if (insErr) throw new Error(insErr.message);
    }

    await supabase.from("campaigns").update({ status: "completed" }).eq("id", campaign.id);

    return { campaignId: campaign.id, inserted: rows.length };
  });
