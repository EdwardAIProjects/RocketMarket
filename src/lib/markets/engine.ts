import { z } from "zod";
import type { AmmState, TradeQuote, TradeSide } from "@/lib/types";

const DEFAULT_P = 0.5;
const DEFAULT_LIQUIDITY = 1_000;

const tradeIntentSchema = z.object({
  side: z.enum(["buy_yes", "buy_no", "sell_yes", "sell_no"]),
  amount: z.number().positive(),
});

function clampProbability(value: number) {
  return Math.max(0.01, Math.min(0.99, value));
}

export function getCpmmProbability(poolYes: number, poolNo: number, p: number) {
  return clampProbability((p * poolNo) / ((1 - p) * poolYes + p * poolNo));
}

export function createCpmmState(probability = 0.5, liquidity = DEFAULT_LIQUIDITY): AmmState {
  const clampedProbability = clampProbability(probability);

  return {
    poolYes: (1 - clampedProbability) * liquidity,
    poolNo: clampedProbability * liquidity,
    p: DEFAULT_P,
  };
}

export function normalizeAmmState(
  rawState: unknown,
  fallbackProbability = 0.5,
  fallbackLiquidity = DEFAULT_LIQUIDITY,
): AmmState {
  if (
    typeof rawState === "object" &&
    rawState !== null &&
    "poolYes" in rawState &&
    "poolNo" in rawState
  ) {
    const poolYes = Number((rawState as { poolYes?: number }).poolYes);
    const poolNo = Number((rawState as { poolNo?: number }).poolNo);
    const p = Number((rawState as { p?: number }).p ?? DEFAULT_P);

    if (Number.isFinite(poolYes) && Number.isFinite(poolNo) && poolYes > 0 && poolNo > 0) {
      return { poolYes, poolNo, p: clampProbability(p) };
    }
  }

  if (
    typeof rawState === "object" &&
    rawState !== null &&
    "probability" in rawState
  ) {
    const probability = Number((rawState as { probability?: number }).probability);
    const liquidity = Number((rawState as { liquidity?: number }).liquidity ?? fallbackLiquidity);

    if (Number.isFinite(probability) && Number.isFinite(liquidity) && liquidity > 0) {
      return createCpmmState(probability, liquidity);
    }
  }

  return createCpmmState(fallbackProbability, fallbackLiquidity);
}

function calculateBuyShares(
  poolYes: number,
  poolNo: number,
  p: number,
  amount: number,
  outcome: "YES" | "NO",
) {
  const k = Math.pow(poolYes, p) * Math.pow(poolNo, 1 - p);

  if (outcome === "YES") {
    const newNo = poolNo + amount;
    const newYes = Math.pow(k / Math.pow(newNo, 1 - p), 1 / p);
    return poolYes + amount - newYes;
  }

  const newYes = poolYes + amount;
  const newNo = Math.pow(k / Math.pow(newYes, p), 1 / (1 - p));
  return poolNo + amount - newNo;
}

function getPoolAfterBuy(
  poolYes: number,
  poolNo: number,
  p: number,
  amount: number,
  outcome: "YES" | "NO",
) {
  const k = Math.pow(poolYes, p) * Math.pow(poolNo, 1 - p);

  if (outcome === "YES") {
    const newPoolNo = poolNo + amount;
    const newPoolYes = Math.pow(k / Math.pow(newPoolNo, 1 - p), 1 / p);
    return { newPoolYes, newPoolNo };
  }

  const newPoolYes = poolYes + amount;
  const newPoolNo = Math.pow(k / Math.pow(newPoolYes, p), 1 / (1 - p));
  return { newPoolYes, newPoolNo };
}

function findBuyCostForShares(
  poolYes: number,
  poolNo: number,
  p: number,
  sharesToMatch: number,
  outcome: "YES" | "NO",
) {
  let low = 0;
  let high = Math.max(1, sharesToMatch);

  while (calculateBuyShares(poolYes, poolNo, p, high, outcome) < sharesToMatch) {
    high *= 2;
    if (high > sharesToMatch * 1_000) {
      break;
    }
  }

  for (let index = 0; index < 100; index += 1) {
    const mid = (low + high) / 2;
    const shares = calculateBuyShares(poolYes, poolNo, p, mid, outcome);

    if (Math.abs(shares - sharesToMatch) < 1e-8) {
      return mid;
    }

    if (shares < sharesToMatch) {
      low = mid;
    } else {
      high = mid;
    }
  }

  return (low + high) / 2;
}

