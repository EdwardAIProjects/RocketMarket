import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  demoLeaderboard,
  demoMarketIds,
  demoMarkets,
  demoUserIds,
  demoUsers,
} from "@/lib/data/demo";
import { env } from "@/lib/env";
import { createCpmmState } from "@/lib/markets/engine";
import type { AmmState } from "@/lib/types";

export type LocalRole = "member" | "admin";
export type LocalMarketStatus = "open" | "closed" | "resolved" | "canceled";
export type LocalResolutionOutcome = "yes" | "no" | "partial" | "canceled";
export type LocalTradeSide = "buy_yes" | "buy_no" | "sell_yes" | "sell_no";

export interface LocalUser {
  id: string;
  name: string;
  email: string;
  role: LocalRole;
  startingBalance: number;
  cashBalance: number;
  bankruptcyCount: number;
  createdAt: string;
}

export interface LocalMarket {
  id: string;
  slug: string;
  question: string;
  description: string;
  category: string;
  status: LocalMarketStatus;
  closeTime: string;
  resolveByTime: string;
  resolutionCriteria: string;
  resolutionSource: string;
  resolutionNotes?: string;
  resolutionOutcome?: LocalResolutionOutcome;
  resolutionPercentYes?: number;
  createdByUserId: string;
  resolverUserId: string;
  currentProbability: number;
  ammState: AmmState;
  volume: number;
  tradersCount: number;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
}

export interface LocalPosition {
  id: string;
  userId: string;
  marketId: string;
  yesShares: number;
  noShares: number;
  avgYesPrice: number;
  avgNoPrice: number;
  realizedPnl: number;
  updatedAt: string;
}

export interface LocalTrade {
  id: string;
  marketId: string;
  userId: string;
  side: LocalTradeSide;
  stakeAmount: number;
  avgPrice: number;
  sharesReceived: number;
  probabilityBefore: number;
  probabilityAfter: number;
  createdAt: string;
}

export interface LocalLedgerEntry {
  id: string;
  userId: string;
  marketId?: string;
  tradeId?: string;
  type:
    | "starting_balance"
    | "trade_debit"
    | "trade_credit"
    | "market_payout"
    | "market_refund"
    | "manual_adjustment";
  amount: number;
  note?: string;
  createdAt: string;
}

export interface LocalResolutionAuditLog {
  id: string;
  marketId: string;
  actorUserId: string;
  action: "close" | "reopen" | "resolve" | "cancel";
  payloadJson: Record<string, unknown>;
  createdAt: string;
}

export interface LocalChartPoint {
  id: string;
  marketId: string;
  probability: number;
  at: string;
}

export interface LocalState {
  users: LocalUser[];
  markets: LocalMarket[];
  positions: LocalPosition[];
  trades: LocalTrade[];
  ledgerEntries: LocalLedgerEntry[];
  resolutionAuditLogs: LocalResolutionAuditLog[];
  marketChartPoints: LocalChartPoint[];
}

const adminEmails = new Set(
  env.adminEmailsCsv
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean),
);

let localStateQueue = Promise.resolve();
const legacyUserIdMap: Record<string, string> = {
  "user-1": demoUserIds.alex,
  "user-2": demoUserIds.maya,
  "user-3": demoUserIds.dylan,
};
const legacyMarketIdMap: Record<string, string> = {
  "market-rail": demoMarketIds.rail,
  "market-budget": demoMarketIds.budget,
  "market-hotfire": demoMarketIds.hotfire,
};

function nowIso() {
  return new Date().toISOString();
}

function isPastTime(value: string) {
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) && timestamp <= Date.now();
}

