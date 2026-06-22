import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { callAI, extractToolArgs } from "@/lib/ai.server";
import { fcSearch, extractPhone, extractInstagramHandle, verifyOwnWebsite, isOwnDomain } from "@/lib/firecrawl.server";

type RawCandidate = {
  url: string;
  title: string;
  description: string;
  source: "instagram" | "web";
};

function dedupe(items: RawCandidate[]): RawCandidate[] {
  const seen = new Set<string>();
  const out: RawCandidate[] = [];
  for (const it of items) {
    const key = it.url.replace(/\?.*$/, "").toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(it);
  }
  return out;
}

export const runCampaignSearch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ campaignId: z.string().uuid() }))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;

    const { data: campaign, error } = await supabase
      .from("campaigns")
      .select("*")
      .eq("id", data.campaignId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!campaign) throw new Error("Campanha não encontrada");

    await supabase
      .from("campaigns")
      .update({ status: "running" })
      .eq("id", campaign.id);

    const q = `${campaign.niche} ${campaign.city}`;
    const halfLimit = Math.max(5, Math.ceil(campaign.max_leads / 2));

    // Real web scraping via Firecrawl Search (Google-powered)
    const [igResults, webResults] = await Promise.all([
      fcSearch(`${q} site:instagram.com`, { limit: halfLimit }),
      fcSearch(`${q} contato whatsapp`, { limit: halfLimit }),
    ]);

    const candidates: RawCandidate[] = dedupe([
      ...igResults.map<RawCandidate>((r) => ({
        url: r.url,
        title: r.title ?? "",
        description: r.description ?? "",
        source: "instagram",
      })),
      ...webResults.map<RawCandidate>((r) => ({
        url: r.url,
        title: r.title ?? "",
        description: r.description ?? "",
        source: r.url.includes("instagram.com") ? "instagram" : "web",
      })),
    ]).slice(0, campaign.max_leads);

    if (candidates.length === 0) {
      await supabase
        .from("campaigns")
        .update({ status: "completed" })
        .eq("id", campaign.id);
      return { inserted: 0, message: "Nenhum resultado encontrado no Google." };
    }

    // Pre-extract phones/handles via regex on snippets
    const enriched = candidates.map((c) => {
      const blob = `${c.title}\n${c.description}\n${c.url}`;
      return {
        ...c,
        phone: extractPhone(blob),
        instagram: extractInstagramHandle(c.url) ?? extractInstagramHandle(blob),
      };
    });

    // Ask AI to normalize: business name, website (non-instagram), brief notes
    const json = await callAI({
      messages: [
        {
          role: "system",
          content:
            "Você normaliza resultados REAIS de busca do Google em leads de prospecção. NUNCA invente dados. Se a informação não estiver no resultado, retorne string vazia. Identifique o nome do negócio a partir do título/URL, deduplique resultados que claramente são o mesmo negócio.",
        },
        {
          role: "user",
          content:
            "Nicho: " +
            campaign.niche +
            "\nCidade: " +
            campaign.city +
            "\n\nResultados brutos do Google:\n" +
            JSON.stringify(enriched, null, 2),
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
                      name: { type: "string", description: "Nome do negócio (limpo)" },
                      instagram: { type: "string", description: "@handle ou ''" },
                      phone: { type: "string", description: "Telefone ou ''" },
                      website: {
                        type: "string",
                        description: "URL do site próprio (NÃO instagram/facebook) ou ''",
                      },
                      source_url: { type: "string" },
                      has_website: { type: "boolean" },
                      address: { type: "string", description: "Endereço/bairro se mencionado, ou ''" },
                      ai_analysis: {
                        type: "string",
                        description: "Análise curta (1-2 frases) da presença digital",
                      },
                      ai_problems: {
                        type: "array",
                        items: { type: "string" },
                        description: "Problemas encontrados: sem site, site antigo, bio fraca, etc.",
                      },
                      score: {
                        type: "string",
                        enum: ["cold", "warm", "hot", "very_hot"],
                        description:
                          "very_hot=sem site E ativo no IG; hot=sem site; warm=site fraco; cold=presença sólida",
                      },
                    },
                    required: [
                      "name",
                      "instagram",
                      "phone",
                      "website",
                      "source_url",
                      "has_website",
                      "address",
                      "ai_analysis",
                      "ai_problems",
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
        instagram: string;
        phone: string;
        website: string;
        source_url: string;
        has_website: boolean;
        address: string;
        ai_analysis: string;
        ai_problems: string[];
        score: "cold" | "warm" | "hot" | "very_hot";
      }>;
    }>(json);

    const rows = parsed.leads
      .filter((l) => l.name && l.name.trim().length > 1)
      .map((l) => ({
        campaign_id: campaign.id,
        user_id: userId,
        name: l.name.trim(),
        phone: l.phone || null,
        whatsapp: l.phone || null,
        instagram: l.instagram || null,
        address: l.address || null,
        website: l.website || null,
        source_url: l.source_url || null,
        has_website: !!l.has_website,
        score: l.score,
        status: "new" as const,
        ai_analysis: l.ai_analysis || null,
        ai_problems: l.ai_problems ?? [],
      }));

    if (rows.length > 0) {
      const { error: insErr } = await supabase.from("leads").insert(rows);
      if (insErr) throw new Error(insErr.message);
    }

    await supabase
      .from("campaigns")
      .update({ status: "completed" })
      .eq("id", campaign.id);

    return { inserted: rows.length };
  });

