import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Sparkles,
  Loader2,
  Instagram,
  Phone,
  Globe,
  MapPin,
  ExternalLink,
} from "lucide-react";
import { getCampaign } from "@/lib/campaigns.functions";
import { runCampaignSearch } from "@/lib/leads.functions";
import { ScoreBadge, StatusBadge } from "@/components/Badges";

export const Route = createFileRoute("/_authenticated/campaigns/$id")({
  head: () => ({ meta: [{ title: "Campanha — LeadForge" }] }),
  component: CampaignDetail,
});

function CampaignDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const getFn = useServerFn(getCampaign);
  const searchFn = useServerFn(runCampaignSearch);

  const { data, isLoading } = useQuery({
    queryKey: ["campaign", id],
    queryFn: () => getFn({ data: { id } }),
  });

  const searchMut = useMutation({
    mutationFn: () => searchFn({ data: { campaignId: id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["campaign", id] }),
  });

  if (isLoading || !data) {
    return (
      <div className="grid h-40 place-items-center text-sm text-muted-foreground">
        Carregando…
      </div>
    );
  }

  const { campaign, leads } = data;

  return (
    <div className="mx-auto max-w-6xl">
      <Link
        to="/campaigns"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Campanhas
      </Link>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">{campaign.name}</h1>
          <p className="text-sm text-muted-foreground">
            {campaign.niche} · {campaign.city} · até {campaign.max_leads} leads
          </p>
        </div>
        <button
          onClick={() => searchMut.mutate()}
          disabled={searchMut.isPending}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {searchMut.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {leads.length > 0 ? "Buscar mais leads" : "Iniciar busca real"}
        </button>
      </div>

      {searchMut.error && (
        <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive-foreground">
          {(searchMut.error as Error).message}
        </div>
      )}

      {searchMut.isPending && (
        <div className="mt-4 rounded-lg border bg-card px-4 py-3 text-xs text-muted-foreground">
          Buscando no Google em tempo real e analisando com IA… pode levar até 1 minuto.
        </div>
      )}

      <div className="mt-6">
        {leads.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-card/40 p-10 text-center text-sm text-muted-foreground">
            Nenhum lead ainda. Clique em <span className="text-foreground">Iniciar busca real</span>{" "}
            para buscar negócios no Google.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border bg-card shadow-card">
            <table className="w-full text-sm">
              <thead className="bg-secondary/40 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Negócio</th>
                  <th className="hidden px-4 py-3 font-medium md:table-cell">Contato</th>
                  <th className="px-4 py-3 font-medium">Score</th>
                  <th className="hidden px-4 py-3 font-medium sm:table-cell">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {leads.map((l) => (
                  <tr key={l.id} className="border-t hover:bg-secondary/20">
                    <td className="px-4 py-3">
                      <div className="font-medium">{l.name}</div>
                      <div className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
                        {l.ai_analysis ?? "—"}
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 md:table-cell">
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                        {l.instagram && (
                          <span className="inline-flex items-center gap-1">
                            <Instagram className="h-3 w-3" /> {l.instagram}
                          </span>
                        )}
                        {l.phone && (
                          <span className="inline-flex items-center gap-1">
                            <Phone className="h-3 w-3" /> {l.phone}
                          </span>
                        )}
                        {l.has_website ? (
                          <span className="inline-flex items-center gap-1">
                            <Globe className="h-3 w-3" /> site
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-primary">
                            sem site
                          </span>
                        )}
                        {l.address && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> {l.address}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <ScoreBadge score={l.score} />
                    </td>
                    <td className="hidden px-4 py-3 sm:table-cell">
                      <StatusBadge status={l.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to="/leads/$id"
                        params={{ id: l.id }}
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        Abrir <ExternalLink className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
