import { useEffect, useState } from "react";
import { X, Copy, Check, Loader2, Sparkles, Wand2 } from "lucide-react";
import type { Lead } from "./LeadTable";

type Outreach = {
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

interface Props {
  open: boolean;
  lead: Lead | null;
  loading: boolean;
  data: Outreach | null;
  error: string | null;
  onClose: () => void;
}

function CopyButton({ text, label = "Copiar" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="inline-flex items-center gap-1.5 rounded-md border bg-secondary px-2.5 py-1.5 text-xs font-medium text-secondary-foreground transition hover:bg-secondary/70"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copiado" : label}
    </button>
  );
}

export function OutreachModal({ open, lead, loading, data, error, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !lead) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur sm:items-center sm:p-6">
      <div className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl border bg-card shadow-glow sm:rounded-2xl">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-card/95 px-5 py-4 backdrop-blur">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Abordagem para</p>
            <h2 className="truncate text-lg font-semibold">{lead.name}</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-2 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="p-5">
          {loading && (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-sm">Gerando mensagem personalizada...</p>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive-foreground">
              {error}
            </div>
          )}

          {data && !loading && (
            <div className="space-y-6">
              <section>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-sm font-semibold">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Mensagem de abordagem
                  </h3>
                  <CopyButton text={data.message} />
                </div>
                <p className="whitespace-pre-wrap rounded-lg border bg-background p-4 text-sm leading-relaxed">
                  {data.message}
                </p>
                {lead.phone && (
                  <a
                    href={`https://wa.me/${lead.phone.replace(/\D/g, "")}?text=${encodeURIComponent(data.message)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                  >
                    Enviar via WhatsApp →
                  </a>
                )}
              </section>

              <section>
                <h3 className="mb-2 text-sm font-semibold">Sugestões de melhoria digital</h3>
                <ul className="space-y-1.5 rounded-lg border bg-background p-4 text-sm">
                  {data.improvements.map((imp, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-primary">›</span>
                      <span className="text-muted-foreground">{imp}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <section>
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                  <Wand2 className="h-4 w-4 text-accent" />
                  Demo de landing page
                </h3>
                <div className="space-y-3 rounded-lg border bg-background p-4 text-sm">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">Título</p>
                    <p className="font-medium">{data.demo.pageTitle}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">Tagline</p>
                    <p className="italic text-muted-foreground">"{data.demo.tagline}"</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">Seções</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {data.demo.sections.map((s, i) => (
                        <span key={i} className="rounded-md border bg-secondary px-2 py-0.5 text-xs">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">Direção visual</p>
                    <p className="text-muted-foreground">{data.demo.visualIdea}</p>
                  </div>
                  <div>
                    <div className="mb-1 flex items-center justify-between">
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">Prompt para IA</p>
                      <CopyButton text={data.demo.aiPrompt} label="Copiar prompt" />
                    </div>
                    <p className="whitespace-pre-wrap rounded-md border border-dashed bg-muted/50 p-3 font-mono text-xs text-muted-foreground">
                      {data.demo.aiPrompt}
                    </p>
                  </div>
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
