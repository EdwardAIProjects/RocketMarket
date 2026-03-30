import { notFound } from "next/navigation";
import { ResolutionPanel } from "@/components/resolution-panel";
import { requireAdmin } from "@/lib/auth/session";
import { getMarketBySlug } from "@/lib/data/service";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminMarketDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  await requireAdmin(`/admin/markets/${slug}`);
  const market = await getMarketBySlug(slug);

  if (!market) {
    notFound();
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <section className="panel rounded-[28px] p-5">
        <div className="eyebrow">Admin detail</div>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">{market.question}</h1>
        <div className="mt-5 space-y-4 text-sm">
          <div>
            <div className="font-semibold">Resolution criteria</div>
            <p className="mt-1 leading-6 text-[color:var(--muted)]">
              {market.resolutionCriteria}
            </p>
          </div>
          <div>
            <div className="font-semibold">Resolution source</div>
            <p className="mt-1 leading-6 text-[color:var(--muted)]">
              {market.resolutionSource}
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

      <ResolutionPanel marketId={market.id} />
    </div>
  );
}
