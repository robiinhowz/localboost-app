import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Radar, Filter, AlertCircle } from "lucide-react";
import { SearchForm } from "@/components/SearchForm";
import { LeadTable } from "@/components/LeadTable";
import { OutreachModal } from "@/components/OutreachModal";
import { useProspect } from "@/hooks/useProspect";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LeadForge — Prospecção local com IA para freelancers e agências" },
      {
        name: "description",
        content:
          "Encontre negócios locais sem site profissional e gere abordagens personalizadas com IA em segundos.",
      },
      { property: "og:title", content: "LeadForge — Prospecção local com IA" },
      {
        property: "og:description",
        content: "Encontre leads locais e gere mensagens de abordagem com IA.",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Grotesk:wght@500;600;700&display=swap",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const p = useProspect();
  const [onlyNoSite, setOnlyNoSite] = useState(true);

  const stats = useMemo(() => {
    const total = p.leads.length;
    const noSite = p.leads.filter((l) => !l.hasWebsite).length;
    const outdated = p.leads.filter((l) => l.hasWebsite && l.websiteOutdated).length;
    return { total, noSite, outdated };
  }, [p.leads]);

  return (
    <div className="min-h-screen bg-background bg-hero">
      <header className="border-b bg-background/60 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/15 text-primary shadow-glow">
              <Radar className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold leading-none">LeadForge</p>
              <p className="text-[11px] text-muted-foreground">Prospecção local com IA</p>
            </div>
          </div>
          <span className="hidden text-xs text-muted-foreground sm:block">
            Para freelancers e agências
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <section className="mb-8 text-center sm:mb-12">
          <span className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            Encontre clientes em segundos
          </span>
          <h1 className="mt-4 text-3xl font-bold leading-tight sm:text-5xl">
            Encontre negócios locais <span className="text-gradient">sem site profissional</span>
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
            Pesquise por nicho e cidade, descubra leads qualificados e gere mensagens de abordagem
            personalizadas com IA — incluindo prompt para uma demo de landing page.
          </p>
        </section>

        <section className="mb-6">
          <SearchForm loading={p.searching} onSearch={p.runSearch} />
          {p.searchError && (
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive-foreground">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {p.searchError}
            </div>
          )}
        </section>

        {p.leads.length > 0 && (
          <>
            <section className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-md border bg-card px-2.5 py-1 text-muted-foreground">
                  {stats.total} leads
                </span>
                <span className="rounded-md border border-primary/30 bg-primary/10 px-2.5 py-1 text-primary">
                  {stats.noSite} sem site
                </span>
                <span className="rounded-md border border-warning/30 bg-warning/10 px-2.5 py-1 text-warning">
                  {stats.outdated} desatualizados
                </span>
              </div>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground">
                <Filter className="h-3.5 w-3.5" />
                <input
                  type="checkbox"
                  checked={onlyNoSite}
                  onChange={(e) => setOnlyNoSite(e.target.checked)}
                  className="h-3.5 w-3.5 accent-primary"
                />
                Apenas sem site
              </label>
            </section>

            <LeadTable leads={p.leads} onlyNoSite={onlyNoSite} onGenerate={p.runOutreach} />
          </>
        )}

        {p.leads.length === 0 && !p.searching && !p.searchError && (
          <div className="rounded-2xl border border-dashed bg-card/40 p-10 text-center text-sm text-muted-foreground">
            Faça uma busca para descobrir negócios locais que precisam da sua ajuda.
          </div>
        )}
      </main>

      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        Dados gerados por IA para prospecção — confirme antes de contatar.
      </footer>

      <OutreachModal
        open={!!p.activeLead}
        lead={p.activeLead}
        loading={p.outreachLoading}
        data={p.outreachData}
        error={p.outreachError}
        onClose={p.closeOutreach}
      />
    </div>
  );
}
