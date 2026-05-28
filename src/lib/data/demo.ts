import type {
  AmmState,
  LeaderboardEntry,
  Market,
  MarketBetSummary,
  PortfolioSnapshot,
  UserSummary,
} from "@/lib/types";
import { createCpmmState } from "@/lib/markets/engine";

export const demoUserIds = {
  alex: "0d7b7d49-ff34-4bcc-b448-fbaadf0794fc",
  maya: "47d31778-47d1-46cf-b7d2-0a7794064861",
  dylan: "d4f895f7-9d93-4d43-b259-4618eced7388",
} as const;

export const demoMarketIds = {
  rail: "8a72b7a4-748f-4528-9ea2-53e77b901c18",
  budget: "3da285af-3604-42de-b2d0-fce22c366a82",
  hotfire: "313fcff5-64c6-495a-a7ab-f2c4dced1f59",
} as const;

export const demoUsers: UserSummary[] = [
  {
    id: demoUserIds.alex,
    name: "Alex Chen",
    email: "alex@ubcrocket.com",
    role: "admin",
    bankruptcyCount: 0,
  },
  {
    id: demoUserIds.maya,
    name: "Maya Patel",
    email: "maya@ubcrocket.com",
    role: "member",
    bankruptcyCount: 0,
  },
  {
    id: demoUserIds.dylan,
    name: "Dylan Lee",
    email: "dylan@ubcrocket.com",
    role: "member",
    bankruptcyCount: 0,
  },
];

export const demoLocalUser = demoUsers[0];

const now = new Date();

function demoAmmState(probability: number): AmmState {
  return createCpmmState(probability);
}

function recentBet(
  user: UserSummary,
  side: MarketBetSummary["side"],
  amount: number,
  createdAt: string,
): MarketBetSummary {
  return {
    userId: user.id,
    userName: user.name,
    side,
    amount,
    createdAt,
  };
}

