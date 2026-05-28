import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Loader2, Trash2, Flame, Users, Activity } from "lucide-react";
import {
  listCampaigns,
  createCampaign,
  deleteCampaign,
} from "@/lib/campaigns.functions";

export const Route = createFileRoute("/_authenticated/campaigns")({
  head: () => ({ meta: [{ title: "Campanhas — LeadForge" }] }),
  component: Campaigns,
});

function Campaigns() {
  const qc = useQueryClient();
  const listFn = useServerFn(listCampaigns);
  const createFn = useServerFn(createCampaign);
  const delFn = useServerFn(deleteCampaign);

  const { data, isLoading } = useQuery({
    queryKey: ["campaigns"],
    queryFn: () => listFn(),
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    niche: "",
    city: "",
    notes: "",
    max_leads: 20,
  });

  const createMut = useMutation({
    mutationFn: () => createFn({ data: form }),
    onSuccess: () => {
      setOpen(false);
      setForm({ name: "", niche: "", city: "", notes: "", max_leads: 20 });
      qc.invalidateQueries({ queryKey: ["campaigns"] });
    },
  });

  const delMut = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["campaigns"] }),
  });

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Campanhas</h1>
          <p className="text-sm text-muted-foreground">
            Organize sua prospecção por nicho e cidade.
          </p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Nova campanha
        </button>
      </div>

      {isLoading ? (
        <div className="grid h-40 place-items-center text-sm text-muted-foreground">
          Carregando…
        </div>
      ) : !data || data.campaigns.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-card/40 p-10 text-center text-sm text-muted-foreground">
          Você ainda não tem campanhas. Crie a primeira para começar a prospectar.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.campaigns.map((c) => (
            <Link
              key={c.id}
              to="/campaigns/$id"
              params={{ id: c.id }}
              className="group rounded-2xl border bg-card p-5 shadow-card transition hover:border-primary/40"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate text-base font-semibold">{c.name}</h3>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {c.niche} · {c.city}
                  </p>
                </div>
                <StatusPill status={c.status} />
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                <Mini icon={Users} label="leads" value={c.leads_count} />
                <Mini icon={Flame} label="quentes" value={c.hot_count} />
                <Mini icon={Activity} label="resp." value={`${c.reply_rate}%`} />
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    if (confirm("Excluir esta campanha e todos os leads?")) {
                      delMut.mutate(c.id);
                    }
                  }}
                  className="text-xs text-muted-foreground transition hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </Link>
          ))}
        </div>
      )}

      {open && (
        <div
          className="fixed inset-0 z-30 grid place-items-center bg-background/80 px-4 backdrop-blur"
          onClick={() => setOpen(false)}
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => {
              e.preventDefault();
              createMut.mutate();
            }}
            className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-card"
          >
            <h2 className="text-lg font-bold">Nova campanha</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Defina o público-alvo. A busca usa o Google em tempo real.
            </p>

            <div className="mt-4 space-y-3">
              <Field
                label="Nome"
                value={form.name}
                onChange={(v) => setForm({ ...form, name: v })}
                placeholder="Nutricionistas Vitória ES"
                required
              />
              <Field
                label="Nicho"
                value={form.niche}
                onChange={(v) => setForm({ ...form, niche: v })}
                placeholder="Nutricionista"
                required
              />
              <Field
                label="Cidade"
                value={form.city}
                onChange={(v) => setForm({ ...form, city: v })}
                placeholder="Vitória ES"
                required
              />
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Máx. de leads
                </label>
                <input
                  type="number"
                  min={5}
                  max={50}
                  value={form.max_leads}
                  onChange={(e) =>
                    setForm({ ...form, max_leads: parseInt(e.target.value) || 20 })
                  }
                  className="w-full rounded-lg border bg-input/30 px-3 py-2 text-sm outline-none focus:border-primary/40"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Observações
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  className="w-full rounded-lg border bg-input/30 px-3 py-2 text-sm outline-none focus:border-primary/40"
                />
              </div>
            </div>

            {createMut.error && (
              <p className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive-foreground">
                {(createMut.error as Error).message}
              </p>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
              >
                Cancelar
              </button>
              <button
                disabled={createMut.isPending}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {createMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Criar campanha
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-lg border bg-input/30 px-3 py-2 text-sm outline-none focus:border-primary/40"
      />
    </div>
  );
}

function Mini({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-lg border bg-background/40 px-2 py-2">
      <Icon className="mx-auto h-3.5 w-3.5 text-muted-foreground" />
      <p className="mt-1 text-sm font-semibold">{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    draft: { label: "Rascunho", cls: "bg-secondary text-muted-foreground border-border" },
    running: { label: "Buscando…", cls: "bg-accent/15 text-accent border-accent/30" },
    completed: { label: "Pronta", cls: "bg-primary/15 text-primary border-primary/30" },
    paused: { label: "Pausada", cls: "bg-muted text-muted-foreground border-border" },
  };
  const s = map[status] ?? map.draft;
  return (
    <span
      className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium ${s.cls}`}
    >
      {s.label}
    </span>
  );
}