function emailName(email: string) {
  const base = email.split("@")[0] ?? "User";
  return base
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function buildSeedTrades() {
  return demoMarkets.flatMap((market) =>
    market.recentBets.map((bet) => {
      const avgPrice =
        bet.side === "buy_yes" || bet.side === "sell_yes"
          ? market.currentProbability
          : 1 - market.currentProbability;

      return {
        id: randomUUID(),
        marketId: market.id,
        userId: bet.userId,
        side: bet.side,
        stakeAmount: bet.amount,
        avgPrice,
        sharesReceived: bet.amount / Math.max(avgPrice, 0.01),
        probabilityBefore: market.currentProbability,
        probabilityAfter: market.currentProbability,
        createdAt: bet.createdAt,
      };
    }),
  );
}

function buildSeedState(): LocalState {
  const baseUsers: LocalUser[] = demoUsers.map((user, index) => {
    const leaderboardEntry = demoLeaderboard.find((entry) => entry.user.id === user.id);
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      startingBalance: 10000,
      cashBalance: leaderboardEntry?.cashBalance ?? 10000 - index * 500,
      bankruptcyCount: 0,
      createdAt: "2026-03-30T00:00:00.000Z",
    };
  });

  const marketCreatedAt = "2026-03-30T00:00:00.000Z";
  const positions: LocalPosition[] = [
    {
      id: randomUUID(),
      userId: demoUserIds.maya,
      marketId: demoMarketIds.rail,
      yesShares: 310.4,
      noShares: 0,
      avgYesPrice: 0.58,
      avgNoPrice: 0,
      realizedPnl: 120,
      updatedAt: nowIso(),
    },
    {
      id: randomUUID(),
      userId: demoUserIds.maya,
      marketId: demoMarketIds.budget,
      yesShares: 0,
      noShares: 192.3,
      avgYesPrice: 0,
      avgNoPrice: 0.61,
      realizedPnl: 295,
      updatedAt: nowIso(),
    },
  ];

  return {
    trades: buildSeedTrades(),
    users: baseUsers,
    markets: demoMarkets.map((market) => ({
      id: market.id,
      slug: market.slug,
      question: market.question,
      description: market.description,
      category: market.category,
      status: market.status,
      closeTime: market.closeTime,
      resolveByTime: market.resolveByTime,
      resolutionCriteria: market.resolutionCriteria,
      resolutionSource: market.resolutionSource,
      createdByUserId: market.createdBy.id,
      resolverUserId: market.resolver.id,
      currentProbability: market.currentProbability,
      ammState: market.ammState,
      volume: market.volume,
      tradersCount: market.tradersCount,
      createdAt: marketCreatedAt,
      updatedAt: marketCreatedAt,
    })),
    positions,
    ledgerEntries: baseUsers.map((user) => ({
      id: randomUUID(),
      userId: user.id,
      type: "starting_balance",
      amount: user.startingBalance,
      note: "Initial local test balance",
      createdAt: user.createdAt,
    })),
    resolutionAuditLogs: [],
    marketChartPoints: demoMarkets.flatMap((market) =>
      market.chart.map((point) => ({
        id: randomUUID(),
        marketId: market.id,
        probability: point.probability,
        at: point.timestamp,
      })),
    ),
  };
}

function mapLegacyId(id: string, mapping: Record<string, string>) {
  return mapping[id] ?? id;
}

