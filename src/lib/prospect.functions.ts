import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";

async function callAI(body: unknown) {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY não configurada");
  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    if (res.status === 429) throw new Error("Limite de requisições atingido. Tente novamente em instantes.");
    if (res.status === 402) throw new Error("Créditos de IA esgotados. Adicione créditos no workspace.");
    throw new Error(`Erro IA [${res.status}]: ${text.slice(0, 200)}`);
  }
  return res.json();
}

export const searchLeads = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      niche: z.string().trim().min(2).max(80),
      city: z.string().trim().min(2).max(80),
    }),
  )
  .handler(async ({ data }) => {
    const tool = {
      type: "function",
      function: {
        name: "return_leads",
        description: "Retorna lista plausível de negócios locais com base no nicho e cidade.",
        parameters: {
          type: "object",
          properties: {
            leads: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  phone: { type: "string" },
                  instagram: { type: "string", description: "@handle ou string vazia" },
                  address: { type: "string" },
                  website: { type: "string", description: "URL ou string vazia se não tem site" },
                  hasWebsite: { type: "boolean" },
                  websiteOutdated: { type: "boolean" },
                  weakBranding: { type: "boolean" },
                  notes: { type: "string", description: "Curta observação sobre presença digital" },
                },
                required: [
                  "name",
                  "phone",
                  "instagram",
                  "address",
                  "website",
                  "hasWebsite",
                  "websiteOutdated",
                  "weakBranding",
                  "notes",
                ],
                additionalProperties: false,
              },
            },
          },
          required: ["leads"],
          additionalProperties: false,
        },
      },
    };

    const json = await callAI({
      model: MODEL,
      messages: [
        {
          role: "system",
          content:
            "Você é um assistente de prospecção. Gere 10 negócios locais PLAUSÍVEIS (não confirmados, dados sintéticos realistas) para o nicho e cidade dados. Varie: a maioria SEM site profissional, alguns com site desatualizado, alguns com branding fraco. Telefones no formato brasileiro (+55 (DDD) 9XXXX-XXXX). Instagram com @. Endereços com bairro/cidade. Responda APENAS via tool call.",
        },
        {
          role: "user",
          content: `Nicho: ${data.niche}\nCidade: ${data.city}`,
        },
      ],
      tools: [tool],
      tool_choice: { type: "function", function: { name: "return_leads" } },
    });

    const args = json.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) throw new Error("Resposta inválida da IA");
    const parsed = JSON.parse(args) as {
      leads: Array<{
        name: string;
        phone: string;
        instagram: string;
        address: string;
        website: string;
        hasWebsite: boolean;
        websiteOutdated: boolean;
        weakBranding: boolean;
        notes: string;
      }>;
    };
    return parsed;
  });

export const generateOutreach = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      businessName: z.string().min(1).max(200),
      niche: z.string().min(1).max(80),
      city: z.string().min(1).max(80),
      hasWebsite: z.boolean(),
      websiteOutdated: z.boolean(),
      weakBranding: z.boolean(),
      instagram: z.string().max(200),
    }),
  )
  .handler(async ({ data }) => {
    const tool = {
      type: "function",
      function: {
        name: "return_outreach",
        parameters: {
          type: "object",
          properties: {
            message: {
              type: "string",
              description: "Mensagem WhatsApp amigável, em PT-BR, máx 600 caracteres, sem emojis exagerados.",
            },
            improvements: {
              type: "array",
              items: { type: "string" },
              description: "3 a 5 sugestões objetivas de melhoria digital.",
            },
            demo: {
              type: "object",
              properties: {
                pageTitle: { type: "string" },
                tagline: { type: "string" },
                sections: { type: "array", items: { type: "string" } },
                visualIdea: { type: "string", description: "Direção visual: paleta, tipografia, estilo." },
                aiPrompt: {
                  type: "string",
                  description: "Prompt completo para gerar uma landing page demo com IA (em PT-BR).",
                },
              },
              required: ["pageTitle", "tagline", "sections", "visualIdea", "aiPrompt"],
              additionalProperties: false,
            },
          },
          required: ["message", "improvements", "demo"],
          additionalProperties: false,
        },
      },
    };

    const json = await callAI({
      model: MODEL,
      messages: [
        {
          role: "system",
          content:
            "Você gera abordagens comerciais personalizadas para freelancers/agências. Tom: cordial, consultivo, sem ser invasivo. PT-BR.",
        },
        {
          role: "user",
          content: `Negócio: ${data.businessName}
Nicho: ${data.niche}
Cidade: ${data.city}
Tem site: ${data.hasWebsite ? "sim" : "não"}
Site desatualizado: ${data.websiteOutdated ? "sim" : "não"}
Branding fraco: ${data.weakBranding ? "sim" : "não"}
Instagram: ${data.instagram || "não informado"}

Gere a mensagem, sugestões de melhoria e ideia de landing demo.`,
        },
      ],
      tools: [tool],
      tool_choice: { type: "function", function: { name: "return_outreach" } },
    });

    const args = json.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) throw new Error("Resposta inválida da IA");
    return JSON.parse(args) as {
      message: string;
      improvements: string[];
      demo: {
        pageTitle: string;
        tagline: string;
        sections: string[];
        visualIdea: string;
        aiPrompt: string;
      };
    };
  });
