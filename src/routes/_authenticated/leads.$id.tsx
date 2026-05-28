import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Copy,
  Check,
  Instagram,
  Phone,
  Globe,
  MapPin,
  Sparkles,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { getLead, generateOutreach, updateLeadStatus } from "@/lib/leads.functions";
import { ScoreBadge, StatusBadge, STATUS_OPTIONS } from "@/components/Badges";

export const Route = createFileRoute("/_authenticated/leads/$id")({
  head: () => ({ meta: [{ title: "Lead — LeadForge" }] }),
  component: LeadDetail,
});

function LeadDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const getFn = useServerFn(getLead);
  const genFn = useServerFn(generateOutreach);
  const statusFn = useServerFn(updateLeadStatus);

  const { data, isLoading } = useQuery({
    queryKey: ["lead", id],
    queryFn: () => getFn({ data: { id } }),
  });

  const genMut = useMutation({
    mutationFn: () => genFn({ data: { leadId: id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lead", id] }),
  });

  const statusMut = useMutation({
    mutationFn: (status: (typeof STATUS_OPTIONS)[number]["value"]) =>
      statusFn({ data: { id, status } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lead", id] }),
  });

  if (isLoading || !data) {
    return (
      <div className="grid h-40 place-items-center text-sm text-muted-foreground">
        Carregando…
      </div>
    );
  }

  const lead = data.lead as typeof data.lead & {
    campaigns?: { name?: string; niche?: string; city?: string };
  };
  const camp = lead.campaigns;
  const problems = (lead.ai_problems as string[] | null) ?? [];

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        to="/campaigns"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Voltar
      </Link>

      <header className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold sm:text-3xl">{lead.name}</h1>
          {camp && (
            <p className="text-sm text-muted-foreground">
              {camp.niche} · {camp.city}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <ScoreBadge score={lead.score} />
          <select
            value={lead.status}
            onChange={(e) =>
              statusMut.mutate(e.target.value as (typeof STATUS_OPTIONS)[number]["value"])
            }
            className="rounded-lg border bg-card px-2 py-1 text-xs"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <StatusBadge status={lead.status} />
        </div>
      </header>

      <section className="mt-6 grid gap-3 sm:grid-cols-2">
        <InfoRow icon={Instagram} label="Instagram" value={lead.instagram} link={
          lead.instagram ? `https://instagram.com/${lead.instagram.replace("@", "")}` : null
        } />
        <InfoRow icon={Phone} label="Telefone" value={lead.phone} link={
          lead.phone ? `tel:${lead.phone.replace(/\D/g, "")}` : null
        } />
        <InfoRow icon={Globe} label="Site" value={lead.has_website ? lead.website : "sem site"} link={lead.website ?? null} />
        <InfoRow icon={MapPin} label="Endereço" value={lead.address} />
        {lead.source_url && (
          <InfoRow icon={ExternalLink} label="Fonte" value={lead.source_url} link={lead.source_url} />
        )}
      </section>

      <section className="mt-6 rounded-2xl border bg-card p-5 shadow-card">
        <h2 className="text-sm font-semibold">Análise da IA</h2>
        <p className="mt-2 text-sm text-muted-foreground">{lead.ai_analysis ?? "—"}</p>
        {problems.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {problems.map((p, i) => (
              <span
                key={i}
                className="rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 text-[11px] text-warning"
              >
                {p}
              </span>
            ))}
          </div>
        )}
      </section>

      <section className="mt-6 rounded-2xl border bg-card p-5 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Mensagem & landing</h2>
          <button
            onClick={() => genMut.mutate()}
            disabled={genMut.isPending}
            className="inline-flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 disabled:opacity-50"
          >
            {genMut.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            {lead.outreach_message ? "Regenerar" : "Gerar com IA"}
          </button>
        </div>

        {genMut.error && (
          <p className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive-foreground">
            {(genMut.error as Error).message}
          </p>
        )}

        {lead.outreach_message && (
          <CopyBlock title="Mensagem WhatsApp" text={lead.outreach_message} />
        )}
        {lead.landing_prompt && (
          <CopyBlock title="Prompt para landing page (Lovable / v0)" text={lead.landing_prompt} />
        )}

        {!lead.outreach_message && !genMut.isPending && (
          <p className="mt-3 text-xs text-muted-foreground">
            Clique em <span className="text-foreground">Gerar com IA</span> para criar a
            mensagem e o prompt da landing nichada.
          </p>
        )}
      </section>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
  link,
}: {
  icon: typeof Phone;
  label: string;
  value: string | null | undefined;
  link?: string | null;
}) {
  return (
    <div className="rounded-xl border bg-card p-3 shadow-card">
      <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </p>
      {value ? (
        link ? (
          <a
            href={link}
            target="_blank"
            rel="noreferrer"
            className="mt-1 block truncate text-sm font-medium hover:text-primary"
          >
            {value}
          </a>
        ) : (
          <p className="mt-1 truncate text-sm font-medium">{value}</p>
        )
      ) : (
        <p className="mt-1 text-sm italic text-muted-foreground">não encontrado</p>
      )}
    </div>
  );
}

function CopyBlock({ title, text }: { title: string; text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="mt-4">
      <div className="mb-1.5 flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{title}</p>
        <button
          onClick={copy}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          {copied ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
          {copied ? "Copiado" : "Copiar"}
        </button>
      </div>
      <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-lg border bg-background/40 p-3 text-xs leading-relaxed">
        {text}
      </pre>
    </div>
  );
}