export const demoMarkets: Market[] = [
  {
    id: demoMarketIds.rail,
    slug: "will-the-rocket-leave-the-launch-rail",
    question: "Will the full-scale rocket leave the launch rail on the next official attempt?",
    description:
      "Resolves YES if telemetry, launch director log, and launch video all confirm that the vehicle clears the launch rail during the next official team launch attempt.",
    status: "open",
    category: "Launch",
    closeTime: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 16).toISOString(),
    resolveByTime: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 18).toISOString(),
    resolutionCriteria:
      "YES if the rocket physically clears the launch rail during an official launch attempt by the posted deadline. Scrubs with no attempt count as NO.",
    resolutionSource: "Launch director log, official flight video, and avionics telemetry export.",
    resolver: demoUsers[0],
    createdBy: demoUsers[0],
    currentProbability: 0.62,
    ammState: demoAmmState(0.62),
    volume: 2420,
    tradersCount: 18,
    chart: [
      { timestamp: "2026-03-24T18:00:00.000Z", probability: 0.48 },
      { timestamp: "2026-03-25T18:00:00.000Z", probability: 0.54 },
      { timestamp: "2026-03-26T18:00:00.000Z", probability: 0.57 },
      { timestamp: "2026-03-27T18:00:00.000Z", probability: 0.51 },
      { timestamp: "2026-03-28T18:00:00.000Z", probability: 0.59 },
      { timestamp: "2026-03-29T18:00:00.000Z", probability: 0.62 },
    ],
    recentBets: [
      recentBet(demoUsers[1], "buy_yes", 250, "2026-03-29T20:10:00.000Z"),
      recentBet(demoUsers[2], "buy_no", 140, "2026-03-29T18:45:00.000Z"),
      recentBet(demoUsers[0], "buy_yes", 320, "2026-03-29T17:05:00.000Z"),
    ],
  },
  {
    id: demoMarketIds.budget,
    slug: "will-avionics-burn-through-its-budget",
    question: "Will Avionics exceed its FY2026 budget before the end of April?",
    description:
      "Tracks whether Avionics actual spend passes the approved team budget line before the stated deadline.",
    status: "open",
    category: "Finance",
    closeTime: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 22).toISOString(),
    resolveByTime: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 23).toISOString(),
    resolutionCriteria:
      "YES if the approved finance sheet shows Avionics actual spend greater than its approved budget before April 30, 2026 at 23:59 Pacific.",
    resolutionSource: "Official team budget spreadsheet signed off by the finance lead.",
    resolver: demoUsers[0],
    createdBy: demoUsers[1],
    currentProbability: 0.37,
    ammState: demoAmmState(0.37),
    volume: 1610,
    tradersCount: 13,
    chart: [
      { timestamp: "2026-03-24T18:00:00.000Z", probability: 0.41 },
      { timestamp: "2026-03-25T18:00:00.000Z", probability: 0.38 },
      { timestamp: "2026-03-26T18:00:00.000Z", probability: 0.34 },
      { timestamp: "2026-03-27T18:00:00.000Z", probability: 0.31 },
      { timestamp: "2026-03-28T18:00:00.000Z", probability: 0.35 },
      { timestamp: "2026-03-29T18:00:00.000Z", probability: 0.37 },
    ],
    recentBets: [
      recentBet(demoUsers[1], "buy_no", 180, "2026-03-29T19:20:00.000Z"),
      recentBet(demoUsers[0], "buy_yes", 90, "2026-03-29T16:40:00.000Z"),
      recentBet(demoUsers[2], "buy_no", 210, "2026-03-28T23:15:00.000Z"),
    ],
  },
  {
    id: demoMarketIds.hotfire,
    slug: "will-the-engine-hot-fire-by-mid-april",
    question: "Will propulsion complete a clean hot-fire before April 15?",
    description:
      "Resolves based on whether propulsion finishes a hot-fire meeting the posted test-success criteria before the deadline.",
    status: "closed",
    category: "Propulsion",
    closeTime: new Date(now.getTime() - 1000 * 60 * 60 * 8).toISOString(),
    resolveByTime: new Date(now.getTime() + 1000 * 60 * 60 * 24).toISOString(),
    resolutionCriteria:
      "YES if the propulsion lead signs off a clean hot-fire meeting target duration and shutdown conditions by April 15, 2026.",
    resolutionSource: "Official propulsion test log and signoff note from the propulsion lead.",
    resolver: demoUsers[0],
    createdBy: demoUsers[2],
    currentProbability: 0.71,
    ammState: demoAmmState(0.71),
    volume: 2980,
    tradersCount: 21,
    chart: [
      { timestamp: "2026-03-24T18:00:00.000Z", probability: 0.52 },
      { timestamp: "2026-03-25T18:00:00.000Z", probability: 0.58 },
      { timestamp: "2026-03-26T18:00:00.000Z", probability: 0.64 },
      { timestamp: "2026-03-27T18:00:00.000Z", probability: 0.69 },
      { timestamp: "2026-03-28T18:00:00.000Z", probability: 0.71 },
      { timestamp: "2026-03-29T18:00:00.000Z", probability: 0.71 },
    ],
    recentBets: [
      recentBet(demoUsers[2], "buy_yes", 400, "2026-03-29T21:00:00.000Z"),
      recentBet(demoUsers[1], "buy_yes", 225, "2026-03-29T15:10:00.000Z"),
      recentBet(demoUsers[0], "sell_no", 150, "2026-03-29T13:25:00.000Z"),
    ],
  },
];

export const demoPortfolio: PortfolioSnapshot = {
  user: demoUsers[1],
  cashBalance: 6820,
  estimatedValue: 9265,
  realizedPnl: 415,
  unrealizedPnl: 2030,
  positions: [
    {
      marketId: demoMarketIds.rail,
      marketSlug: "will-the-rocket-leave-the-launch-rail",
      question: "Will the full-scale rocket leave the launch rail on the next official attempt?",
      yesShares: 310.4,
      noShares: 0,
      avgYesPrice: 0.58,
      avgNoPrice: 0,
      currentProbability: 0.62,
    },
    {
      marketId: demoMarketIds.budget,
      marketSlug: "will-avionics-burn-through-its-budget",
      question: "Will Avionics exceed its FY2026 budget before the end of April?",
      yesShares: 0,
      noShares: 192.3,
      avgYesPrice: 0,
      avgNoPrice: 0.61,
      currentProbability: 0.37,
    },
  ],
};

export const demoLeaderboard: LeaderboardEntry[] = [
  {
    user: demoUsers[1],
    portfolioValue: 9265,
    cashBalance: 6820,
    realizedPnl: 415,
    unrealizedPnl: 2030,
    wins: 7,
    losses: 3,
  },
  {
    user: demoUsers[2],
    portfolioValue: 8840,
    cashBalance: 7310,
    realizedPnl: 190,
    unrealizedPnl: 1340,
    wins: 5,
    losses: 4,
  },
  {
    user: demoUsers[0],
    portfolioValue: 8125,
    cashBalance: 5600,
    realizedPnl: -110,
    unrealizedPnl: 980,
    wins: 4,
    losses: 5,
  },
];
