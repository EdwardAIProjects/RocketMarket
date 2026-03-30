import Link from "next/link";
import { HomeLeaderboard } from "@/components/home-leaderboard";
import { HomeMarketCarousel } from "@/components/home-market-carousel";
import { MarketCard } from "@/components/market-card";
import { getLeaderboard, listMarkets } from "@/lib/data/service";

export default async function Home() {
  const [markets, leaderboard] = await Promise.all([listMarkets(), getLeaderboard()]);
  const openMarkets = markets.filter((market) => market.status === "open");
  const featuredMarkets = openMarkets.slice(0, 4);

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
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">Open board</h2>
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
          {openMarkets.map((market) => (
            <MarketCard key={market.id} market={market} />
          ))}
        </div>
      </section>
    </div>
  );
}
