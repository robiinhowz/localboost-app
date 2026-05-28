import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Flame, Users, Radar, MessageSquare, CheckCircle2, TrendingUp } from "lucide-react";
import { getDashboardStats } from "@/lib/campaigns.functions";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — LeadForge" }] }),
  component: Dashboard,
});

function Dashboard() {
  const fn = useServerFn(getDashboardStats);
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => fn(),
  });

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Visão geral das suas campanhas e leads.
          </p>
        </div>
        <Link
          to="/campaigns"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          Nova campanha
        </Link>
      </div>

      {isLoading || !data ? (
        <div className="grid h-40 place-items-center text-sm text-muted-foreground">
          Carregando…
        </div>
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <Stat icon={Users} label="Total de leads" value={data.totalLeads} />
            <Stat icon={Flame} label="Leads quentes" value={data.hotLeads} accent="primary" />
            <Stat icon={Radar} label="Campanhas ativas" value={data.activeCampaigns} />
            <Stat icon={MessageSquare} label="Contatados" value={data.contacted} />
            <Stat icon={CheckCircle2} label="Convertidos" value={data.converted} />
            <Stat
              icon={TrendingUp}
              label="Taxa resposta"
              value={`${data.replyRate}%`}
              accent="accent"
            />
          </section>

          <section className="mt-8 grid gap-4 lg:grid-cols-2">
            <ChartCard title="Leads por nicho" data={data.byNiche} />
            <ChartCard title="Leads por cidade" data={data.byCity} />
          </section>
        </>
      )}
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof Users;
  label: string;
  value: string | number;
  accent?: "primary" | "accent";
}) {
  const cls =
    accent === "primary"
      ? "bg-primary/15 text-primary"
      : accent === "accent"
        ? "bg-accent/15 text-accent"
        : "bg-secondary text-muted-foreground";
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-card">
      <div className={`mb-3 inline-grid h-8 w-8 place-items-center rounded-md ${cls}`}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function ChartCard({
  title,
  data,
}: {
  title: string;
  data: { name: string; value: number }[];
}) {
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-card">
      <h3 className="mb-4 text-sm font-semibold">{title}</h3>
      {data.length === 0 ? (
        <div className="grid h-44 place-items-center text-xs text-muted-foreground">
          Sem dados ainda
        </div>
      ) : (
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.02 260)" />
              <XAxis dataKey="name" stroke="oklch(0.68 0.02 260)" fontSize={11} />
              <YAxis stroke="oklch(0.68 0.02 260)" fontSize={11} />
              <Tooltip
                contentStyle={{
                  background: "oklch(0.20 0.018 260)",
                  border: "1px solid oklch(0.28 0.02 260)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Bar dataKey="value" fill="oklch(0.78 0.18 145)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
