import type { Database } from "@/integrations/supabase/types";

type LeadScore = Database["public"]["Enums"]["lead_score"];
type LeadStatus = Database["public"]["Enums"]["lead_status"];

const SCORE_LABEL: Record<LeadScore, { label: string; cls: string }> = {
  cold: { label: "Frio", cls: "bg-muted text-muted-foreground border-border" },
  warm: { label: "Morno", cls: "bg-warning/15 text-warning border-warning/30" },
  hot: { label: "Quente", cls: "bg-primary/15 text-primary border-primary/30" },
  very_hot: {
    label: "Muito quente",
    cls: "bg-gradient-to-r from-primary/25 to-accent/25 text-primary border-primary/40",
  },
};

const STATUS_LABEL: Record<LeadStatus, { label: string; cls: string }> = {
  new: { label: "Novo", cls: "bg-secondary text-secondary-foreground border-border" },
  contacted: { label: "Contatado", cls: "bg-accent/15 text-accent border-accent/30" },
  replied: { label: "Respondeu", cls: "bg-primary/15 text-primary border-primary/30" },
  meeting: { label: "Reunião", cls: "bg-warning/15 text-warning border-warning/30" },
  closed: { label: "Fechado", cls: "bg-primary/25 text-primary border-primary/40" },
  ignored: { label: "Ignorado", cls: "bg-muted text-muted-foreground border-border opacity-60" },
};

export function ScoreBadge({ score }: { score: LeadScore }) {
  const s = SCORE_LABEL[score];
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${s.cls}`}
    >
      {s.label}
    </span>
  );
}

export function StatusBadge({ status }: { status: LeadStatus }) {
  const s = STATUS_LABEL[status];
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${s.cls}`}
    >
      {s.label}
    </span>
  );
}

export const STATUS_OPTIONS: { value: LeadStatus; label: string }[] = [
  { value: "new", label: "Novo" },
  { value: "contacted", label: "Contatado" },
  { value: "replied", label: "Respondeu" },
  { value: "meeting", label: "Reunião marcada" },
  { value: "closed", label: "Cliente fechado" },
  { value: "ignored", label: "Ignorado" },
];
