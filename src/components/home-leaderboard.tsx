import Link from "next/link";
import { formatMoney } from "@/lib/format";
import type { LeaderboardEntry } from "@/lib/types";

export function HomeLeaderboard({
  leaderboard,
}: {
  leaderboard: LeaderboardEntry[];
}) {
  return (
    <div className="panel rounded-[24px] p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="eyebrow">Leaderboard</div>
          <h2 className="mt-2 text-lg font-semibold tracking-tight">Standings</h2>
        </div>
        <Link
          href="/leaderboard"
          className="text-xs font-medium uppercase tracking-[0.18em] text-[color:var(--muted)] transition hover:text-foreground"
        >
          View all
        </Link>
      </div>

      <div className="mt-4 space-y-2">
        {leaderboard.slice(0, 6).map((entry, index) => (
          <div
            key={entry.user.id}
            className="flex items-center justify-between rounded-[16px] border border-[color:var(--line)] bg-white/3 px-4 py-3"
          >
            <div className="min-w-0">
              <div className="text-xs uppercase tracking-[0.18em] text-[color:var(--muted)]">
                #{index + 1}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="truncate text-sm font-semibold">{entry.user.name}</span>
                {entry.user.bankruptcyCount > 0 ? (
                  <span className="shrink-0 rounded-full border border-rose-500/40 bg-rose-500/14 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-rose-100">
                    Bankrupt x{entry.user.bankruptcyCount}
                  </span>
                ) : null}
              </div>
              <div className="mt-1 text-xs text-[color:var(--muted)]">
                {entry.wins} Wins / {entry.losses} Losses
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold text-emerald-300">
                {formatMoney(entry.portfolioValue)}
              </div>
              <div className="mt-1 text-xs text-[color:var(--muted)]">
                PnL {formatMoney(entry.realizedPnl)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
