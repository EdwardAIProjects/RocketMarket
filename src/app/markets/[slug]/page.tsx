import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MarketBetList } from "@/components/market-bet-list";
import { MarketChart } from "@/components/market-chart";
import { StatPill } from "@/components/stat-pill";
import { TradePanel } from "@/components/trade-panel";
import {
  formatCompactNumber,
  formatDateTime,
  formatProbability,
} from "@/lib/format";
import {
  buildMarketDescription,
  buildMarketPageTitle,
  getMarketForRoute,
  getMarketOgImageUrl,
  getMarketUrl,
} from "./market-metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const market = await getMarketForRoute(slug);

  if (!market) {
    return {
      title: "Market Not Found | RocketMarket",
    };
  }

  const description = buildMarketDescription(market);
  const url = getMarketUrl(market.slug);
  const image = getMarketOgImageUrl(market);

  return {
    title: buildMarketPageTitle(market),
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: market.question,
      description,
      url,
      type: "website",
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: `${market.question} market card`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: market.question,
      description,
      images: [image],
    },
  };
}

export default async function MarketDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const market = await getMarketForRoute(slug);

  if (!market) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <section className="panel rounded-[24px] px-6 py-6 sm:px-7">
        <div className="eyebrow">{market.category}</div>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              {market.question}
            </h1>
            <p className="mt-4 text-sm leading-7 text-[color:var(--muted)] sm:text-base">
              {market.description}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:w-[280px] lg:grid-cols-1">
            <StatPill label="Yes" value={formatProbability(market.currentProbability)} tone="success" />
            <StatPill label="No" value={formatProbability(1 - market.currentProbability)} tone="danger" />
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
        <div className="space-y-6">
          <MarketChart points={market.chart} />
          <MarketBetList bets={market.recentBets} title="Bet history" />
          <div className="panel rounded-[22px] p-5">
            <div className="eyebrow">Rules</div>
            <div className="mt-4 grid gap-5 md:grid-cols-2">
              <div>
                <div className="text-sm font-semibold">Resolution criteria</div>
                <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
                  {market.resolutionCriteria}
                </p>
              </div>
              <div>
                <div className="text-sm font-semibold">Resolution source</div>
                <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
                  {market.resolutionSource || "No resolution source provided."}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <TradePanel
            marketId={market.id}
            probability={market.currentProbability}
            ammState={market.ammState}
            marketStatus={market.status}
          />
          <div className="panel rounded-[22px] p-5">
            <div className="eyebrow">Market Stats</div>
            <div className="mt-4 grid gap-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-[color:var(--muted)]">Status</span>
                <span className="font-semibold capitalize">{market.status}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[color:var(--muted)]">Volume</span>
                <span className="font-semibold">{formatCompactNumber(market.volume)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[color:var(--muted)]">Traders</span>
                <span className="font-semibold">{market.tradersCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[color:var(--muted)]">Closes</span>
                <span className="font-semibold">{formatDateTime(market.closeTime)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[color:var(--muted)]">Resolve by</span>
                <span className="font-semibold">{formatDateTime(market.resolveByTime)}</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
