import Link from "next/link";
import { Rocket } from "lucide-react";
import { LogoutButton } from "@/components/logout-button";
import { env, isDemoMode, isLocalMode } from "@/lib/env";
import { formatMoney } from "@/lib/format";
import { getCurrentSession, getCurrentUser } from "@/lib/auth/session";

const navItems = [
  { href: "/", label: "Markets" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/markets/create", label: "Create" },
];

export async function TopNav() {
  const [session, currentUser] = await Promise.all([
    getCurrentSession(),
    getCurrentUser(),
  ]);
  const demoMode = isDemoMode();
  const localMode = isLocalMode();
  const visibleNavItems =
    currentUser?.role === "admin"
      ? [...navItems, { href: "/admin/markets", label: "Admin" }]
      : navItems;

  return (
    <header className="sticky top-0 z-20 border-b border-[color:var(--line)] bg-[rgba(7,12,23,0.82)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,_#0d182c_0%,_#163056_50%,_#4d89d8_100%)] text-white shadow-lg shadow-slate-950/40">
            <Rocket className="h-5 w-5" />
          </div>
          <div>
            <div className="eyebrow">UBCRocket</div>
            <div className="text-lg font-semibold tracking-tight">RocketMarket</div>
          </div>
        </Link>

        <nav className="hidden items-center gap-2 md:flex">
          {visibleNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full px-4 py-2 text-sm font-medium text-[color:var(--muted)] transition hover:bg-white/6 hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {localMode && (
            <span className="rounded-full border border-dashed border-[color:var(--line)] px-3 py-1 text-xs font-medium text-[color:var(--muted)]">
              Local mode
            </span>
          )}
          {demoMode && !env.hideDemoHeader && (
            <span className="rounded-full border border-dashed border-[color:var(--line)] px-3 py-1 text-xs font-medium text-[color:var(--muted)]">
              Demo mode
            </span>
          )}
          {session?.user?.email ? (
            <div className="flex items-center gap-3">
              {currentUser ? (
                <span className="hidden rounded-full border border-emerald-400/30 bg-emerald-500/18 px-3 py-1 text-sm font-medium text-emerald-100 lg:inline-flex">
                  {formatMoney(Number(currentUser.cashBalance))}
                </span>
              ) : null}
              <span className="hidden text-sm text-[color:var(--muted)] sm:inline">
                {session.user.email}
              </span>
              <LogoutButton />
            </div>
          ) : (
            !demoMode ? (
              <Link
                className="rounded-full bg-[color:var(--accent)] px-4 py-2 text-sm font-semibold text-slate-950 transition hover:opacity-90"
                href="/login"
              >
                Sign in
              </Link>
            ) : null
          )}
        </div>
      </div>
    </header>
  );
}
