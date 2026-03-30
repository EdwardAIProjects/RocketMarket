"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { MarketChart } from "@/components/market-chart";
import { formatCompactNumber, formatDateTime, formatProbability } from "@/lib/format";
import type { Market } from "@/lib/types";

export function HomeMarketCarousel({ markets }: { markets: Market[] }) {
  const [index, setIndex] = useState(0);

  if (markets.length === 0) {
    return (
      <div className="panel rounded-[24px] p-6">
        <div className="eyebrow">Featured market</div>
        <p className="mt-3 text-sm text-[color:var(--muted)]">No open markets yet.</p>
      </div>
    );
  }

  const market = markets[index % markets.length];

  return (
    <div className="panel panel-strong rounded-[24px] p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="eyebrow">Featured market</div>
          <h2 className="mt-3 max-w-3xl text-2xl font-semibold tracking-tight sm:text-3xl">
            {market.question}
          </h2>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setIndex((current) => (current - 1 + markets.length) % markets.length)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--line)] bg-white/4 text-[color:var(--muted)] transition hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setIndex((current) => (current + 1) % markets.length)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--line)] bg-white/4 text-[color:var(--muted)] transition hover:text-foreground"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="rounded-[20px] border border-[color:var(--line)] bg-black/10 p-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="text-4xl font-semibold text-emerald-300">
                {formatProbability(market.currentProbability)}
              </div>
              <div className="mt-1 text-sm text-[color:var(--muted)]">YES</div>
            </div>
            <div className="text-right">
              <div className="text-4xl font-semibold text-rose-300">
                {formatProbability(1 - market.currentProbability)}
              </div>
              <div className="mt-1 text-sm text-[color:var(--muted)]">NO</div>
            </div>
          </div>

          <div className="mt-4">
            <MarketChart points={market.chart} />
          </div>

          <div className="mt-4 flex flex-wrap gap-4 text-xs text-[color:var(--muted)]">
            <span>{formatCompactNumber(market.volume)} vol</span>
            <span>{market.tradersCount} traders</span>
            <span>Closes {formatDateTime(market.closeTime)}</span>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-[20px] border border-emerald-500/18 bg-emerald-500/10 p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-emerald-300">Buy Yes</div>
            <div className="mt-2 text-3xl font-semibold">{formatProbability(market.currentProbability)}</div>
          </div>
          <div className="rounded-[20px] border border-rose-500/18 bg-rose-500/10 p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-rose-300">Buy No</div>
            <div className="mt-2 text-3xl font-semibold">{formatProbability(1 - market.currentProbability)}</div>
          </div>
          <div className="rounded-[20px] border border-[color:var(--line)] bg-white/3 p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-[color:var(--muted)]">Category</div>
            <div className="mt-2 text-lg font-semibold">{market.category}</div>
            <p className="mt-3 line-clamp-4 text-sm leading-6 text-[color:var(--muted)]">
              {market.description}
            </p>
          </div>
          <Link
            href={`/markets/${market.slug}`}
            className="rounded-full bg-[color:var(--accent)] px-4 py-3 text-center text-sm font-semibold text-slate-950 transition hover:opacity-90"
          >
            Open market
          </Link>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-center gap-2">
        {markets.map((entry, entryIndex) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => setIndex(entryIndex)}
            className={`h-2.5 rounded-full transition ${
              entryIndex === index ? "w-8 bg-[color:var(--accent)]" : "w-2.5 bg-white/20"
            }`}
            aria-label={`Show market ${entryIndex + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
