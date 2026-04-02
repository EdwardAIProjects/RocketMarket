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

export function getMarketOgImageUrl(slug: string) {
  return `${getMarketUrl(slug)}/opengraph-image`;
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
