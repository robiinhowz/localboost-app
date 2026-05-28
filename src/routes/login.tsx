import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { Radar, Mail, Lock, Chrome, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [{ title: "Entrar — LeadForge" }],
  }),
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && user) navigate({ to: "/dashboard", replace: true });
  }, [user, authLoading, navigate]);

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        setErr("Verifique seu email para confirmar a conta.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erro ao autenticar");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setErr(null);
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setErr(result.error.message);
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background bg-hero px-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2.5">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/15 text-primary shadow-glow">
            <Radar className="h-5 w-5" />
          </div>
          <div className="text-left">
            <p className="text-base font-bold leading-none">LeadForge</p>
            <p className="text-[11px] text-muted-foreground">Prospecção inteligente</p>
          </div>
        </Link>

        <div className="rounded-2xl border bg-card p-6 shadow-card sm:p-8">
          <h1 className="text-xl font-bold">
            {mode === "login" ? "Entre na sua conta" : "Crie sua conta"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "login"
              ? "Acesse suas campanhas e leads."
              : "Comece a prospectar em segundos."}
          </p>

          <button
            onClick={handleGoogle}
            disabled={loading}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg border bg-background px-4 py-2.5 text-sm font-medium transition hover:border-primary/40 disabled:opacity-50"
          >
            <Chrome className="h-4 w-4" />
            Continuar com Google
          </button>

          <div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-wider text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            ou
            <span className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={handleEmail} className="space-y-3">
            <label className="flex items-center gap-2 rounded-lg border bg-input/30 px-3 py-2.5">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <input
                type="email"
                required
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </label>
            <label className="flex items-center gap-2 rounded-lg border bg-input/30 px-3 py-2.5">
              <Lock className="h-4 w-4 text-muted-foreground" />
              <input
                type="password"
                required
                minLength={6}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </label>

            {err && (
              <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive-foreground">
                {err}
              </p>
            )}

            <button
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "login" ? "Entrar" : "Criar conta"}
            </button>
          </form>

          <button
            onClick={() => {
              setMode(mode === "login" ? "signup" : "login");
              setErr(null);
            }}
            className="mt-4 w-full text-center text-xs text-muted-foreground hover:text-foreground"
          >
            {mode === "login"
              ? "Não tem conta? Criar agora"
              : "Já tem conta? Fazer login"}
          </button>
        </div>
      </div>
    </div>
  );
}
