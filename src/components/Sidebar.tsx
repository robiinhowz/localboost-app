import { Link, useRouter } from "@tanstack/react-router";
import { LayoutDashboard, Radar, LogOut, Sparkles, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export function Sidebar({ email }: { email: string | null }) {
  const router = useRouter();
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.navigate({ to: "/login" });
  };

  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r bg-card/40 backdrop-blur md:flex">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/15 text-primary shadow-glow">
          <Radar className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-bold leading-none">LeadForge</p>
          <p className="text-[11px] text-muted-foreground">Prospecção inteligente</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        <NavItem to="/dashboard" icon={LayoutDashboard}>
          Dashboard
        </NavItem>
        <NavItem to="/campaigns" icon={Sparkles}>
          Campanhas
        </NavItem>
      </nav>

      <div className="border-t p-3">
        <div className="truncate px-2 py-1 text-xs text-muted-foreground">{email}</div>
        <button
          onClick={handleLogout}
          className="mt-1 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-muted-foreground transition hover:bg-secondary hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </div>
    </aside>
  );
}

function NavItem({
  to,
  icon: Icon,
  children,
}: {
  to: string;
  icon: typeof LayoutDashboard;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-secondary hover:text-foreground"
      activeProps={{
        className:
          "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium bg-primary/15 text-primary",
      }}
    >
      <Icon className="h-4 w-4" />
      {children}
    </Link>
  );
}

export function MobileTopBar({ email }: { email: string | null }) {
  const router = useRouter();
  return (
    <div className="sticky top-0 z-20 flex items-center justify-between border-b bg-background/80 px-4 py-3 backdrop-blur md:hidden">
      <Link to="/dashboard" className="flex items-center gap-2">
        <div className="grid h-8 w-8 place-items-center rounded-md bg-primary/15 text-primary">
          <Radar className="h-4 w-4" />
        </div>
        <span className="text-sm font-bold">LeadForge</span>
      </Link>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link to="/campaigns" className="hover:text-foreground">
          Campanhas
        </Link>
        <span>·</span>
        <button
          onClick={async () => {
            await supabase.auth.signOut();
            router.navigate({ to: "/login" });
          }}
          className="hover:text-foreground"
        >
          Sair
        </button>
        <span className="hidden truncate text-[11px] sm:inline">{email}</span>
      </div>
    </div>
  );
}
