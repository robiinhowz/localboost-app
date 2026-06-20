import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Search, ExternalLink, Instagram, Phone, Globe, MapPin } from "lucide-react";
import { listLeads } from "@/lib/leads.functions";
import { ScoreBadge, StatusBadge } from "@/components/Badges";

export const Route = createFileRoute("/_authenticated/leads")({
  head: () => ({ meta: [{ title: "Leads — LeadForge" }] }),
  component: LeadsPage,
});

const SCORES = ["all", "very_hot", "hot", "warm", "cold"] as const;
const STATUSES = ["all", "new", "contacted", "replied", "meeting", "closed", "ignored"] as const;

function LeadsPage() {
  const listFn = useServerFn(listLeads);
  const { data, isLoading } = useQuery({
    queryKey: ["leads"],
    queryFn: () => listFn(),
  });

  const [q, setQ] = useState("");
  const [score, setScore] = useState<(typeof SCORES)[number]>("all");
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("all");

  const filtered = useMemo(() => {
    const all = data?.leads ?? [];
    const needle = q.trim().toLowerCase();
    return all.filter((l) => {
      if (score !== "all" && l.score !== score) return false;
      if (status !== "all" && l.status !== status) return false;
      if (!needle) return true;
      const blob = [
        l.name,
        l.instagram,
        l.phone,
        l.address,
        l.website,
        (l as { campaigns?: { name?: string; niche?: string; city?: string } }).campaigns?.name,
        (l as { campaigns?: { niche?: string } }).campaigns?.niche,
        (l as { campaigns?: { city?: string } }).campaigns?.city,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return blob.includes(needle);
    });
  }, [data, q, score, status]);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold sm:text-3xl">Leads</h1>
        <p className="text-sm text-muted-foreground">
          Todos os leads encontrados em suas campanhas.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nome, cidade, instagram…"
            className="w-full rounded-lg border bg-input/30 py-2 pl-9 pr-3 text-sm outline-none focus:border-primary/40"
          />
        </div>
        <Select value={score} onChange={(v) => setScore(v as typeof score)} options={SCORES} labelMap={{
          all: "Todos os scores", very_hot: "Muito quente", hot: "Quente", warm: "Morno", cold: "Frio",
        }} />
        <Select value={status} onChange={(v) => setStatus(v as typeof status)} options={STATUSES} labelMap={{
          all: "Todos os status", new: "Novo", contacted: "Contatado", replied: "Respondeu",
          meeting: "Reunião", closed: "Fechado", ignored: "Ignorado",
        }} />
      </div>

      {isLoading ? (
        <div className="grid h-40 place-items-center text-sm text-muted-foreground">Carregando…</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-card/40 p-10 text-center text-sm text-muted-foreground">
          Nenhum lead encontrado. Crie uma campanha para começar.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border bg-card shadow-card">
          <table className="w-full text-sm">
            <thead className="bg-secondary/40 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Negócio</th>
                <th className="hidden px-4 py-3 font-medium md:table-cell">Contato</th>
                <th className="hidden px-4 py-3 font-medium lg:table-cell">Campanha</th>
                <th className="px-4 py-3 font-medium">Score</th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => {
                const camp = (l as { campaigns?: { name?: string; niche?: string; city?: string } }).campaigns;
                return (
                  <tr key={l.id} className="border-t hover:bg-secondary/20">
                    <td className="px-4 py-3">
                      <div className="font-medium">{l.name}</div>
                      <div className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
                        {l.ai_analysis ?? "—"}
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 md:table-cell">
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                        {l.instagram && (<span className="inline-flex items-center gap-1"><Instagram className="h-3 w-3" />{l.instagram}</span>)}
                        {l.phone && (<span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{l.phone}</span>)}
                        {l.has_website ? (<span className="inline-flex items-center gap-1"><Globe className="h-3 w-3" />site</span>) : (<span className="inline-flex items-center gap-1 text-primary">sem site</span>)}
                        {l.address && (<span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{l.address}</span>)}
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 lg:table-cell text-[11px] text-muted-foreground">
                      {camp ? `${camp.name} · ${camp.city}` : "—"}
                    </td>
                    <td className="px-4 py-3"><ScoreBadge score={l.score} /></td>
                    <td className="hidden px-4 py-3 sm:table-cell"><StatusBadge status={l.status} /></td>
                    <td className="px-4 py-3 text-right">
                      <Link to="/leads/$id" params={{ id: l.id }} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                        Abrir <ExternalLink className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Select<T extends string>({
  value,
  onChange,
  options,
  labelMap,
}: {
  value: T;
  onChange: (v: T) => void;
  options: readonly T[];
  labelMap: Record<string, string>;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className="rounded-lg border bg-input/30 px-3 py-2 text-sm outline-none focus:border-primary/40"
    >
      {options.map((o) => (
        <option key={o} value={o}>{labelMap[o] ?? o}</option>
      ))}
    </select>
  );
}
