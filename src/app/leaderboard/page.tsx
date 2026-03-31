import { Trophy } from "lucide-react";
import { getLeaderboard } from "@/lib/data/service";
import { formatMoney } from "@/lib/format";

export default async function LeaderboardPage() {
  const leaderboard = await getLeaderboard();

  return (
    <div className="space-y-6">
      <section className="panel rounded-[36px] px-6 py-7 sm:px-8">
        <div className="eyebrow">Leaderboard</div>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">
          Which teammate is actually good at calling outcomes?
        </h1>
      </section>

      <section className="grid gap-4">
        {leaderboard.map((entry, index) => (
          <div key={entry.user.id} className="panel rounded-[28px] p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,_#1c1b18_0%,_#d44d1c_100%)] text-white">
                  <Trophy className="h-5 w-5" />
                </div>
                <div>
                  <div className="eyebrow">Rank #{index + 1}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className="text-xl font-semibold">{entry.user.name}</span>
                    {entry.user.bankruptcyCount > 0 ? (
                      <span className="rounded-full border border-rose-500/40 bg-rose-500/14 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-rose-100">
                        Bankrupt x{entry.user.bankruptcyCount}
                      </span>
                    ) : null}
                  </div>
                  <div className="text-sm text-[color:var(--muted)]">{entry.user.email}</div>
                </div>
              </div>
              <div className="grid gap-4 text-right sm:grid-cols-3 sm:text-left">
                <div>
                  <div className="text-xs uppercase tracking-[0.18em] text-[color:var(--muted)]">
                    Value
                  </div>
                  <div className="mt-1 text-lg font-semibold">
                    {formatMoney(entry.portfolioValue)}
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-[0.18em] text-[color:var(--muted)]">
                    Cash
                  </div>
                  <div className="mt-1 text-lg font-semibold">
                    {formatMoney(entry.cashBalance)}
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-[0.18em] text-[color:var(--muted)]">
                    Realized PnL
                  </div>
                  <div className="mt-1 text-lg font-semibold">
                    {formatMoney(entry.realizedPnl)}
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-[0.18em] text-[color:var(--muted)]">
                    W / L
                  </div>
                  <div className="mt-1 text-lg font-semibold">
                    {entry.wins} / {entry.losses}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
