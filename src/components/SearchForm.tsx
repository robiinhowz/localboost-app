import { useState, FormEvent } from "react";
import { Search, Loader2 } from "lucide-react";

interface Props {
  loading: boolean;
  onSearch: (niche: string, city: string) => void;
}

export function SearchForm({ loading, onSearch }: Props) {
  const [niche, setNiche] = useState("Nutricionista");
  const [city, setCity] = useState("Vitória ES");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!niche.trim() || !city.trim()) return;
    onSearch(niche.trim(), city.trim());
  };

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-card sm:flex-row sm:items-end sm:p-5"
    >
      <div className="flex-1">
        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Tipo de negócio
        </label>
        <input
          value={niche}
          onChange={(e) => setNiche(e.target.value)}
          placeholder="Ex: Nutricionista"
          className="h-11 w-full rounded-lg border bg-input px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
        />
      </div>
      <div className="flex-1">
        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Cidade
        </label>
        <input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="Ex: Vitória ES"
          className="h-11 w-full rounded-lg border bg-input px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-glow transition hover:opacity-90 disabled:opacity-60"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        {loading ? "Buscando..." : "Buscar leads"}
      </button>
    </form>
  );
}
