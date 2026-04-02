import { cache } from "react";
import { getMarketBySlug } from "@/lib/data/service";
import { env } from "@/lib/env";
import {
  formatCompactNumber,
  formatDateTime,
  formatProbability,
} from "@/lib/format";
import type { Market } from "@/lib/types";

export const getMarketForRoute = cache(async (slug: string) => getMarketBySlug(slug));

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

export function getSiteOrigin() {
  if (env.nextAuthUrl) {
    return trimTrailingSlash(env.nextAuthUrl);
  }

  return "http://localhost:3000";
}

export function getMarketUrl(slug: string) {
  return `${getSiteOrigin()}/markets/${slug}`;
}

function hashString(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash.toString(36);
}

export function getMarketOgVersion(market: Market) {
  const latestChartPoint = market.chart.at(-1);
  const latestBet = market.recentBets[0];

  return hashString(
    [
      market.question,
      market.status,
      market.currentProbability.toFixed(6),
      market.volume.toFixed(2),
      market.tradersCount,
      market.closeTime,
      market.resolveByTime,
      latestChartPoint?.timestamp ?? "",
      latestChartPoint?.probability.toFixed(6) ?? "",
      latestBet?.createdAt ?? "",
      latestBet?.amount.toFixed(2) ?? "",
      latestBet?.side ?? "",
    ].join("|"),
  );
}

export function getMarketOgImageUrl(market: Market) {
  const url = new URL(`${getMarketUrl(market.slug)}/opengraph-image`);
  url.searchParams.set("v", getMarketOgVersion(market));
  return url.toString();
}

function summarizeText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

export function buildMarketDescription(market: Market) {
  const timingLabel =
    market.status === "open"
      ? `Closes ${formatDateTime(market.closeTime)}`
      : `Resolve by ${formatDateTime(market.resolveByTime)}`;
  const stats = [
    `${market.status.toUpperCase()} market`,
    `YES ${formatProbability(market.currentProbability)}`,
    `NO ${formatProbability(1 - market.currentProbability)}`,
    `Volume ${formatCompactNumber(market.volume)}`,
    `${market.tradersCount} traders`,
    timingLabel,
  ].join(" • ");

  return summarizeText(`${stats}. ${market.description}`, 280);
}

export function buildMarketPageTitle(market: Market) {
  return `${market.question} | RocketMarket`;
}
