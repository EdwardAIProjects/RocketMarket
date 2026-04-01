import Link from "next/link";
import { MarketStatusBadge } from "@/components/market-status-badge";
import { requireAdmin } from "@/lib/auth/session";
import { listAdminMarkets } from "@/lib/data/service";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminMarketsPage() {
  await requireAdmin("/admin/markets");
  const markets = await listAdminMarkets();

  return (
    <div className="space-y-6">
      <section className="panel rounded-[36px] px-6 py-7 sm:px-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="eyebrow">Admin</div>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight">
              Review markets before they drift into unresolved purgatory.
            </h1>
          </div>
          <Link
            href="/admin/users"
            className="rounded-full border border-[color:var(--line)] px-4 py-2 text-sm font-semibold text-[color:var(--muted)] transition hover:text-foreground"
          >
            Manage users
          </Link>
        </div>
      </section>

      <section className="grid gap-4">
        {markets.map((market) => (
          <Link
            key={market.id}
            href={`/admin/markets/${market.slug}`}
            className="panel rounded-[28px] p-5 transition hover:bg-white/6"
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <MarketStatusBadge status={market.status} />
                <div className="mt-3 text-xl font-semibold">{market.question}</div>
                <div className="mt-1 text-sm text-[color:var(--muted)]">
                  Resolver: {market.resolver.name}
                </div>
              </div>
              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <div className="rounded-2xl border border-[color:var(--line)] bg-white/4 px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.18em] text-[color:var(--muted)]">
                    Close time
                  </div>
                  <div className="mt-1 font-semibold text-foreground">
                    {formatDateTime(market.closeTime)}
                  </div>
                </div>
                <div className="rounded-2xl border border-[color:var(--line)] bg-white/4 px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.18em] text-[color:var(--muted)]">
                    Resolve by
                  </div>
                  <div className="mt-1 font-semibold text-foreground">
                    {formatDateTime(market.resolveByTime)}
                  </div>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </section>
    </div>
  );
}
