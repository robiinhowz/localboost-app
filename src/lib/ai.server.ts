const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";

export async function callAI(body: Record<string, unknown>) {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY não configurada");
  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: MODEL, ...body }),
  });
  if (!res.ok) {
    const text = await res.text();
    if (res.status === 429)
      throw new Error("Limite de requisições da IA atingido. Aguarde alguns instantes.");
    if (res.status === 402)
      throw new Error("Créditos de IA esgotados. Adicione créditos no workspace.");
    throw new Error(`Erro IA [${res.status}]: ${text.slice(0, 200)}`);
  }
  return res.json();
}

export function extractToolArgs<T>(json: unknown): T {
  const j = json as {
    choices?: Array<{
      message?: { tool_calls?: Array<{ function?: { arguments?: string } }> };
    }>;
  };
  const args = j.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!args) throw new Error("Resposta inválida da IA (sem tool call)");
  return JSON.parse(args) as T;
}
