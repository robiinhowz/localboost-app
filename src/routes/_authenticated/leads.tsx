import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  ExternalLink,
  Instagram,
  Phone,
  Globe,
  MapPin,
  Calendar,
  Filter,
  X,
} from "lucide-react";
import { listLeads, updateLeadStatus } from "@/lib/leads.functions";
import { ScoreBadge, StatusBadge, STATUS_OPTIONS, type LeadStatus } from "@/components/Badges";
import type { Database } from "@/integrations/supabase/types";

type LeadScore = Database["public"]["Enums"]["lead_score"];

export const Route = createFileRoute("/_authenticated/leads")({
  head: () => ({ meta: [{ title: "Leads — LeadForge" }] }),
  component: LeadsPage,
});

const SCORE_ORDER: Record<LeadScore, number> = {
  cold: 0,
  warm: 1,
  hot: 2,
  very_hot: 3,
};

const SCORE_MIN_OPTS: { value: LeadScore | "all"; label: string }[] = [
  { value: "all", label: "Todos os scores" },
  { value: "cold", label: "≥ Frio" },
  { value: "warm", label: "≥ Morno" },
  { value: "hot", label: "≥ Quente" },
  { value: "very_hot", label: "Só Muito quente" },
];

type LeadRow = {
  id: string;
  name: string;
  phone: string | null;
  whatsapp: string | null;
  instagram: string | null;
  address: string | null;
  website: string | null;
  has_website: boolean;
  score: LeadScore;
  status: LeadStatus;
  created_at: string;
  raw_data: unknown;
  campaigns?: { name?: string; niche?: string; city?: string } | null;
};

function LeadsPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listLeads);
  const statusFn = useServerFn(updateLeadStatus);

  const { data, isLoading } = useQuery({
    queryKey: ["leads"],
    queryFn: () => listFn(),
  });

  const statusMut = useMutation({
    mutationFn: (v: { id: string; status: LeadStatus }) => statusFn({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leads"] }),
  });

  const [q, setQ] = useState("");
  const [uf, setUf] = useState("all");
  const [city, setCity] = useState("all");
  const [niche, setNiche] = useState("all");
  const [scoreMin, setScoreMin] = useState<LeadScore | "all">("all");
  const [status, setStatus] = useState<LeadStatus | "all">("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const leads = (data?.leads ?? []) as LeadRow[];

  const enriched = useMemo(() => {
    return leads.map((l) => {
      const raw = (l.raw_data ?? {}) as {
        discovered_niche?: string;
        discovered_city?: string;
        discovered_state?: string;
      };
      const cityRaw = raw.discovered_city || l.campaigns?.city || "";
      const ufMatch = cityRaw.match(/\b([A-Z]{2})\b\s*$/);
      const ufVal = raw.discovered_state || ufMatch?.[1] || "";
      const cityVal = ufMatch ? cityRaw.replace(/\s+[A-Z]{2}\s*$/, "").trim() : cityRaw;
      const nicheVal = raw.discovered_niche || l.campaigns?.niche || "";
      return { lead: l, uf: ufVal, city: cityVal, niche: nicheVal };
    });
  }, [leads]);

  const { ufs, cities, niches } = useMemo(() => {
    const ufs = new Set<string>();
    const cities = new Set<string>();
    const niches = new Set<string>();
    for (const e of enriched) {
      if (e.uf) ufs.add(e.uf);
      if (e.city) cities.add(e.city);
      if (e.niche) niches.add(e.niche);
    }
    return {
      ufs: Array.from(ufs).sort(),
      cities: Array.from(cities).sort(),
      niches: Array.from(niches).sort(),
    };
  }, [enriched]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const fromTs = from ? new Date(from).getTime() : null;
    const toTs = to ? new Date(to).getTime() + 86400000 : null;
    return enriched.filter(({ lead: l, uf: u, city: c, niche: n }) => {
      if (uf !== "all" && u !== uf) return false;
      if (city !== "all" && c !== city) return false;
      if (niche !== "all" && n !== niche) return false;
      if (scoreMin !== "all" && SCORE_ORDER[l.score] < SCORE_ORDER[scoreMin]) return false;
      if (status !== "all" && l.status !== status) return false;
      const t = new Date(l.created_at).getTime();
      if (fromTs && t < fromTs) return false;
      if (toTs && t > toTs) return false;
      if (!needle) return true;
      const blob = [l.name, l.instagram, l.phone, l.address, l.website, c, n, u]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return blob.includes(needle);
    });
  }, [enriched, q, uf, city, niche, scoreMin, status, from, to]);

  const activeFilters =
    (uf !== "all" ? 1 : 0) +
    (city !== "all" ? 1 : 0) +
    (niche !== "all" ? 1 : 0) +
    (scoreMin !== "all" ? 1 : 0) +
    (status !== "all" ? 1 : 0) +
    (from ? 1 : 0) +
    (to ? 1 : 0);

  const clearFilters = () => {
    setUf("all");
    setCity("all");
    setNiche("all");
    setScoreMin("all");
    setStatus("all");
    setFrom("");
    setTo("");
  };

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">CRM de Leads</h1>
          <p className="text-sm text-muted-foreground">
            {filtered.length} de {leads.length} leads · gerencie status e histórico de prospecção
          </p>
        </div>
      </div>

      <div className="mb-4 rounded-2xl border bg-card p-4 shadow-card">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nome, cidade, instagram, telefone…"
              className="w-full rounded-lg border bg-input/30 py-2 pl-9 pr-3 text-sm outline-none focus:border-primary/40"
            />
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-lg border bg-secondary/40 px-2.5 py-1.5 text-xs text-muted-foreground">
            <Filter className="h-3.5 w-3.5" />
            {activeFilters} filtro{activeFilters === 1 ? "" : "s"}
          </div>
          {activeFilters > 0 && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" /> Limpar
            </button>
          )}
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <FilterSelect
            label="Estado"
            value={uf}
            onChange={setUf}
            options={[{ value: "all", label: "Todos" }, ...ufs.map((u) => ({ value: u, label: u }))]}
          />
          <FilterSelect
            label="Cidade"
            value={city}
            onChange={setCity}
            options={[
              { value: "all", label: "Todas" },
              ...cities.map((c) => ({ value: c, label: c })),
            ]}
          />
          <FilterSelect
            label="Nicho"
            value={niche}
            onChange={setNiche}
            options={[
              { value: "all", label: "Todos" },
              ...niches.map((n) => ({ value: n, label: n })),
            ]}
          />
          <FilterSelect
            label="Score mínimo"
            value={scoreMin}
            onChange={(v) => setScoreMin(v as LeadScore | "all")}
            options={SCORE_MIN_OPTS.map((o) => ({ value: o.value, label: o.label }))}
          />
          <FilterSelect
            label="Status"
            value={status}
            onChange={(v) => setStatus(v as LeadStatus | "all")}
            options={[
              { value: "all", label: "Todos" },
              ...STATUS_OPTIONS.map((s) => ({ value: s.value, label: s.label })),
            ]}
          />
          <div>
            <label className="mb-1 block text-[11px] uppercase tracking-wider text-muted-foreground">
              Descoberto de
            </label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full rounded-lg border bg-input/30 px-3 py-2 text-sm outline-none focus:border-primary/40"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] uppercase tracking-wider text-muted-foreground">
              até
            </label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full rounded-lg border bg-input/30 px-3 py-2 text-sm outline-none focus:border-primary/40"
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid h-40 place-items-center text-sm text-muted-foreground">
          Carregando…
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-card/40 p-10 text-center text-sm text-muted-foreground">
          Nenhum lead encontrado com esses filtros.
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {filtered.map(({ lead: l, uf: u, city: c, niche: n }) => {
            const discoveredAt = new Date(l.created_at).toLocaleDateString("pt-BR");
            return (
              <div
                key={l.id}
                className="group rounded-2xl border bg-card p-4 shadow-card transition hover:border-primary/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      to="/leads/$id"
                      params={{ id: l.id }}
                      className="line-clamp-1 text-base font-semibold hover:text-primary"
                    >
                      {l.name}
                    </Link>
                    <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
                      {n || "—"} · {c || "—"}
                      {u ? ` · ${u}` : ""}
                    </p>
                  </div>
                  <ScoreBadge score={l.score} />
                </div>

                <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                  {l.instagram && (
                    <span className="inline-flex items-center gap-1">
                      <Instagram className="h-3 w-3" />
                      {l.instagram}
                    </span>
                  )}
                  {l.phone && (
                    <span className="inline-flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {l.phone}
                    </span>
                  )}
                  {l.has_website ? (
                    <span className="inline-flex items-center gap-1">
                      <Globe className="h-3 w-3" />
                      site
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-primary">sem site</span>
                  )}
                  {l.address && (
                    <span className="inline-flex items-center gap-1 line-clamp-1">
                      <MapPin className="h-3 w-3" />
                      {l.address}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {discoveredAt}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t pt-3">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={l.status} />
                    <select
                      value={l.status}
                      disabled={statusMut.isPending}
                      onChange={(e) =>
                        statusMut.mutate({ id: l.id, status: e.target.value as LeadStatus })
                      }
                      className="rounded-lg border bg-input/30 px-2 py-1 text-xs outline-none focus:border-primary/40"
                    >
                      {STATUS_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Link
                    to="/leads/$id"
                    params={{ id: l.id }}
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    Abrir detalhes <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="mb-1 block text-[11px] uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border bg-input/30 px-3 py-2 text-sm outline-none focus:border-primary/40"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
