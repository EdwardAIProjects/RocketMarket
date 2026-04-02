import { BankruptcyPanel } from "@/components/bankruptcy-panel";
import Link from "next/link";
import { requireCurrentUser } from "@/lib/auth/session";
import { getPortfolio } from "@/lib/data/service";
import { formatMoney, formatProbability, formatSignedMoney } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function PortfolioPage() {
  const user = await requireCurrentUser("/portfolio");
  const portfolio = await getPortfolio(user.id);

  return (
    <div className="space-y-6">
      <section className="panel rounded-[36px] px-6 py-7 sm:px-8">
        <div className="eyebrow">Portfolio</div>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">
          {portfolio.user.name}&apos;s portfolio
        </h1>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-[24px] border border-[color:var(--line)] bg-white/4 p-5">
            <div className="text-sm text-[color:var(--muted)]">Cash</div>
            <div className="mt-2 text-3xl font-semibold">
              {formatMoney(portfolio.cashBalance)}
            </div>
          </div>
          <div className="rounded-[24px] border border-[color:var(--line)] bg-white/4 p-5">
            <div className="text-sm text-[color:var(--muted)]">Estimated value</div>
            <div className="mt-2 text-3xl font-semibold">
              {formatMoney(portfolio.estimatedValue)}
            </div>
          </div>
          <div className="rounded-[24px] border border-[color:var(--line)] bg-white/4 p-5">
            <div className="text-sm text-[color:var(--muted)]">Unrealized PnL</div>
            <div className="mt-2 text-3xl font-semibold">
              {formatSignedMoney(portfolio.unrealizedPnl)}
            </div>
          </div>
          <div className="rounded-[24px] border border-[color:var(--line)] bg-white/4 p-5">
            <div className="text-sm text-[color:var(--muted)]">Closed Profit / Loss</div>
            <div className="mt-2 text-3xl font-semibold">
              {formatSignedMoney(portfolio.realizedPnl)}
            </div>
          </div>
        </div>
      </section>

      <section className="panel rounded-[28px] p-5">
        <div className="eyebrow">Open Positions</div>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-[color:var(--muted)]">
              <tr>
                <th className="pb-3 font-medium">Market</th>
                <th className="pb-3 font-medium">YES</th>
                <th className="pb-3 font-medium">NO</th>
                <th className="pb-3 font-medium">Current</th>
              </tr>
            </thead>
            <tbody>
              {portfolio.positions.map((position) => (
                <tr key={position.marketId} className="border-t border-[color:var(--line)]">
                  <td className="py-4">
                    <Link
                      href={`/markets/${position.marketSlug}`}
                      className="font-semibold transition hover:text-[color:var(--accent-strong)]"
                    >
                      {position.question}
                    </Link>
                  </td>
                  <td className="py-4">
                    {position.yesShares > 0
                      ? `${position.yesShares.toFixed(1)} @ ${formatProbability(
                          position.avgYesPrice,
                        )}`
                      : "—"}
                  </td>
                  <td className="py-4">
                    {position.noShares > 0
                      ? `${position.noShares.toFixed(1)} @ ${formatProbability(
                          position.avgNoPrice,
                        )}`
                      : "—"}
                  </td>
                  <td className="py-4 font-semibold">
                    {formatProbability(position.currentProbability)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <BankruptcyPanel bankruptcyCount={portfolio.user.bankruptcyCount} />
    </div>
  );
}
