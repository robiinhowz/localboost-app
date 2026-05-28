import { useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Radar, Sparkles, Target, Zap } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LeadForge — Prospecção inteligente para freelancers e agências" },
      {
        name: "description",
        content:
          "Encontre negócios locais reais sem site profissional, analise com IA e gere abordagens em segundos.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard", replace: true });
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen bg-background bg-hero">
      <header className="border-b bg-background/60 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/15 text-primary shadow-glow">
              <Radar className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold leading-none">LeadForge</p>
              <p className="text-[11px] text-muted-foreground">Prospecção inteligente</p>
            </div>
          </div>
          <Link
            to="/login"
            className="rounded-lg border bg-card px-4 py-1.5 text-sm font-medium hover:border-primary/40"
          >
            Entrar
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-16 sm:py-24">
        <div className="text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            Busca real no Google · Análise com IA
          </span>
          <h1 className="mx-auto mt-5 max-w-3xl text-4xl font-bold leading-tight sm:text-6xl">
            Encontre clientes locais{" "}
            <span className="text-gradient">com baixa presença digital</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
            Crie campanhas por nicho e cidade. A LeadForge busca negócios reais na internet,
            analisa o site e o Instagram de cada um, e gera mensagens e prompts de landing
            page prontos para fechar.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              to="/login"
              className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
            >
              Começar grátis
            </Link>
          </div>
        </div>

        <div className="mt-20 grid gap-4 sm:grid-cols-3">
          <Feature
            icon={Target}
            title="Busca real"
            text="Google Search via Firecrawl. Nada de empresas fictícias."
          />
          <Feature
            icon={Sparkles}
            title="Score com IA"
            text="Frio, morno, quente ou muito quente — baseado em presença digital real."
          />
          <Feature
            icon={Zap}
            title="Mensagem + landing"
            text="WhatsApp pronto e prompt nichado para gerar a landing no Lovable."
          />
        </div>
      </main>
    </div>
  );
}

function Feature({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof Target;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-card">
      <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/15 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <h3 className="mt-3 text-base font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
