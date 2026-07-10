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
  MessageSquare,
  History,
  Send,
} from "lucide-react";
import {
  getLead,
  generateOutreach,
  updateLeadStatus,
  listLeadContacts,
  addLeadContact,
} from "@/lib/leads.functions";
import { ScoreBadge, StatusBadge, STATUS_OPTIONS, type LeadStatus } from "@/components/Badges";

export const Route = createFileRoute("/_authenticated/leads/$id")({
  head: () => ({ meta: [{ title: "Lead — LeadForge" }] }),
  component: LeadDetail,
});

const CONTACT_KINDS = [
  { value: "note", label: "📝 Nota" },
  { value: "call", label: "📞 Ligação" },
  { value: "whatsapp", label: "💬 WhatsApp" },
  { value: "email", label: "✉️ E-mail" },
  { value: "meeting", label: "🤝 Reunião" },
] as const;

type ContactKind = (typeof CONTACT_KINDS)[number]["value"];

function LeadDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const getFn = useServerFn(getLead);
  const genFn = useServerFn(generateOutreach);
  const statusFn = useServerFn(updateLeadStatus);
  const contactsFn = useServerFn(listLeadContacts);
  const addContactFn = useServerFn(addLeadContact);

  const { data, isLoading } = useQuery({
    queryKey: ["lead", id],
    queryFn: () => getFn({ data: { id } }),
  });

  const { data: contactsData } = useQuery({
    queryKey: ["lead-contacts", id],
    queryFn: () => contactsFn({ data: { leadId: id } }),
  });

  const genMut = useMutation({
    mutationFn: () => genFn({ data: { leadId: id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lead", id] }),
  });

  const statusMut = useMutation({
    mutationFn: (status: LeadStatus) => statusFn({ data: { id, status } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lead", id] });
      qc.invalidateQueries({ queryKey: ["lead-contacts", id] });
      qc.invalidateQueries({ queryKey: ["leads"] });
    },
  });

  const addMut = useMutation({
    mutationFn: (v: { kind: ContactKind; content: string }) =>
      addContactFn({ data: { leadId: id, kind: v.kind, content: v.content } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lead-contacts", id] }),
  });

  const [noteKind, setNoteKind] = useState<ContactKind>("note");
  const [noteContent, setNoteContent] = useState("");

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
  const raw = (lead.raw_data ?? {}) as {
    discovered_niche?: string;
    discovered_city?: string;
    discovered_state?: string;
    score_reasons?: string[];
  };
  const scoreReasons = raw.score_reasons ?? [];
  const contacts = contactsData?.contacts ?? [];

  const submitNote = () => {
    const content = noteContent.trim();
    if (!content) return;
    addMut.mutate(
      { kind: noteKind, content },
      { onSuccess: () => setNoteContent("") },
    );
  };

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        to="/leads"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Voltar para leads
      </Link>

      <header className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold sm:text-3xl">{lead.name}</h1>
          <p className="text-sm text-muted-foreground">
            {raw.discovered_niche || camp?.niche || "—"} ·{" "}
            {raw.discovered_city || camp?.city || "—"}
            {raw.discovered_state ? ` · ${raw.discovered_state}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ScoreBadge score={lead.score} />
          <select
            value={lead.status}
            onChange={(e) => statusMut.mutate(e.target.value as LeadStatus)}
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
        <InfoRow
          icon={Phone}
          label="Telefone"
          value={lead.phone}
          link={lead.phone ? `tel:${lead.phone.replace(/\D/g, "")}` : null}
        />
        <InfoRow
          icon={MessageSquare}
          label="WhatsApp"
          value={lead.whatsapp}
          link={
            lead.whatsapp
              ? `https://wa.me/${lead.whatsapp.replace(/\D/g, "")}`
              : null
          }
        />
        <InfoRow
          icon={Instagram}
          label="Instagram"
          value={lead.instagram}
          link={
            lead.instagram
              ? `https://instagram.com/${lead.instagram.replace("@", "")}`
              : null
          }
        />
        <InfoRow
          icon={Globe}
          label="Site"
          value={lead.has_website ? lead.website : "sem site"}
          link={lead.website ?? null}
        />
        <InfoRow icon={MapPin} label="Endereço" value={lead.address} />
        {lead.source_url && (
          <InfoRow
            icon={ExternalLink}
            label="Fonte"
            value={lead.source_url}
            link={lead.source_url}
          />
        )}
      </section>

      <section className="mt-6 rounded-2xl border bg-card p-5 shadow-card">
        <h2 className="text-sm font-semibold">Score & análise</h2>
        <p className="mt-2 text-sm text-muted-foreground">{lead.ai_analysis ?? "—"}</p>
        {scoreReasons.length > 0 && (
          <div className="mt-4">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Motivos do score
            </p>
            <ul className="mt-1.5 space-y-1 text-xs text-muted-foreground">
              {scoreReasons.map((r, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-primary">•</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
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
        <div className="mb-3 flex items-center gap-2">
          <History className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Histórico de contatos</h2>
          <span className="ml-auto text-[11px] text-muted-foreground">
            {contacts.length} evento{contacts.length === 1 ? "" : "s"}
          </span>
        </div>

        <div className="mb-4 flex flex-col gap-2 sm:flex-row">
          <select
            value={noteKind}
            onChange={(e) => setNoteKind(e.target.value as ContactKind)}
            className="rounded-lg border bg-input/30 px-2 py-2 text-xs outline-none focus:border-primary/40 sm:w-40"
          >
            {CONTACT_KINDS.map((k) => (
              <option key={k.value} value={k.value}>
                {k.label}
              </option>
            ))}
          </select>
          <input
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitNote();
            }}
            placeholder="Registrar interação, retorno, próximo passo…"
            className="flex-1 rounded-lg border bg-input/30 px-3 py-2 text-sm outline-none focus:border-primary/40"
          />
          <button
            onClick={submitNote}
            disabled={addMut.isPending || !noteContent.trim()}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-xs font-medium text-primary hover:bg-primary/20 disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" /> Registrar
          </button>
        </div>

        {contacts.length === 0 ? (
          <p className="text-xs italic text-muted-foreground">
            Nenhum contato registrado. Adicione uma nota, ligação ou mensagem para começar o histórico.
          </p>
        ) : (
          <ol className="relative space-y-3 border-l border-border pl-4">
            {contacts.map((c) => {
              const at = new Date(c.created_at).toLocaleString("pt-BR");
              const kindLabel =
                c.kind === "status_change"
                  ? "🔄 Mudança de status"
                  : CONTACT_KINDS.find((k) => k.value === c.kind)?.label ?? c.kind;
              return (
                <li key={c.id} className="relative">
                  <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-primary" />
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-xs font-medium">{kindLabel}</span>
                    <span className="text-[11px] text-muted-foreground">{at}</span>
                  </div>
                  <p className="mt-0.5 whitespace-pre-wrap text-sm text-muted-foreground">
                    {c.content}
                  </p>
                </li>
              );
            })}
          </ol>
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
          <CopyBlock
            title="Prompt para landing page (Lovable / v0)"
            text={lead.landing_prompt}
          />
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