function normalizeLocalState(state: LocalState) {
  let changed = false;

  for (const user of state.users) {
    const nextId = mapLegacyId(user.id, legacyUserIdMap);
    if (nextId !== user.id) {
      user.id = nextId;
      changed = true;
    }
    if (typeof user.bankruptcyCount !== "number") {
      user.bankruptcyCount = 0;
      changed = true;
    }
  }

  for (const market of state.markets) {
    const nextId = mapLegacyId(market.id, legacyMarketIdMap);
    const nextCreatedBy = mapLegacyId(market.createdByUserId, legacyUserIdMap);
    const nextResolver = mapLegacyId(market.resolverUserId, legacyUserIdMap);

    if (nextId !== market.id) {
      market.id = nextId;
      changed = true;
    }
    if (nextCreatedBy !== market.createdByUserId) {
      market.createdByUserId = nextCreatedBy;
      changed = true;
    }
    if (nextResolver !== market.resolverUserId) {
      market.resolverUserId = nextResolver;
      changed = true;
    }
    if (!market.ammState) {
      market.ammState = createCpmmState(market.currentProbability);
      changed = true;
    }
    if (market.status === "open" && isPastTime(market.closeTime)) {
      market.status = "closed";
      market.updatedAt = nowIso();
      changed = true;
    }
  }

  for (const position of state.positions) {
    const nextUserId = mapLegacyId(position.userId, legacyUserIdMap);
    const nextMarketId = mapLegacyId(position.marketId, legacyMarketIdMap);

    if (nextUserId !== position.userId) {
      position.userId = nextUserId;
      changed = true;
    }
    if (nextMarketId !== position.marketId) {
      position.marketId = nextMarketId;
      changed = true;
    }
  }

  for (const trade of state.trades) {
    const nextUserId = mapLegacyId(trade.userId, legacyUserIdMap);
    const nextMarketId = mapLegacyId(trade.marketId, legacyMarketIdMap);

    if (nextUserId !== trade.userId) {
      trade.userId = nextUserId;
      changed = true;
    }
    if (nextMarketId !== trade.marketId) {
      trade.marketId = nextMarketId;
      changed = true;
    }
  }

  if (state.trades.length === 0) {
    state.trades = buildSeedTrades();
    changed = true;
  }

  for (const entry of state.ledgerEntries) {
    const nextUserId = mapLegacyId(entry.userId, legacyUserIdMap);
    const nextMarketId = entry.marketId
      ? mapLegacyId(entry.marketId, legacyMarketIdMap)
      : entry.marketId;

    if (nextUserId !== entry.userId) {
      entry.userId = nextUserId;
      changed = true;
    }
    if (nextMarketId !== entry.marketId) {
      entry.marketId = nextMarketId;
      changed = true;
    }
  }

  for (const log of state.resolutionAuditLogs) {
    const nextUserId = mapLegacyId(log.actorUserId, legacyUserIdMap);
    const nextMarketId = mapLegacyId(log.marketId, legacyMarketIdMap);

    if (nextUserId !== log.actorUserId) {
      log.actorUserId = nextUserId;
      changed = true;
    }
    if (nextMarketId !== log.marketId) {
      log.marketId = nextMarketId;
      changed = true;
    }
  }

  for (const point of state.marketChartPoints) {
    const nextMarketId = mapLegacyId(point.marketId, legacyMarketIdMap);
    if (nextMarketId !== point.marketId) {
      point.marketId = nextMarketId;
      changed = true;
    }
  }

  return changed;
}

async function ensureParentDir() {
  await mkdir(path.dirname(env.localStatePath), { recursive: true });
}

async function withLocalStateLock<T>(operation: () => Promise<T>) {
  const next = localStateQueue.then(operation, operation);
  localStateQueue = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

export async function resetLocalState() {
  await withLocalStateLock(async () => {
    await rm(env.localStatePath, { force: true });
  });
}

export async function readLocalState(): Promise<LocalState> {
  await ensureParentDir();

  try {
    const raw = await readFile(env.localStatePath, "utf8");
    const state = JSON.parse(raw) as LocalState;
    if (normalizeLocalState(state)) {
      await writeLocalState(state);
    }
    return state;
  } catch {
    const seeded = buildSeedState();
    await writeLocalState(seeded);
    return seeded;
  }
}

export async function writeLocalState(state: LocalState) {
  await ensureParentDir();
  const tempPath = `${env.localStatePath}.${randomUUID()}.tmp`;
  await writeFile(tempPath, JSON.stringify(state, null, 2), "utf8");
  await rename(tempPath, env.localStatePath);
}

export async function withLocalState<T>(
  updater: (state: LocalState) => Promise<T> | T,
): Promise<T> {
  return withLocalStateLock(async () => {
    const state = await readLocalState();
    const result = await updater(state);
    await writeLocalState(state);
    return result;
  });
}

export async function getLocalUserByEmail(email: string) {
  const state = await readLocalState();
  return state.users.find((user) => user.email.toLowerCase() === email.toLowerCase()) ?? null;
}

export async function getLocalUserById(id: string) {
  const state = await readLocalState();
  return state.users.find((user) => user.id === id) ?? null;
}

export async function signInLocalUser(email: string) {
  return withLocalState(async (state) => {
    const normalized = email.trim().toLowerCase();
    let user = state.users.find((entry) => entry.email.toLowerCase() === normalized);

    if (!user) {
      const hasAdmin = state.users.some((entry) => entry.role === "admin");
      user = {
        id: randomUUID(),
        name: emailName(normalized),
        email: normalized,
        role: adminEmails.has(normalized) || !hasAdmin ? "admin" : "member",
        startingBalance: 10000,
        cashBalance: 10000,
        bankruptcyCount: 0,
        createdAt: nowIso(),
      };
      state.users.push(user);
      state.ledgerEntries.push({
        id: randomUUID(),
        userId: user.id,
        type: "starting_balance",
        amount: user.startingBalance,
        note: "Initial local test balance",
        createdAt: user.createdAt,
      });
    }

    return user;
  });
}