function calculateSellPayout(
  poolYes: number,
  poolNo: number,
  p: number,
  sharesToSell: number,
  outcome: "YES" | "NO",
) {
  const oppositeOutcome = outcome === "YES" ? "NO" : "YES";
  const oppositeBuyCost = findBuyCostForShares(
    poolYes,
    poolNo,
    p,
    sharesToSell,
    oppositeOutcome,
  );

  return sharesToSell - oppositeBuyCost;
}

function getPoolAfterSell(
  poolYes: number,
  poolNo: number,
  p: number,
  sharesToSell: number,
  outcome: "YES" | "NO",
) {
  const oppositeOutcome = outcome === "YES" ? "NO" : "YES";
  const oppositeBuyCost = findBuyCostForShares(
    poolYes,
    poolNo,
    p,
    sharesToSell,
    oppositeOutcome,
  );

  return getPoolAfterBuy(poolYes, poolNo, p, oppositeBuyCost, oppositeOutcome);
}

export function quoteTrade(input: {
  side: TradeSide;
  amount: number;
  ammState?: AmmState;
  probability?: number;
}): TradeQuote {
  const parsed = tradeIntentSchema.parse(input);
  const ammState = input.ammState ?? createCpmmState(input.probability ?? 0.5);
  const probabilityBefore = getCpmmProbability(
    ammState.poolYes,
    ammState.poolNo,
    ammState.p,
  );

  if (parsed.side === "buy_yes" || parsed.side === "buy_no") {
    const outcome = parsed.side === "buy_yes" ? "YES" : "NO";
    const shares = calculateBuyShares(
      ammState.poolYes,
      ammState.poolNo,
      ammState.p,
      parsed.amount,
      outcome,
    );
    const nextPools = getPoolAfterBuy(
      ammState.poolYes,
      ammState.poolNo,
      ammState.p,
      parsed.amount,
      outcome,
    );
    const probabilityAfter = getCpmmProbability(
      nextPools.newPoolYes,
      nextPools.newPoolNo,
      ammState.p,
    );

    return {
      side: parsed.side,
      amount: parsed.amount,
      avgPrice: parsed.amount / shares,
      shares,
      probabilityBefore,
      probabilityAfter,
      maxPayout: shares,
      nextAmmState: {
        poolYes: nextPools.newPoolYes,
        poolNo: nextPools.newPoolNo,
        p: ammState.p,
      },
    };
  }

  const outcome = parsed.side === "sell_yes" ? "YES" : "NO";
  const payout = calculateSellPayout(
    ammState.poolYes,
    ammState.poolNo,
    ammState.p,
    parsed.amount,
    outcome,
  );
  const nextPools = getPoolAfterSell(
    ammState.poolYes,
    ammState.poolNo,
    ammState.p,
    parsed.amount,
    outcome,
  );
  const probabilityAfter = getCpmmProbability(
    nextPools.newPoolYes,
    nextPools.newPoolNo,
    ammState.p,
  );

  return {
    side: parsed.side,
    amount: parsed.amount,
    avgPrice: payout / parsed.amount,
    shares: parsed.amount,
    probabilityBefore,
    probabilityAfter,
    maxPayout: payout,
    nextAmmState: {
      poolYes: nextPools.newPoolYes,
      poolNo: nextPools.newPoolNo,
      p: ammState.p,
    },
  };
}

export function settlementValue(
  side: Exclude<TradeSide, "sell_yes" | "sell_no">,
  shares: number,
  outcome: "yes" | "no" | "partial" | "canceled",
  percentYes = 0.5,
) {
  if (outcome === "canceled") {
    return 0;
  }

  if (outcome === "partial") {
    return side === "buy_yes" ? shares * percentYes : shares * (1 - percentYes);
  }

  if (outcome === "yes") {
    return side === "buy_yes" ? shares : 0;
  }

  return side === "buy_no" ? shares : 0;
}
