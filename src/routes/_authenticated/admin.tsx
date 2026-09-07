import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LayoutDashboard, Store, LogOut, UploadCloud, Palette, Inbox, Moon, Sun, ScrollText, Handshake } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { isAdmin, claimFirstAdmin } from "@/lib/admin.functions";
import { LogoMark } from "@/components/site/Logo";
import { ADMIN_KEY } from "@/lib/track";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — Pure Table" }, { name: "robots", content: "noindex" }] }),
  component: AdminLayout,
});

function AdminLayout() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const checkAdmin = useServerFn(isAdmin);
  const claim = useServerFn(claimFirstAdmin);
  const [status, setStatus] = useState<"loading" | "admin" | "not_admin">("loading");
  const [email, setEmail] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);
  // Dark mode is a dashboard-only preference; the public site stays light.
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(localStorage.getItem("pt-admin-theme") === "dark");
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    return () => document.documentElement.classList.remove("dark");
  }, [dark]);

  function toggleTheme() {
    setDark((d) => {
      localStorage.setItem("pt-admin-theme", d ? "light" : "dark");
      return !d;
    });
  }

  async function refresh() {
    const { data: u } = await supabase.auth.getUser();
    setEmail(u.user?.email ?? null);
    // Allowlisted owner/editor emails get the admin role automatically on first visit.
    try { await supabase.rpc("claim_admin_role"); } catch { /* already an admin or not allowlisted */ }
    try {
      const r = await checkAdmin();
      setStatus(r.isAdmin ? "admin" : "not_admin");
      // Flag this browser so admin traffic is excluded from customer analytics.
      if (r.isAdmin) localStorage.setItem(ADMIN_KEY, "1");
    } catch {
      setStatus("not_admin");
    }
  }


  useEffect(() => { refresh(); }, []);

  async function tryClaim() {
    setClaiming(true);
    try {
      const r = await claim();
      if (r.granted) await refresh();
      else alert("An admin already exists. Ask them to grant you access.");
    } finally {
      setClaiming(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  if (status === "loading") {
    return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Loading…</div>;
  }

  if (status === "not_admin") {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
          <h1 className="font-display text-2xl font-semibold">Admin access required</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Signed in as <b>{email}</b>. If you're the first admin, claim access now.
          </p>
          <button onClick={tryClaim} disabled={claiming}
            className="mt-4 w-full rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-70">
            {claiming ? "Claiming…" : "Claim first-admin access"}
          </button>
          <button onClick={signOut} className="mt-2 w-full text-xs text-muted-foreground hover:text-foreground">Sign out</button>
        </div>
      </div>
    );
  }

  const links = [
    { to: "/admin", label: "Analytics", icon: LayoutDashboard, exact: true },
    { to: "/admin/businesses", label: "Businesses", icon: Store, exact: false },
    { to: "/admin/messages", label: "Messages", icon: Inbox, exact: false },
    { to: "/admin/leads", label: "Partner leads", icon: Handshake, exact: false },
    { to: "/admin/import", label: "Bulk import", icon: UploadCloud, exact: false },
    { to: "/admin/appearance", label: "Appearance", icon: Palette, exact: false },
    { to: "/admin/audit", label: "Audit log", icon: ScrollText, exact: false },
  ] as const;


  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2">
            <LogoMark className="h-8 w-8" />
            <span className="font-display font-semibold">Pure Table</span>
            <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-semibold uppercase text-primary">Admin</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-muted-foreground sm:inline">{email}</span>
            <button onClick={toggleTheme} aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
              className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">
              {dark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
              {dark ? "Light" : "Dark"}
            </button>
            <button onClick={signOut} className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 pb-2 sm:px-6 lg:px-8">
          {links.map((l) => {
            const active = l.exact ? pathname === l.to : pathname.startsWith(l.to);
            return (
              <Link key={l.to} to={l.to} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                <l.icon className="h-3.5 w-3.5" /> {l.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}
