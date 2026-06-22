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

// Domínios que NÃO contam como "site próprio"
const NON_SITE_HOSTS = [
  "instagram.com",
  "facebook.com",
  "fb.com",
  "linkedin.com",
  "twitter.com",
  "x.com",
  "youtube.com",
  "youtu.be",
  "tiktok.com",
  "wa.me",
  "api.whatsapp.com",
  "whatsapp.com",
  "t.me",
  "linktr.ee",
  "linkr.bio",
  "beacons.ai",
  "bio.link",
  "campsite.bio",
  "many.link",
  "google.com",
  "goo.gl",
  "maps.app.goo.gl",
  "g.page",
  "business.site",
  "sites.google.com",
  "mercadolivre.com.br",
  "olx.com.br",
  "reclameaqui.com.br",
  "glassdoor.com",
  "indeed.com",
  "yelp.com",
  "tripadvisor.com",
  "ifood.com.br",
  "uaubox.com.br",
  "apontador.com.br",
  "guiamais.com.br",
  "telelistas.net",
  "econodata.com.br",
  "cnpj.biz",
  "consultasocio.com",
  "wikipedia.org",
];

export function isOwnDomain(rawUrl: string): boolean {
  try {
    const u = new URL(rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`);
    const host = u.hostname.replace(/^www\./, "").toLowerCase();
    if (!host.includes(".")) return false;
    return !NON_SITE_HOSTS.some((d) => host === d || host.endsWith(`.${d}`));
  } catch {
    return false;
  }
}

function nameTokens(name: string): string[] {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !["ltda", "me", "eireli", "sa", "the", "com", "para"].includes(t));
}

function domainMatchesName(url: string, name: string): boolean {
  try {
    const host = new URL(url.startsWith("http") ? url : `https://${url}`).hostname
      .replace(/^www\./, "")
      .toLowerCase();
    const base = host.split(".")[0];
    const tokens = nameTokens(name);
    if (tokens.length === 0) return false;
    return tokens.some((t) => base.includes(t) || t.includes(base));
  } catch {
    return false;
  }
}

/**
 * Verifica de forma robusta se o negócio possui site próprio.
 * Ordem: Google Search por nome+cidade -> Google Business (g.page/business.site
 * redirecionando) -> bio do Instagram. Retorna URL própria ou null.
 */
export async function verifyOwnWebsite(opts: {
  name: string;
  city: string;
  instagramHandle?: string | null;
}): Promise<string | null> {
  const { name, city, instagramHandle } = opts;
  if (!name) return null;

  // 1) Google Search direto pelo nome + cidade
  try {
    const results = await fcSearch(`"${name}" ${city} site oficial`, { limit: 6 });
    const hit = results.find((r) => isOwnDomain(r.url) && domainMatchesName(r.url, name));
    if (hit) return hit.url;
    // fallback: qualquer domínio próprio entre os top 3
    const loose = results.slice(0, 3).find((r) => isOwnDomain(r.url));
    if (loose && domainMatchesName(loose.url, name)) return loose.url;
  } catch {
    // ignore
  }

  // 2) Bio do Instagram: scrape do perfil e extração de URL externa
  if (instagramHandle) {
    const handle = instagramHandle.replace(/^@/, "");
    try {
      const scraped = await fcScrape(`https://www.instagram.com/${handle}/`);
      const blob = `${scraped.markdown ?? ""}\n${scraped.metadata?.description ?? ""}`;
      const urlRe = /https?:\/\/[^\s)"'<>]+/gi;
      const matches = blob.match(urlRe) ?? [];
      const candidate = matches.find((u) => isOwnDomain(u));
      if (candidate) return candidate.replace(/[).,]+$/, "");
    } catch {
      // ignore
    }
  }

  return null;
}
