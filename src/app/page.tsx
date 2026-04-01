import Link from "next/link";
import { HomeLeaderboard } from "@/components/home-leaderboard";
import { HomeMarketCarousel } from "@/components/home-market-carousel";
import { MarketCard } from "@/components/market-card";
import type { Market } from "@/lib/types";
import { getLeaderboard, listMarkets } from "@/lib/data/service";

function sortMarkets(markets: Market[]) {
  const statusOrder: Record<Market["status"], number> = {
    open: 0,
    closed: 1,
    resolved: 2,
    canceled: 3,
  };

  return [...markets].sort((a, b) => {
    const statusDiff = statusOrder[a.status] - statusOrder[b.status];
    if (statusDiff !== 0) {
      return statusDiff;
    }

    return new Date(a.closeTime).getTime() - new Date(b.closeTime).getTime();
  });
}

export default async function Home() {
  const [markets, leaderboard] = await Promise.all([listMarkets(), getLeaderboard()]);
  const openMarkets = markets.filter((market) => market.status === "open");
  const featuredMarkets = openMarkets.slice(0, 4);
  const sortedMarkets = sortMarkets(markets);

  return (
    <div className="space-y-8">
      <section>
        <HomeMarketCarousel markets={featuredMarkets} />
      </section>

      <section>
        <HomeLeaderboard leaderboard={leaderboard} />
      </section>

      <section id="markets" className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="eyebrow">Markets</div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">Market board</h2>
            <p className="mt-2 text-sm text-[color:var(--muted)]">
              Open, closed, and resolved markets are all shown here.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/leaderboard"
              className="text-sm font-medium text-[color:var(--muted)] transition hover:text-foreground"
            >
              Leaderboard
            </Link>
            <Link
              href="/markets/create"
              className="rounded-full bg-[color:var(--accent)] px-4 py-2 text-sm font-semibold text-slate-950 transition hover:opacity-90"
            >
              Create market
            </Link>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sortedMarkets.map((market) => (
            <MarketCard key={market.id} market={market} />
          ))}
        </div>
      </section>
    </div>
  );
}
