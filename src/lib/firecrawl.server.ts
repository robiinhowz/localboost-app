const BASE = "https://api.firecrawl.dev/v2";

function key() {
  const k = process.env.FIRECRAWL_API_KEY;
  if (!k) throw new Error("FIRECRAWL_API_KEY não configurada");
  return k;
}

export type FCSearchResult = {
  url: string;
  title?: string;
  description?: string;
};

export async function fcSearch(
  query: string,
  opts: { limit?: number; lang?: string; country?: string } = {},
): Promise<FCSearchResult[]> {
  const res = await fetch(`${BASE}/search`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      limit: opts.limit ?? 10,
      lang: opts.lang ?? "pt",
      country: opts.country ?? "br",
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    if (res.status === 402)
      throw new Error("Créditos do Firecrawl esgotados. Recarregue ou troque o plano.");
    throw new Error(`Erro Firecrawl [${res.status}]: ${text.slice(0, 200)}`);
  }
  const json = (await res.json()) as {
    success?: boolean;
    data?: { web?: FCSearchResult[] } | FCSearchResult[];
  };
  const data = json.data;
  if (Array.isArray(data)) return data;
  return data?.web ?? [];
}

export async function fcScrape(url: string): Promise<{
  markdown?: string;
  metadata?: { title?: string; description?: string; sourceURL?: string };
}> {
  const res = await fetch(`${BASE}/scrape`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true }),
  });
  if (!res.ok) {
    return {};
  }
  const json = (await res.json()) as {
    data?: { markdown?: string; metadata?: { title?: string; description?: string; sourceURL?: string } };
    markdown?: string;
    metadata?: { title?: string; description?: string; sourceURL?: string };
  };
  return {
    markdown: json.markdown ?? json.data?.markdown,
    metadata: json.metadata ?? json.data?.metadata,
  };
}

const PHONE_RE = /(?:\+?55\s*)?\(?\d{2}\)?\s*9?\d{4}[-\s]?\d{4}/g;
const IG_RE = /instagram\.com\/([A-Za-z0-9_.]{2,30})(?:\/|$|\?)/i;

export function extractPhone(text: string): string | null {
  if (!text) return null;
  const m = text.match(PHONE_RE);
  return m?.[0] ?? null;
}

export function extractInstagramHandle(text: string): string | null {
  if (!text) return null;
  const m = text.match(IG_RE);
  if (!m) return null;
  const h = m[1].replace(/\/$/, "");
  if (["p", "reel", "explore", "stories", "tv", "accounts"].includes(h)) return null;
  return `@${h}`;
}
