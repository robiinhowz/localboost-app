import { Instagram, Phone, MapPin, Globe, Sparkles, AlertCircle, Image as ImageIcon } from "lucide-react";

export type Lead = {
  name: string;
  phone: string;
  instagram: string;
  address: string;
  website: string;
  hasWebsite: boolean;
  websiteOutdated: boolean;
  weakBranding: boolean;
  notes: string;
};

interface Props {
  leads: Lead[];
  onlyNoSite: boolean;
  onGenerate: (lead: Lead) => void;
}

function Badge({
  tone,
  icon: Icon,
  children,
}: {
  tone: "primary" | "warning" | "muted";
  icon: typeof AlertCircle;
  children: React.ReactNode;
}) {
  const tones = {
    primary: "bg-primary/15 text-primary border-primary/30",
    warning: "bg-warning/15 text-warning border-warning/30",
    muted: "bg-muted text-muted-foreground border-border",
  } as const;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${tones[tone]}`}
    >
      <Icon className="h-3 w-3" />
      {children}
    </span>
  );
}

export function LeadTable({ leads, onlyNoSite, onGenerate }: Props) {
  const filtered = onlyNoSite ? leads.filter((l) => !l.hasWebsite) : leads;

  if (filtered.length === 0) {
    return (
      <div className="rounded-2xl border bg-card p-10 text-center text-sm text-muted-foreground shadow-card">
        Nenhum lead corresponde ao filtro.
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {filtered.map((lead, i) => (
        <article
          key={i}
          className={`rounded-2xl border bg-card p-5 shadow-card transition hover:border-primary/40 ${
            !lead.hasWebsite ? "ring-1 ring-primary/30" : ""
          }`}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-lg font-semibold text-foreground">{lead.name}</h3>
              <p className="mt-0.5 text-sm text-muted-foreground">{lead.notes}</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {!lead.hasWebsite && (
                <Badge tone="primary" icon={AlertCircle}>
                  Sem site
                </Badge>
              )}
              {lead.hasWebsite && lead.websiteOutdated && (
                <Badge tone="warning" icon={Globe}>
                  Site desatualizado
                </Badge>
              )}
              {lead.weakBranding && (
                <Badge tone="muted" icon={ImageIcon}>
                  Branding fraco
                </Badge>
              )}
            </div>
          </div>

          <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
            <a
              href={`tel:${lead.phone.replace(/\D/g, "")}`}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
            >
              <Phone className="h-4 w-4 shrink-0" />
              <span className="truncate">{lead.phone}</span>
            </a>
            {lead.instagram && (
              <a
                href={`https://instagram.com/${lead.instagram.replace("@", "")}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
              >
                <Instagram className="h-4 w-4 shrink-0" />
                <span className="truncate">{lead.instagram}</span>
              </a>
            )}
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4 shrink-0" />
              <span className="truncate">{lead.address}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Globe className="h-4 w-4 shrink-0" />
              {lead.hasWebsite && lead.website ? (
                <a
                  href={lead.website.startsWith("http") ? lead.website : `https://${lead.website}`}
                  target="_blank"
                  rel="noreferrer"
                  className="truncate hover:text-foreground"
                >
                  {lead.website}
                </a>
              ) : (
                <span className="italic">sem site</span>
              )}
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              onClick={() => onGenerate(lead)}
              className="inline-flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-3.5 py-2 text-sm font-medium text-primary transition hover:bg-primary/20"
            >
              <Sparkles className="h-4 w-4" />
              Gerar abordagem com IA
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