export const getLead = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const { data: lead, error } = await supabase
      .from("leads")
      .select("*, campaigns(name, niche, city)")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!lead) throw new Error("Lead não encontrado");
    return { lead };
  });

export const listLeads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("leads")
      .select("*, campaigns(name, niche, city)")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return { leads: data ?? [] };
  });

export const updateLeadStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      id: z.string().uuid(),
      status: z.enum(["new", "contacted", "replied", "meeting", "closed", "ignored"]),
    }),
  )
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("leads")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const generateOutreach = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ leadId: z.string().uuid() }))
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const { data: lead, error } = await supabase
      .from("leads")
      .select("*, campaigns(niche, city)")
      .eq("id", data.leadId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!lead) throw new Error("Lead não encontrado");

    const camp = (lead as { campaigns?: { niche?: string; city?: string } }).campaigns ?? {};
    const niche = camp.niche ?? "";
    const city = camp.city ?? "";

    const json = await callAI({
      messages: [
        {
          role: "system",
          content:
            "Você gera abordagens comerciais para freelancers/agências (PT-BR). Tom consultivo, cordial, sem ser invasivo. Sem emojis exagerados.",
        },
        {
          role: "user",
          content: `Negócio: ${lead.name}
Nicho: ${niche}
Cidade: ${city}
Instagram: ${lead.instagram ?? "não informado"}
Tem site: ${lead.has_website ? "sim" : "não"}
Site: ${lead.website ?? "—"}
Análise: ${lead.ai_analysis ?? "—"}
Problemas: ${JSON.stringify(lead.ai_problems ?? [])}

Gere:
1) Mensagem WhatsApp curta e personalizada (máx 600 chars)
2) Prompt completo para gerar uma landing page nichada no Lovable (PT-BR, detalhado: seções, copy, paleta, tipografia, CTA)`,
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "return_outreach",
            parameters: {
              type: "object",
              properties: {
                message: { type: "string" },
                landing_prompt: { type: "string" },
              },
              required: ["message", "landing_prompt"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "return_outreach" } },
    });

    const parsed = extractToolArgs<{ message: string; landing_prompt: string }>(json);

    const { error: uErr } = await supabase
      .from("leads")
      .update({
        outreach_message: parsed.message,
        landing_prompt: parsed.landing_prompt,
      })
      .eq("id", data.leadId);
    if (uErr) throw new Error(uErr.message);

    return parsed;
  });
