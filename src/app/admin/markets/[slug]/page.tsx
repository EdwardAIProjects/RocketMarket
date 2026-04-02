import { notFound } from "next/navigation";
import { AdminMarketEditor } from "@/components/admin-market-editor";
import { MarketStatusBadge } from "@/components/market-status-badge";
import { ResolutionPanel } from "@/components/resolution-panel";
import { requireAdmin } from "@/lib/auth/session";
import { getMarketBySlug, listAdminUsers } from "@/lib/data/service";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminMarketDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  await requireAdmin(`/admin/markets/${slug}`);
  const [market, users] = await Promise.all([getMarketBySlug(slug), listAdminUsers()]);

  if (!market) {
    notFound();
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
      <div className="space-y-6">
        <AdminMarketEditor market={market} users={users} />
        <section className="panel rounded-[28px] p-5">
          <div className="eyebrow">Admin detail</div>
          <div className="mt-3">
            <MarketStatusBadge status={market.status} />
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">{market.question}</h1>
          <div className="mt-5 space-y-4 text-sm">
            <div>
              <div className="font-semibold">Created by</div>
              <p className="mt-1 leading-6 text-[color:var(--muted)]">
                {market.createdBy.name}
              </p>
            </div>
            <div>
              <div className="font-semibold">Resolver</div>
              <p className="mt-1 leading-6 text-[color:var(--muted)]">{market.resolver.name}</p>
            </div>
            <div>
              <div className="font-semibold">Resolution criteria</div>
              <p className="mt-1 leading-6 text-[color:var(--muted)]">
                {market.resolutionCriteria}
              </p>
            </div>
            <div>
              <div className="font-semibold">Resolution source</div>
              <p className="mt-1 leading-6 text-[color:var(--muted)]">
                {market.resolutionSource || "No resolution source provided."}
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-[color:var(--line)] bg-white/4 p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-[color:var(--muted)]">
                  Close time
                </div>
                <div className="mt-1 font-semibold">{formatDateTime(market.closeTime)}</div>
              </div>
              <div className="rounded-2xl border border-[color:var(--line)] bg-white/4 p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-[color:var(--muted)]">
                  Resolve by
                </div>
                <div className="mt-1 font-semibold">{formatDateTime(market.resolveByTime)}</div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="space-y-6">
        <ResolutionPanel marketId={market.id} marketStatus={market.status} />
      </div>
    </div>
  );
}
