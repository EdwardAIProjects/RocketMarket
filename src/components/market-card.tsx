import Link from "next/link";
import { Clock3, Users } from "lucide-react";
import { MarketBetList } from "@/components/market-bet-list";
import { formatCompactNumber, formatDateTime, formatProbability } from "@/lib/format";
import type { Market } from "@/lib/types";

export function MarketCard({ market }: { market: Market }) {
  const yes = formatProbability(market.currentProbability);
  const no = formatProbability(1 - market.currentProbability);
  const chance = Math.round(
    Math.max(market.currentProbability, 1 - market.currentProbability) * 100,
  );
  const dominantSide = market.currentProbability >= 0.5 ? "YES" : "NO";

  return (
    <Link
      href={`/markets/${market.slug}`}
      className="panel group rounded-[22px] p-5 transition duration-300 hover:-translate-y-0.5 hover:border-[color:var(--accent)]/40 hover:bg-[rgba(20,30,49,0.98)]"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="eyebrow">{market.category}</div>
          <h3 className="mt-3 text-lg font-semibold tracking-tight">{market.question}</h3>
        </div>
        <div className="rounded-full border border-[color:var(--line)] px-3 py-1 text-sm text-[color:var(--muted)]">
          {chance}%
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-[18px] border border-emerald-500/18 bg-emerald-500/10 px-4 py-3">
          <div className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-300">
            Buy Yes
          </div>
          <div className="mt-2 text-2xl font-semibold">{yes}</div>
        </div>
        <div className="rounded-[18px] border border-rose-500/18 bg-rose-500/10 px-4 py-3">
          <div className="text-xs font-medium uppercase tracking-[0.18em] text-rose-300">
            Buy No
          </div>
          <div className="mt-2 text-2xl font-semibold">{no}</div>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-4 text-sm text-[color:var(--muted)]">
        <div className="flex items-center gap-2">
          <Clock3 className="h-4 w-4" />
          <span>{formatDateTime(market.closeTime)}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span>{market.tradersCount}</span>
          </div>
          <div className="mono text-xs uppercase tracking-[0.2em]">
            {dominantSide}
          </div>
        </div>
      </div>
      <div className="mt-3 text-xs text-[color:var(--muted)]">
        {formatCompactNumber(market.volume)} vol
      </div>

      <div className="mt-5">
        <MarketBetList bets={market.recentBets} title="Bet history" />
      </div>
    </Link>
  );
}
