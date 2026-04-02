import { randomUUID } from "node:crypto";
import {
  and,
  asc,
  desc,
  eq,
  inArray,
  isNotNull,
  sql,
} from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db";
import {
  ledgerEntries,
  marketChartPoints,
  markets,
  positions,
  resolutionAuditLogs,
  trades,
  users,
} from "@/lib/db/schema";
import { demoLeaderboard, demoMarkets, demoPortfolio } from "@/lib/data/demo";
import {
  type LocalMarket,
  type LocalState,
  type LocalUser,
  readLocalState,
  withLocalState,
} from "@/lib/local-store";
import { isDemoMode, isLocalMode } from "@/lib/env";
import { createCpmmState, normalizeAmmState, quoteTrade } from "@/lib/markets/engine";
import type {
  AdminUserRecord,
  AmmState,
  CreateMarketInput,
  LeaderboardEntry,
  Market,
  MarketBetSummary,
  PortfolioSnapshot,
  ResolutionPayload,
  TradeQuote,
  TradeSide,
  UserSummary,
} from "@/lib/types";

const trimmedString = z.string().trim();
const optionalTrimmedString = z.preprocess(
  (value) => (typeof value === "string" ? value.trim() : value),
  z.string().optional(),
);

const createMarketSchema = z
  .object({
    question: trimmedString.min(1),
    description: optionalTrimmedString,
    category: trimmedString.min(1),
    closeTime: trimmedString.datetime(),
    resolveByTime: trimmedString.datetime(),
    resolutionCriteria: trimmedString.min(1),
    resolutionSource: optionalTrimmedString,
    resolverUserId: z.union([z.string().uuid(), z.literal("")]).optional(),
  })
  .refine((input) => new Date(input.resolveByTime) >= new Date(input.closeTime), {
    message: "Resolve-by time must be after close time.",
    path: ["resolveByTime"],
  });

const tradeSchema = z.object({
  marketId: z.string().uuid(),
  side: z.enum(["buy_yes", "buy_no", "sell_yes", "sell_no"]),
  amount: z.number().min(1),
});

const resolutionSchema = z.object({
  outcome: z.enum(["yes", "no", "partial", "canceled"]),
  notes: optionalTrimmedString,
  evidenceUrl: z.string().url().optional().or(z.literal("")),
  percentYes: z.number().min(0).max(1).optional(),
});

const adminMarketUpdateSchema = z
  .object({
    question: trimmedString.min(1),
    description: optionalTrimmedString,
    category: trimmedString.min(1),
    closeTime: trimmedString.datetime(),
    resolveByTime: trimmedString.datetime(),
    resolutionCriteria: trimmedString.min(1),
    resolutionSource: optionalTrimmedString,
    resolverUserId: z.string().uuid(),
  })
  .refine((input) => new Date(input.resolveByTime) >= new Date(input.closeTime), {
    message: "Resolve-by time must be after close time.",
    path: ["resolveByTime"],
  });

const adminUserUpdateSchema = z.object({
  name: trimmedString.min(1),
  email: trimmedString.email(),
  role: z.enum(["member", "admin"]),
  isBanned: z.boolean(),
  startingBalance: z.number().min(0),
  cashBalance: z.number().min(0),
  bankruptcyCount: z.number().int().min(0),
});

const marketStatusMutationSchema = z.object({
  status: z.enum(["open", "closed"]),
});

type MarketRow = typeof markets.$inferSelect;
type UserRow = typeof users.$inferSelect;
type PositionRow = typeof positions.$inferSelect;

function getRequiredDb() {
  const db = getDb();

  if (!db) {
    throw new Error("DATABASE_URL is not configured. Set it to enable persistence.");
  }

  return db;
}

function parseNumber(value: string | number | null | undefined) {
  if (typeof value === "number") {
    return value;
  }

  return value ? Number(value) : 0;
}

function nowIso() {
  return new Date().toISOString();
}

function isPastTime(value: string | Date) {
  const timestamp = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isFinite(timestamp) && timestamp <= Date.now();
}

function slugify(question: string) {
  return question
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function makeUniqueSlug(base: string) {
  return `${base}-${randomUUID().slice(0, 8)}`;
}

function userToSummary(user: UserRow): UserSummary {
  return {
    id: user.id,
    name: user.name ?? user.email.split("@")[0] ?? "Unknown",
    email: user.email,
    role: user.role,
    bankruptcyCount: user.bankruptcyCount,
    imageUrl: user.image ?? undefined,
  };
}

function marketAmmState(rawState: unknown, currentProbability: number): AmmState {
  return normalizeAmmState(rawState, currentProbability);
}

async function getUsersByIds(ids: string[]) {
  if (ids.length === 0) {
    return new Map<string, UserRow>();
  }

  const db = getRequiredDb();
  const rows = await db.select().from(users).where(inArray(users.id, [...new Set(ids)]));
  return new Map(rows.map((user) => [user.id, user]));
}

function buildRecentBets(
  rawTrades: Array<{
    marketId: string;
    userId: string;
    side: TradeSide;
    stakeAmount: string | number;
    createdAt: Date | string;
  }>,
  userNames: Map<string, string>,
) {
  const recentBetsMap = new Map<string, MarketBetSummary[]>();

  for (const trade of rawTrades) {
    const existing = recentBetsMap.get(trade.marketId) ?? [];
    existing.push({
      userId: trade.userId,
      userName: userNames.get(trade.userId) ?? "Unknown",
      side: trade.side,
      amount: parseNumber(trade.stakeAmount),
      createdAt:
        typeof trade.createdAt === "string" ? trade.createdAt : trade.createdAt.toISOString(),
    });
    recentBetsMap.set(trade.marketId, existing);
  }

  return recentBetsMap;
}

async function mapMarketRows(marketRows: MarketRow[]): Promise<Market[]> {
  const db = getRequiredDb();
  const ids = marketRows.map((market) => market.id);
  const chartRows =
    ids.length === 0
      ? []
      : await db
          .select()
          .from(marketChartPoints)
          .where(inArray(marketChartPoints.marketId, ids))
          .orderBy(asc(marketChartPoints.at));
  const tradeRows =
    ids.length === 0
      ? []
      : await db
          .select({
            marketId: trades.marketId,
            userId: trades.userId,
            side: trades.side,
            stakeAmount: trades.stakeAmount,
            createdAt: trades.createdAt,
          })
          .from(trades)
          .where(inArray(trades.marketId, ids))
          .orderBy(desc(trades.createdAt));
  const userMap = await getUsersByIds([
    ...marketRows.flatMap((market) => [market.createdByUserId, market.resolverUserId]),
    ...tradeRows.map((trade) => trade.userId),
  ]);
  const recentBetsMap = buildRecentBets(
    tradeRows,
    new Map(
      [...userMap.values()].map((user) => [
        user.id,
        user.name ?? user.email.split("@")[0] ?? "Unknown",
      ]),
    ),
  );

  const chartMap = new Map<string, Array<{ timestamp: string; probability: number }>>();

  for (const point of chartRows) {
    const list = chartMap.get(point.marketId) ?? [];
    list.push({
      timestamp: point.at.toISOString(),
      probability: parseNumber(point.probability),
    });
    chartMap.set(point.marketId, list);
  }

  return marketRows.map((market) => {
    const creator = userMap.get(market.createdByUserId);
    const resolver = userMap.get(market.resolverUserId);

    if (!creator || !resolver) {
      throw new Error("Market references a missing user.");
    }

    return {
      id: market.id,
      slug: market.slug,
      question: market.question,
      description: market.description,
      status: market.status,
      category: market.category,
      closeTime: market.closeTime.toISOString(),
      resolveByTime: market.resolveByTime.toISOString(),
      resolutionCriteria: market.resolutionCriteria,
      resolutionSource: market.resolutionSource,
      resolutionNotes: market.resolutionNotes ?? undefined,
      resolver: userToSummary(resolver),
      createdBy: userToSummary(creator),
      currentProbability: parseNumber(market.currentProbability),
      ammState: marketAmmState(market.ammState, parseNumber(market.currentProbability)),
      volume: parseNumber(market.volume),
      tradersCount: market.tradersCount,
      chart:
        chartMap.get(market.id) ??
        [
          {
            timestamp: market.createdAt.toISOString(),
            probability: parseNumber(market.currentProbability),
          },
        ],
      recentBets: recentBetsMap.get(market.id) ?? [],
    };
  });
}

async function getMarketRowById(marketId: string) {
  const db = getRequiredDb();
  const rows = await db.select().from(markets).where(eq(markets.id, marketId)).limit(1);
  return rows[0];
}

async function getMarketRowBySlug(slug: string) {
  const db = getRequiredDb();
  const rows = await db.select().from(markets).where(eq(markets.slug, slug)).limit(1);
  return rows[0];
}

async function getUserRowById(userId: string) {
  const db = getRequiredDb();
  const rows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return rows[0];
}

function ensureOpenMarket(market: MarketRow) {
  if (market.status !== "open") {
    throw new Error("This market is not open for trading.");
  }
}

function ensureAdminOrResolver(actor: UserRow, market: MarketRow) {
  if (actor.role === "admin" || actor.id === market.resolverUserId) {
    return;
  }

  throw new Error("You do not have permission to resolve this market.");
}

function ensureAdmin(actor: UserRow) {
  if (actor.isBanned) {
    throw new Error("You do not have permission to perform this action.");
  }

  if (actor.role !== "admin") {
    throw new Error("You do not have permission to perform this action.");
  }
}

function activeAdminCountFromLocalState(state: LocalState) {
  return state.users.filter((user) => user.role === "admin" && !user.isBanned).length;
}

async function activeAdminCountFromDb() {
  const db = getRequiredDb();
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users)
    .where(and(eq(users.role, "admin"), eq(users.isBanned, false)));

  return rows[0]?.count ?? 0;
}

function ensureUnresolvedMarketStatus(status: Market["status"]) {
  if (status === "resolved" || status === "canceled") {
    throw new Error("Resolved or canceled markets cannot be reopened or closed.");
  }
}

function adminMarketSortValue(market: {
  status: Market["status"];
  closeTime: string;
  resolveByTime: string;
}) {
  return market.status === "open" ? market.closeTime : market.resolveByTime;
}

function sortAdminMarkets<T extends Market>(markets: T[]) {
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

    const timeDiff =
      new Date(adminMarketSortValue(a)).getTime() - new Date(adminMarketSortValue(b)).getTime();

    if (timeDiff !== 0) {
      return timeDiff;
    }

    return a.question.localeCompare(b.question);
  });
}

async function autoCloseExpiredDbMarkets() {
  const db = getRequiredDb();
  await db
    .update(markets)
    .set({
      status: "closed",
      updatedAt: new Date(),
    })
    .where(and(eq(markets.status, "open"), sql`${markets.closeTime} <= now()`));
}

function positionCostBasis(position: PositionRow) {
  return (
    parseNumber(position.yesShares) * parseNumber(position.avgYesPrice) +
    parseNumber(position.noShares) * parseNumber(position.avgNoPrice)
  );
}

function settlementPerShare(
  outcome: ResolutionPayload["outcome"],
  percentYes = 0.5,
) {
  if (outcome === "yes") {
    return { yes: 1, no: 0 };
  }

  if (outcome === "no") {
    return { yes: 0, no: 1 };
  }

  if (outcome === "partial") {
    return { yes: percentYes, no: 1 - percentYes };
  }

  return { yes: 0, no: 0 };
}

function localUserToSummary(user: LocalUser): UserSummary {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    bankruptcyCount: user.bankruptcyCount,
  };
}

export function formatLeaderboardUserName(user: UserSummary) {
  if (user.bankruptcyCount <= 0) {
    return user.name;
  }

  return `${user.name} (bankruptcy x${user.bankruptcyCount})`;
}

function mapLocalMarket(state: LocalState, market: LocalMarket): Market {
  const creator = state.users.find((user) => user.id === market.createdByUserId);
  const resolver = state.users.find((user) => user.id === market.resolverUserId);

  if (!creator || !resolver) {
    throw new Error("Local market references a missing user.");
  }

  const recentBets = state.trades
    .filter((trade) => trade.marketId === market.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((trade) => {
      const user = state.users.find((entry) => entry.id === trade.userId);

      return {
        userId: trade.userId,
        userName: user?.name ?? "Unknown",
        side: trade.side,
        amount: trade.stakeAmount,
        createdAt: trade.createdAt,
      };
    });

  return {
    id: market.id,
    slug: market.slug,
    question: market.question,
    description: market.description,
    status: market.status,
    category: market.category,
    closeTime: market.closeTime,
    resolveByTime: market.resolveByTime,
    resolutionCriteria: market.resolutionCriteria,
    resolutionSource: market.resolutionSource,
    resolutionNotes: market.resolutionNotes,
    resolver: localUserToSummary(resolver),
    createdBy: localUserToSummary(creator),
    currentProbability: market.currentProbability,
    ammState: marketAmmState(market.ammState, market.currentProbability),
    volume: market.volume,
    tradersCount: market.tradersCount,
    chart:
      state.marketChartPoints
        .filter((point) => point.marketId === market.id)
        .sort((a, b) => a.at.localeCompare(b.at))
        .map((point) => ({
          timestamp: point.at,
          probability: point.probability,
        })) ?? [],
    recentBets,
  };
}

function getLocalPosition(
  state: LocalState,
  userId: string,
  marketId: string,
) {
  return state.positions.find(
    (position) => position.userId === userId && position.marketId === marketId,
  );
}

function buildLocalPortfolio(state: LocalState, user: LocalUser): PortfolioSnapshot {
  const userPositions = state.positions.filter((position) => position.userId === user.id);
  const positionsView = userPositions
    .map((position) => {
      const market = state.markets.find((entry) => entry.id === position.marketId);
      if (!market) {
        return null;
      }

      return {
        marketId: market.id,
        marketSlug: market.slug,
        question: market.question,
        yesShares: position.yesShares,
        noShares: position.noShares,
        avgYesPrice: position.avgYesPrice,
        avgNoPrice: position.avgNoPrice,
        currentProbability: market.currentProbability,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
    .filter((entry) => entry.yesShares > 0 || entry.noShares > 0);

  const estimatedValue =
    user.cashBalance +
    positionsView.reduce(
      (sum, position) =>
        sum +
        position.yesShares * position.currentProbability +
        position.noShares * (1 - position.currentProbability),
      0,
    );

  return {
    user: localUserToSummary(user),
    cashBalance: user.cashBalance,
    estimatedValue,
    realizedPnl: userPositions.reduce((sum, position) => sum + position.realizedPnl, 0),
    positions: positionsView,
  };
}

export async function listMarkets() {
  if (isLocalMode()) {
    const state = await readLocalState();
    return [...state.markets]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((market) => mapLocalMarket(state, market));
  }

  if (isDemoMode()) {
    return demoMarkets;
  }

  await autoCloseExpiredDbMarkets();
  const db = getRequiredDb();
  const rows = await db.select().from(markets).orderBy(desc(markets.createdAt));
  return mapMarketRows(rows);
}

export async function listFeaturedMarkets() {
  const markets = await listMarkets();
  return markets.slice(0, 3);
}

export async function getMarketBySlug(slug: string) {
  if (isLocalMode()) {
    const state = await readLocalState();
    const market = state.markets.find((entry) => entry.slug === slug);
    return market ? mapLocalMarket(state, market) : undefined;
  }

  if (isDemoMode()) {
    return demoMarkets.find((market) => market.slug === slug);
  }

  await autoCloseExpiredDbMarkets();
  const row = await getMarketRowBySlug(slug);
  if (!row) {
    return undefined;
  }

  return (await mapMarketRows([row]))[0];
}

export async function getMarketById(id: string) {
  if (isLocalMode()) {
    const state = await readLocalState();
    const market = state.markets.find((entry) => entry.id === id);
    return market ? mapLocalMarket(state, market) : undefined;
  }

  if (isDemoMode()) {
    return demoMarkets.find((market) => market.id === id);
  }

  await autoCloseExpiredDbMarkets();
  const row = await getMarketRowById(id);
  if (!row) {
    return undefined;
  }

  return (await mapMarketRows([row]))[0];
}

export async function listAdminMarkets() {
  if (isLocalMode()) {
    const state = await readLocalState();
    return sortAdminMarkets(state.markets.map((market) => mapLocalMarket(state, market)));
  }

  if (isDemoMode()) {
    return sortAdminMarkets(demoMarkets);
  }

  await autoCloseExpiredDbMarkets();
  const db = getRequiredDb();
  const rows = await db.select().from(markets);

  return sortAdminMarkets(await mapMarketRows(rows));
}

export async function listAdminUsers(): Promise<AdminUserRecord[]> {
  if (isLocalMode()) {
    const state = await readLocalState();
    return [...state.users]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isBanned: user.isBanned,
        startingBalance: user.startingBalance,
        cashBalance: user.cashBalance,
        bankruptcyCount: user.bankruptcyCount,
        createdAt: user.createdAt,
      }));
  }

  if (isDemoMode()) {
    return [];
  }

  const db = getRequiredDb();
  const rows = await db.select().from(users).orderBy(asc(users.name), asc(users.email));
  return rows.map((user) => ({
    id: user.id,
    name: user.name ?? user.email.split("@")[0] ?? "Unknown",
    email: user.email,
    role: user.role,
    isBanned: user.isBanned,
    startingBalance: parseNumber(user.startingBalance),
    cashBalance: parseNumber(user.cashBalance),
    bankruptcyCount: user.bankruptcyCount,
    createdAt: user.createdAt.toISOString(),
  }));
}

export async function createMarket(input: CreateMarketInput & { resolverUserId?: string }, actorUserId: string) {
  if (isLocalMode()) {
    const parsed = createMarketSchema.parse(input);

    return withLocalState(async (state) => {
      const actor = state.users.find((user) => user.id === actorUserId);
      if (!actor) {
        throw new Error("User not found.");
      }

      const resolverId = parsed.resolverUserId ?? actorUserId;
      const resolver = state.users.find((user) => user.id === resolverId);
      if (!resolver) {
        throw new Error("Resolver not found.");
      }

      const createdAt = nowIso();
      const market: LocalMarket = {
        id: randomUUID(),
        slug: makeUniqueSlug(slugify(parsed.question)),
        question: parsed.question,
        description: parsed.description ?? "",
        category: parsed.category,
        status: "open",
        closeTime: parsed.closeTime,
        resolveByTime: parsed.resolveByTime,
        resolutionCriteria: parsed.resolutionCriteria,
        resolutionSource: parsed.resolutionSource ?? "",
        createdByUserId: actorUserId,
        resolverUserId: resolverId,
        currentProbability: 0.5,
        ammState: createCpmmState(0.5),
        volume: 0,
        tradersCount: 0,
        createdAt,
        updatedAt: createdAt,
      };

      state.markets.push(market);
      state.marketChartPoints.push({
        id: randomUUID(),
        marketId: market.id,
        probability: 0.5,
        at: createdAt,
      });

      return mapLocalMarket(state, market);
    });
  }

  if (isDemoMode()) {
    const parsed = createMarketSchema.parse(input);

    return {
      id: randomUUID(),
      slug: slugify(parsed.question),
      ...parsed,
      description: parsed.description ?? "",
      resolutionSource: parsed.resolutionSource ?? "",
      status: "open",
      currentProbability: 0.5,
      ammState: createCpmmState(0.5),
    };
  }

  const parsed = createMarketSchema.parse(input);
  const db = getRequiredDb();
  const creator = await getUserRowById(actorUserId);

  if (!creator) {
    throw new Error("User not found.");
  }

  const resolverId = parsed.resolverUserId ?? actorUserId;
  const resolver = await getUserRowById(resolverId);

  if (!resolver) {
    throw new Error("Resolver not found.");
  }

  const slug = makeUniqueSlug(slugify(parsed.question));

  const [inserted] = await db
    .insert(markets)
    .values({
      slug,
      question: parsed.question,
      description: parsed.description ?? "",
      category: parsed.category,
      status: "open",
      closeTime: new Date(parsed.closeTime),
      resolveByTime: new Date(parsed.resolveByTime),
      resolutionCriteria: parsed.resolutionCriteria,
      resolutionSource: parsed.resolutionSource ?? "",
      createdByUserId: actorUserId,
      resolverUserId: resolverId,
      currentProbability: "0.5000",
      volume: "0.00",
      tradersCount: 0,
      ammState: createCpmmState(0.5),
    })
    .returning();

  await db.insert(marketChartPoints).values({
    marketId: inserted.id,
    probability: "0.5000",
  });

  return (await mapMarketRows([inserted]))[0];
}

export async function updateAdminMarket(
  marketId: string,
  input: {
    question: string;
    description: string;
    category: string;
    closeTime: string;
    resolveByTime: string;
    resolutionCriteria: string;
    resolutionSource: string;
    resolverUserId: string;
  },
  actorUserId: string,
) {
  const parsed = adminMarketUpdateSchema.parse(input);

  if (isLocalMode()) {
    return withLocalState(async (state) => {
      const actor = state.users.find((entry) => entry.id === actorUserId);
      const market = state.markets.find((entry) => entry.id === marketId);
      const resolver = state.users.find((entry) => entry.id === parsed.resolverUserId);

      if (!actor || actor.role !== "admin") {
        throw new Error("You do not have permission to perform this action.");
      }

      if (!market) {
        throw new Error("Market not found.");
      }

      if (!resolver) {
        throw new Error("Resolver not found.");
      }

      market.question = parsed.question;
      market.description = parsed.description ?? "";
      market.category = parsed.category;
      market.closeTime = parsed.closeTime;
      market.resolveByTime = parsed.resolveByTime;
      market.resolutionCriteria = parsed.resolutionCriteria;
      market.resolutionSource = parsed.resolutionSource ?? "";
      market.resolverUserId = parsed.resolverUserId;
      market.updatedAt = nowIso();

      return mapLocalMarket(state, market);
    });
  }

  if (isDemoMode()) {
    throw new Error("Market editing is unavailable in demo mode.");
  }

  const db = getRequiredDb();
  const actor = await getUserRowById(actorUserId);
  const market = await getMarketRowById(marketId);
  const resolver = await getUserRowById(parsed.resolverUserId);

  if (!actor) {
    throw new Error("User not found.");
  }

  ensureAdmin(actor);

  if (!market) {
    throw new Error("Market not found.");
  }

  if (!resolver) {
    throw new Error("Resolver not found.");
  }

  const [updated] = await db
    .update(markets)
    .set({
      question: parsed.question,
      description: parsed.description ?? "",
      category: parsed.category,
      closeTime: new Date(parsed.closeTime),
      resolveByTime: new Date(parsed.resolveByTime),
      resolutionCriteria: parsed.resolutionCriteria,
      resolutionSource: parsed.resolutionSource ?? "",
      resolverUserId: parsed.resolverUserId,
      updatedAt: new Date(),
    })
    .where(eq(markets.id, marketId))
    .returning();

  return (await mapMarketRows([updated]))[0];
}

export async function deleteAdminMarket(marketId: string, actorUserId: string) {
  if (isLocalMode()) {
    return withLocalState(async (state) => {
      const actor = state.users.find((entry) => entry.id === actorUserId);
      const market = state.markets.find((entry) => entry.id === marketId);

      if (!actor || actor.role !== "admin") {
        throw new Error("You do not have permission to perform this action.");
      }

      if (!market) {
        throw new Error("Market not found.");
      }

      const hasTrades = state.trades.some((entry) => entry.marketId === marketId);

      if (hasTrades) {
        throw new Error("Markets with trades cannot be deleted.");
      }

      state.markets = state.markets.filter((entry) => entry.id !== marketId);
      state.positions = state.positions.filter((entry) => entry.marketId !== marketId);
      state.trades = state.trades.filter((entry) => entry.marketId !== marketId);
      state.ledgerEntries = state.ledgerEntries.filter((entry) => entry.marketId !== marketId);
      state.resolutionAuditLogs = state.resolutionAuditLogs.filter(
        (entry) => entry.marketId !== marketId,
      );
      state.marketChartPoints = state.marketChartPoints.filter(
        (entry) => entry.marketId !== marketId,
      );
    });
    return;
  }

  if (isDemoMode()) {
    throw new Error("Market deletion is unavailable in demo mode.");
  }

  const db = getRequiredDb();
  const actor = await getUserRowById(actorUserId);
  const market = await getMarketRowById(marketId);

  if (!actor) {
    throw new Error("User not found.");
  }

  ensureAdmin(actor);

  if (!market) {
    throw new Error("Market not found.");
  }

  const tradeCountRows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(trades)
    .where(eq(trades.marketId, marketId));

  if ((tradeCountRows[0]?.count ?? 0) > 0) {
    throw new Error("Markets with trades cannot be deleted.");
  }

  await db.delete(markets).where(eq(markets.id, marketId));
}

export async function updateAdminUser(
  userId: string,
  input: {
    name: string;
    email: string;
    role: "member" | "admin";
    isBanned: boolean;
    startingBalance: number;
    cashBalance: number;
    bankruptcyCount: number;
  },
  actorUserId: string,
): Promise<AdminUserRecord> {
  const parsed = adminUserUpdateSchema.parse(input);

  if (isLocalMode()) {
    return withLocalState(async (state) => {
      const actor = state.users.find((entry) => entry.id === actorUserId);
      const user = state.users.find((entry) => entry.id === userId);

      if (!actor || actor.role !== "admin") {
        throw new Error("You do not have permission to perform this action.");
      }

      if (!user) {
        throw new Error("User not found.");
      }

      const duplicateEmail = state.users.find(
        (entry) => entry.id !== userId && entry.email.toLowerCase() === parsed.email.toLowerCase(),
      );

      if (duplicateEmail) {
        throw new Error("Email is already in use.");
      }

      const wouldRemoveLastActiveAdmin =
        user.role === "admin" &&
        !user.isBanned &&
        (parsed.role !== "admin" || parsed.isBanned);

      if (wouldRemoveLastActiveAdmin && activeAdminCountFromLocalState(state) <= 1) {
        throw new Error("At least one active admin must remain.");
      }

      user.name = parsed.name;
      user.email = parsed.email.toLowerCase();
      user.role = parsed.role;
      user.isBanned = parsed.isBanned;
      user.startingBalance = parsed.startingBalance;
      user.cashBalance = parsed.cashBalance;
      user.bankruptcyCount = parsed.bankruptcyCount;

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isBanned: user.isBanned,
        startingBalance: user.startingBalance,
        cashBalance: user.cashBalance,
        bankruptcyCount: user.bankruptcyCount,
        createdAt: user.createdAt,
      };
    });
  }

  if (isDemoMode()) {
    throw new Error("User editing is unavailable in demo mode.");
  }

  const db = getRequiredDb();
  const actor = await getUserRowById(actorUserId);
  const target = await getUserRowById(userId);

  if (!actor) {
    throw new Error("User not found.");
  }

  ensureAdmin(actor);

  if (!target) {
    throw new Error("User not found.");
  }

  const duplicate = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, parsed.email.toLowerCase()));

  if (duplicate.some((entry) => entry.id !== userId)) {
    throw new Error("Email is already in use.");
  }

  const wouldRemoveLastActiveAdmin =
    target.role === "admin" &&
    !target.isBanned &&
    (parsed.role !== "admin" || parsed.isBanned);

  if (wouldRemoveLastActiveAdmin && (await activeAdminCountFromDb()) <= 1) {
    throw new Error("At least one active admin must remain.");
  }

  const [updated] = await db
    .update(users)
    .set({
      name: parsed.name,
      email: parsed.email.toLowerCase(),
      role: parsed.role,
      isBanned: parsed.isBanned,
      startingBalance: parsed.startingBalance.toFixed(2),
      cashBalance: parsed.cashBalance.toFixed(2),
      bankruptcyCount: parsed.bankruptcyCount,
    })
    .where(eq(users.id, userId))
    .returning();

  return {
    id: updated.id,
    name: updated.name ?? updated.email.split("@")[0] ?? "Unknown",
    email: updated.email,
    role: updated.role,
    isBanned: updated.isBanned,
    startingBalance: parseNumber(updated.startingBalance),
    cashBalance: parseNumber(updated.cashBalance),
    bankruptcyCount: updated.bankruptcyCount,
    createdAt: updated.createdAt.toISOString(),
  };
}

export async function previewTrade(input: {
  marketId: string;
  side: TradeSide;
  amount: number;
}) {
  const parsed = tradeSchema.parse(input);
  const market = await getMarketById(parsed.marketId);

  if (!market) {
    throw new Error("Market not found.");
  }

  return quoteTrade({
    side: parsed.side,
    amount: parsed.amount,
    ammState: market.ammState,
  });
}

export async function executeTrade(input: {
  marketId: string;
  side: TradeSide;
  amount: number;
  actorUserId: string;
}): Promise<{ quote: TradeQuote }> {
  const parsed = tradeSchema.parse(input);

  if (isLocalMode()) {
    return withLocalState(async (state) => {
      const market = state.markets.find((entry) => entry.id === parsed.marketId);
      const actor = state.users.find((entry) => entry.id === input.actorUserId);

      if (!market) {
        throw new Error("Market not found.");
      }

      if (!actor) {
        throw new Error("User not found.");
      }

      if (market.status === "open" && isPastTime(market.closeTime)) {
        market.status = "closed";
        market.updatedAt = nowIso();
      }

      if (market.status !== "open") {
        throw new Error("This market is not open for trading.");
      }

      const quote = quoteTrade({
        side: parsed.side,
        amount: parsed.amount,
        ammState: market.ammState,
      });

      let position = getLocalPosition(state, actor.id, market.id);
      const isBuy = parsed.side === "buy_yes" || parsed.side === "buy_no";
      const cashDelta = isBuy ? -parsed.amount : quote.maxPayout;

      if (isBuy && actor.cashBalance < parsed.amount) {
        throw new Error("Insufficient fake cash balance.");
      }

      if (!isBuy) {
        if (!position) {
          throw new Error("You do not have a position to sell.");
        }

        const availableShares =
          parsed.side === "sell_yes" ? position.yesShares : position.noShares;
        if (availableShares + 1e-9 < quote.shares) {
          throw new Error("You do not own enough shares for that sale.");
        }
      }

      actor.cashBalance += cashDelta;

      if (!position) {
        position = {
          id: randomUUID(),
          userId: actor.id,
          marketId: market.id,
          yesShares: 0,
          noShares: 0,
          avgYesPrice: 0,
          avgNoPrice: 0,
          realizedPnl: 0,
          updatedAt: nowIso(),
        };
        state.positions.push(position);
      }

      if (parsed.side === "buy_yes") {
        const totalCost = position.yesShares * position.avgYesPrice + parsed.amount;
        position.yesShares += quote.shares;
        position.avgYesPrice = totalCost / position.yesShares;
      } else if (parsed.side === "buy_no") {
        const totalCost = position.noShares * position.avgNoPrice + parsed.amount;
        position.noShares += quote.shares;
        position.avgNoPrice = totalCost / position.noShares;
      } else if (parsed.side === "sell_yes") {
        position.yesShares -= quote.shares;
        position.realizedPnl += quote.maxPayout - quote.shares * position.avgYesPrice;
        if (position.yesShares <= 1e-9) {
          position.yesShares = 0;
          position.avgYesPrice = 0;
        }
      } else {
        position.noShares -= quote.shares;
        position.realizedPnl += quote.maxPayout - quote.shares * position.avgNoPrice;
        if (position.noShares <= 1e-9) {
          position.noShares = 0;
          position.avgNoPrice = 0;
        }
      }

      position.updatedAt = nowIso();

      state.trades.push({
        id: randomUUID(),
        marketId: market.id,
        userId: actor.id,
        side: parsed.side,
        stakeAmount: parsed.amount,
        avgPrice: quote.avgPrice,
        sharesReceived: quote.shares,
        probabilityBefore: quote.probabilityBefore,
        probabilityAfter: quote.probabilityAfter,
        createdAt: nowIso(),
      });

      state.ledgerEntries.push({
        id: randomUUID(),
        userId: actor.id,
        marketId: market.id,
        tradeId: state.trades[state.trades.length - 1]?.id,
        type: isBuy ? "trade_debit" : "trade_credit",
        amount: cashDelta,
        note: parsed.side,
        createdAt: nowIso(),
      });

      market.currentProbability = quote.probabilityAfter;
      market.ammState = quote.nextAmmState;
      market.volume += parsed.amount;
      market.updatedAt = nowIso();
      const uniqueTraders = new Set(
        state.trades.filter((trade) => trade.marketId === market.id).map((trade) => trade.userId),
      );
      market.tradersCount = uniqueTraders.size;
      state.marketChartPoints.push({
        id: randomUUID(),
        marketId: market.id,
        probability: quote.probabilityAfter,
        at: nowIso(),
      });

      return { quote };
    });
  }

  if (isDemoMode()) {
    return {
      quote: await previewTrade(parsed),
    };
  }

  const db = getRequiredDb();

  return db.transaction(async (tx) => {
    await tx.execute(sql`select id from ${markets} where ${markets.id} = ${parsed.marketId} for update`);
    await tx.execute(sql`select id from ${users} where ${users.id} = ${input.actorUserId} for update`);

    const market = (await tx.select().from(markets).where(eq(markets.id, parsed.marketId)).limit(1))[0];
    const actor = (await tx.select().from(users).where(eq(users.id, input.actorUserId)).limit(1))[0];

    if (!market) {
      throw new Error("Market not found.");
    }

    if (!actor) {
      throw new Error("User not found.");
    }

    if (market.status === "open" && isPastTime(market.closeTime)) {
      await tx
        .update(markets)
        .set({
          status: "closed",
          updatedAt: new Date(),
        })
        .where(eq(markets.id, parsed.marketId));
      throw new Error("This market is not open for trading.");
    }

    ensureOpenMarket(market);

    const quote = quoteTrade({
      side: parsed.side,
      amount: parsed.amount,
      ammState: marketAmmState(market.ammState, parseNumber(market.currentProbability)),
    });

    const position =
      (
        await tx
          .select()
          .from(positions)
          .where(
            and(
              eq(positions.marketId, parsed.marketId),
              eq(positions.userId, input.actorUserId),
            ),
          )
          .limit(1)
      )[0] ?? null;

    const cashBalance = parseNumber(actor.cashBalance);
    const isBuy = parsed.side === "buy_yes" || parsed.side === "buy_no";

    if (isBuy && cashBalance < parsed.amount) {
      throw new Error("Insufficient fake cash balance.");
    }

    if (!isBuy) {
      if (!position) {
        throw new Error("You do not have a position to sell.");
      }

      const availableShares =
        parsed.side === "sell_yes"
          ? parseNumber(position.yesShares)
          : parseNumber(position.noShares);

      if (availableShares + 1e-9 < quote.shares) {
        throw new Error("You do not own enough shares for that sale.");
      }
    }

    const [trade] = await tx
      .insert(trades)
      .values({
        marketId: parsed.marketId,
        userId: input.actorUserId,
        side: parsed.side,
        stakeAmount: parsed.amount.toFixed(2),
        avgPrice: quote.avgPrice.toFixed(4),
        sharesReceived: quote.shares.toFixed(4),
        probabilityBefore: quote.probabilityBefore.toFixed(4),
        probabilityAfter: quote.probabilityAfter.toFixed(4),
      })
      .returning();

    const cashCredit = isBuy ? parsed.amount : quote.maxPayout;
    const nextCash = isBuy ? cashBalance - parsed.amount : cashBalance + quote.maxPayout;

    await tx
      .update(users)
      .set({ cashBalance: nextCash.toFixed(2) })
      .where(eq(users.id, actor.id));

    const existingPosition = position ?? {
      id: randomUUID(),
      userId: input.actorUserId,
      marketId: parsed.marketId,
      yesShares: "0",
      noShares: "0",
      avgYesPrice: "0",
      avgNoPrice: "0",
      realizedPnl: "0",
      updatedAt: new Date(),
    };

    let yesShares = parseNumber(existingPosition.yesShares);
    let noShares = parseNumber(existingPosition.noShares);
    let avgYesPrice = parseNumber(existingPosition.avgYesPrice);
    let avgNoPrice = parseNumber(existingPosition.avgNoPrice);
    let realizedPnl = parseNumber(existingPosition.realizedPnl);

    if (parsed.side === "buy_yes") {
      const totalCost = yesShares * avgYesPrice + parsed.amount;
      yesShares += quote.shares;
      avgYesPrice = totalCost / yesShares;
    } else if (parsed.side === "buy_no") {
      const totalCost = noShares * avgNoPrice + parsed.amount;
      noShares += quote.shares;
      avgNoPrice = totalCost / noShares;
    } else if (parsed.side === "sell_yes") {
      yesShares -= quote.shares;
      realizedPnl += quote.maxPayout - quote.shares * avgYesPrice;
      if (yesShares <= 1e-9) {
        yesShares = 0;
        avgYesPrice = 0;
      }
    } else {
      noShares -= quote.shares;
      realizedPnl += quote.maxPayout - quote.shares * avgNoPrice;
      if (noShares <= 1e-9) {
        noShares = 0;
        avgNoPrice = 0;
      }
    }

    if (position) {
      await tx
        .update(positions)
        .set({
          yesShares: yesShares.toFixed(4),
          noShares: noShares.toFixed(4),
          avgYesPrice: avgYesPrice.toFixed(4),
          avgNoPrice: avgNoPrice.toFixed(4),
          realizedPnl: realizedPnl.toFixed(2),
          updatedAt: new Date(),
        })
        .where(eq(positions.id, position.id));
    } else {
      await tx.insert(positions).values({
        userId: input.actorUserId,
        marketId: parsed.marketId,
        yesShares: yesShares.toFixed(4),
        noShares: noShares.toFixed(4),
        avgYesPrice: avgYesPrice.toFixed(4),
        avgNoPrice: avgNoPrice.toFixed(4),
        realizedPnl: realizedPnl.toFixed(2),
      });
    }

    const note =
      parsed.side === "buy_yes" || parsed.side === "buy_no"
        ? `Trade debit for ${parsed.side}`
        : `Trade credit for ${parsed.side}`;

    await tx.insert(ledgerEntries).values({
      userId: input.actorUserId,
      marketId: parsed.marketId,
      tradeId: trade.id,
      type: isBuy ? "trade_debit" : "trade_credit",
      amount: (isBuy ? -parsed.amount : cashCredit).toFixed(2),
      note,
    });

    const hasTradedBefore = await tx
      .select({ id: trades.id })
      .from(trades)
      .where(
        and(eq(trades.marketId, parsed.marketId), eq(trades.userId, input.actorUserId)),
      )
      .limit(2);

    await tx
      .update(markets)
      .set({
        currentProbability: quote.probabilityAfter.toFixed(4),
        volume: (parseNumber(market.volume) + parsed.amount).toFixed(2),
        tradersCount:
          hasTradedBefore.length > 1 ? market.tradersCount : market.tradersCount + 1,
        ammState: quote.nextAmmState,
        updatedAt: new Date(),
      })
      .where(eq(markets.id, parsed.marketId));

    await tx.insert(marketChartPoints).values({
      marketId: parsed.marketId,
      probability: quote.probabilityAfter.toFixed(4),
    });

    return { quote };
  });
}

export async function closeMarket(id: string, actorUserId: string) {
  if (isLocalMode()) {
    return withLocalState(async (state) => {
      const market = state.markets.find((entry) => entry.id === id);
      const actor = state.users.find((entry) => entry.id === actorUserId);

      if (!market) {
        throw new Error("Market not found.");
      }

      if (!actor) {
        throw new Error("User not found.");
      }

      if (!(actor.role === "admin" || actor.id === market.resolverUserId)) {
        throw new Error("You do not have permission to resolve this market.");
      }

      ensureUnresolvedMarketStatus(market.status);

      if (market.status === "closed") {
        return mapLocalMarket(state, market);
      }

      market.status = "closed";
      market.updatedAt = nowIso();
      state.resolutionAuditLogs.push({
        id: randomUUID(),
        marketId: id,
        actorUserId,
        action: "close",
        payloadJson: {},
        createdAt: nowIso(),
      });

      return mapLocalMarket(state, market);
    });
  }

  if (isDemoMode()) {
    const market = demoMarkets.find((entry) => entry.id === id);

    if (!market) {
      throw new Error("Market not found.");
    }

    return {
      ...market,
      status: "closed" as const,
    };
  }

  const db = getRequiredDb();
  const market = await getMarketRowById(id);
  const actor = await getUserRowById(actorUserId);

  if (!market) {
    throw new Error("Market not found.");
  }

  if (!actor) {
    throw new Error("User not found.");
  }

  ensureAdminOrResolver(actor, market);
  ensureUnresolvedMarketStatus(market.status);

  if (market.status === "closed") {
    return (await mapMarketRows([market]))[0];
  }

  const [updated] = await db
    .update(markets)
    .set({
      status: "closed",
      updatedAt: new Date(),
    })
    .where(eq(markets.id, id))
    .returning();

  await db.insert(resolutionAuditLogs).values({
    marketId: id,
    actorUserId,
    action: "close",
    payloadJson: {},
  });

  return (await mapMarketRows([updated]))[0];
}

export async function setAdminMarketStatus(
  marketId: string,
  input: { status: "open" | "closed" },
  actorUserId: string,
) {
  const parsed = marketStatusMutationSchema.parse(input);

  if (isLocalMode()) {
    return withLocalState(async (state) => {
      const actor = state.users.find((entry) => entry.id === actorUserId);
      const market = state.markets.find((entry) => entry.id === marketId);

      if (!actor) {
        throw new Error("User not found.");
      }

      if (!market) {
        throw new Error("Market not found.");
      }

      if (actor.role !== "admin") {
        throw new Error("You do not have permission to perform this action.");
      }
      ensureUnresolvedMarketStatus(market.status);

      market.status = parsed.status;
      market.updatedAt = nowIso();

      return mapLocalMarket(state, market);
    });
  }

  if (isDemoMode()) {
    const market = demoMarkets.find((entry) => entry.id === marketId);
    if (!market) {
      throw new Error("Market not found.");
    }

    ensureUnresolvedMarketStatus(market.status);

    return {
      ...market,
      status: parsed.status,
    };
  }

  const db = getRequiredDb();
  const actor = await getUserRowById(actorUserId);
  const market = await getMarketRowById(marketId);

  if (!actor) {
    throw new Error("User not found.");
  }

  ensureAdmin(actor);

  if (!market) {
    throw new Error("Market not found.");
  }

  ensureUnresolvedMarketStatus(market.status);

  const [updated] = await db
    .update(markets)
    .set({
      status: parsed.status,
      updatedAt: new Date(),
    })
    .where(eq(markets.id, marketId))
    .returning();

  return (await mapMarketRows([updated]))[0];
}

export async function resolveMarket(id: string, payload: ResolutionPayload, actorUserId: string) {
  const parsed = resolutionSchema.parse(payload);

  if (parsed.outcome === "partial" && parsed.percentYes === undefined) {
    throw new Error("Partial resolutions require percentYes.");
  }

  if (isLocalMode()) {
    return withLocalState(async (state) => {
      const market = state.markets.find((entry) => entry.id === id);
      const actor = state.users.find((entry) => entry.id === actorUserId);

      if (!market) {
        throw new Error("Market not found.");
      }

      if (!actor) {
        throw new Error("User not found.");
      }

      if (!(actor.role === "admin" || actor.id === market.resolverUserId)) {
        throw new Error("You do not have permission to resolve this market.");
      }

      if (market.status === "resolved" || market.status === "canceled") {
        throw new Error("This market has already been resolved.");
      }

      const payoutRates = settlementPerShare(parsed.outcome, parsed.percentYes);
      const affectedPositions = state.positions.filter((position) => position.marketId === id);

      for (const position of affectedPositions) {
        const user = state.users.find((entry) => entry.id === position.userId);
        if (!user) {
          continue;
        }

        const costBasis = positionCostBasis(position as unknown as PositionRow);
        const payout =
          parsed.outcome === "canceled"
            ? costBasis
            : position.yesShares * payoutRates.yes + position.noShares * payoutRates.no;

        user.cashBalance += payout;
        position.realizedPnl += payout - costBasis;
        position.yesShares = 0;
        position.noShares = 0;
        position.avgYesPrice = 0;
        position.avgNoPrice = 0;
        position.updatedAt = nowIso();

        state.ledgerEntries.push({
          id: randomUUID(),
          userId: user.id,
          marketId: id,
          type: parsed.outcome === "canceled" ? "market_refund" : "market_payout",
          amount: payout,
          note: parsed.outcome === "canceled" ? "Canceled market refund" : `Settlement ${parsed.outcome}`,
          createdAt: nowIso(),
        });
      }

      market.status = parsed.outcome === "canceled" ? "canceled" : "resolved";
      market.resolutionOutcome = parsed.outcome;
      market.resolutionPercentYes = parsed.percentYes;
      market.resolutionNotes = parsed.notes || undefined;
      market.resolvedAt = nowIso();
      market.updatedAt = nowIso();

      state.resolutionAuditLogs.push({
        id: randomUUID(),
        marketId: id,
        actorUserId,
        action: parsed.outcome === "canceled" ? "cancel" : "resolve",
        payloadJson: {
          outcome: parsed.outcome,
          notes: parsed.notes,
          percentYes: parsed.percentYes,
          evidenceUrl: parsed.evidenceUrl || undefined,
        },
        createdAt: nowIso(),
      });

      return mapLocalMarket(state, market);
    });
  }

  if (isDemoMode()) {
    const market = demoMarkets.find((entry) => entry.id === id);

    if (!market) {
      throw new Error("Market not found.");
    }

    return {
      ...market,
      status: parsed.outcome === "canceled" ? "canceled" : "resolved",
      resolutionOutcome: parsed.outcome,
      resolutionPercentYes: parsed.percentYes,
      resolutionNotes: parsed.notes || undefined,
    };
  }

  const db = getRequiredDb();

  await db.transaction(async (tx) => {
    await tx.execute(sql`select id from ${markets} where ${markets.id} = ${id} for update`);

    const market = (await tx.select().from(markets).where(eq(markets.id, id)).limit(1))[0];
    const actor = (await tx.select().from(users).where(eq(users.id, actorUserId)).limit(1))[0];

    if (!market) {
      throw new Error("Market not found.");
    }

    if (!actor) {
      throw new Error("User not found.");
    }

    if (market.status === "resolved" || market.status === "canceled") {
      throw new Error("This market has already been resolved.");
    }

    ensureAdminOrResolver(actor, market);

    const marketPositions = await tx
      .select()
      .from(positions)
      .where(and(eq(positions.marketId, id), isNotNull(positions.id)));

    const payoutRates = settlementPerShare(parsed.outcome, parsed.percentYes);

    for (const position of marketPositions) {
      await tx.execute(sql`select id from ${users} where ${users.id} = ${position.userId} for update`);
      const [user] = await tx.select().from(users).where(eq(users.id, position.userId)).limit(1);

      if (!user) {
        continue;
      }

      const yesShares = parseNumber(position.yesShares);
      const noShares = parseNumber(position.noShares);
      const costBasis = positionCostBasis(position);

      const payout =
        parsed.outcome === "canceled"
          ? costBasis
          : yesShares * payoutRates.yes + noShares * payoutRates.no;

      const realizedPnl =
        parseNumber(position.realizedPnl) + payout - costBasis;

      await tx
        .update(users)
        .set({
          cashBalance: (parseNumber(user.cashBalance) + payout).toFixed(2),
        })
        .where(eq(users.id, user.id));

      await tx.insert(ledgerEntries).values({
        userId: user.id,
        marketId: id,
        type: parsed.outcome === "canceled" ? "market_refund" : "market_payout",
        amount: payout.toFixed(2),
        note:
          parsed.outcome === "canceled"
            ? "Canceled market refund"
            : `Settlement payout for ${parsed.outcome}`,
      });

      await tx
        .update(positions)
        .set({
          yesShares: "0",
          noShares: "0",
          avgYesPrice: "0",
          avgNoPrice: "0",
          realizedPnl: realizedPnl.toFixed(2),
          updatedAt: new Date(),
        })
        .where(eq(positions.id, position.id));
    }

    await tx
      .update(markets)
      .set({
        status: parsed.outcome === "canceled" ? "canceled" : "resolved",
        resolutionOutcome: parsed.outcome,
        resolutionPercentYes:
          parsed.percentYes === undefined ? null : parsed.percentYes.toFixed(4),
        resolutionNotes: parsed.notes ?? null,
        resolvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(markets.id, id));

    await tx.insert(resolutionAuditLogs).values({
      marketId: id,
      actorUserId,
      action: parsed.outcome === "canceled" ? "cancel" : "resolve",
      payloadJson: {
        notes: parsed.notes,
        outcome: parsed.outcome,
        evidenceUrl: parsed.evidenceUrl || undefined,
        percentYes: parsed.percentYes,
      },
    });
  });

  const resolved = await getMarketById(id);
  if (!resolved) {
    throw new Error("Resolved market could not be loaded.");
  }

  return resolved;
}

export async function getPortfolio(userId?: string): Promise<PortfolioSnapshot> {
  if (isLocalMode()) {
    if (!userId) {
      throw new Error("Sign in to view your portfolio.");
    }

    const state = await readLocalState();
    const user = state.users.find((entry) => entry.id === userId);

    if (!user) {
      throw new Error("User not found.");
    }
    return buildLocalPortfolio(state, user);
  }

  if (isDemoMode()) {
    return demoPortfolio;
  }

  if (!userId) {
    throw new Error("Sign in to view your portfolio.");
  }

  const db = getRequiredDb();
  const user = await getUserRowById(userId);

  if (!user) {
    throw new Error("User not found.");
  }

  const userPositions = await db
    .select()
    .from(positions)
    .where(eq(positions.userId, userId));

  const marketIds = userPositions.map((position) => position.marketId);
  const marketRows =
    marketIds.length === 0
      ? []
      : await db.select().from(markets).where(inArray(markets.id, marketIds));
  const marketMap = new Map(marketRows.map((market) => [market.id, market]));

  const positionsView = userPositions
    .map((position) => {
      const market = marketMap.get(position.marketId);

      if (!market) {
        return null;
      }

      return {
        marketId: market.id,
        marketSlug: market.slug,
        question: market.question,
        yesShares: parseNumber(position.yesShares),
        noShares: parseNumber(position.noShares),
        avgYesPrice: parseNumber(position.avgYesPrice),
        avgNoPrice: parseNumber(position.avgNoPrice),
        currentProbability: parseNumber(market.currentProbability),
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
    .filter((entry) => entry.yesShares > 0 || entry.noShares > 0);

  const estimatedValue =
    parseNumber(user.cashBalance) +
    positionsView.reduce(
      (sum, position) =>
        sum +
        position.yesShares * position.currentProbability +
        position.noShares * (1 - position.currentProbability),
      0,
    );

  return {
    user: userToSummary(user),
    cashBalance: parseNumber(user.cashBalance),
    estimatedValue,
    realizedPnl: userPositions.reduce(
      (sum, position) => sum + parseNumber(position.realizedPnl),
      0,
    ),
    positions: positionsView,
  };
}

export async function declareBankruptcy(actorUserId: string): Promise<PortfolioSnapshot> {
  if (isLocalMode()) {
    return withLocalState(async (state) => {
      const actor = state.users.find((user) => user.id === actorUserId);

      if (!actor) {
        throw new Error("User not found.");
      }

      const removedPositions = state.positions.filter((position) => position.userId === actor.id);
      const previousCashBalance = actor.cashBalance;
      const removedPositionCount = removedPositions.length;

      state.positions = state.positions.filter((position) => position.userId !== actor.id);
      actor.cashBalance = actor.startingBalance;
      actor.bankruptcyCount += 1;

      state.ledgerEntries.push({
        id: randomUUID(),
        userId: actor.id,
        type: "manual_adjustment",
        amount: actor.startingBalance - previousCashBalance,
        note: `Bankruptcy reset #${actor.bankruptcyCount}; cleared ${removedPositionCount} positions`,
        createdAt: nowIso(),
      });

      return buildLocalPortfolio(state, actor);
    });
  }

  if (isDemoMode()) {
    throw new Error("Bankruptcy is unavailable in demo mode.");
  }

  const db = getRequiredDb();

  await db.transaction(async (tx) => {
    await tx.execute(sql`select id from ${users} where ${users.id} = ${actorUserId} for update`);

    const actor = (await tx.select().from(users).where(eq(users.id, actorUserId)).limit(1))[0];

    if (!actor) {
      throw new Error("User not found.");
    }

    const actorPositions = await tx
      .select()
      .from(positions)
      .where(eq(positions.userId, actorUserId));

    const previousCashBalance = parseNumber(actor.cashBalance);
    const startingBalance = parseNumber(actor.startingBalance);
    const nextBankruptcyCount = actor.bankruptcyCount + 1;

    await tx.delete(positions).where(eq(positions.userId, actorUserId));

    await tx
      .update(users)
      .set({
        cashBalance: startingBalance.toFixed(2),
        bankruptcyCount: nextBankruptcyCount,
      })
      .where(eq(users.id, actorUserId));

    await tx.insert(ledgerEntries).values({
      userId: actorUserId,
      type: "manual_adjustment",
      amount: (startingBalance - previousCashBalance).toFixed(2),
      note: `Bankruptcy reset #${nextBankruptcyCount}; cleared ${actorPositions.length} positions`,
    });
  });

  return getPortfolio(actorUserId);
}

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  if (isLocalMode()) {
    const state = await readLocalState();

    return state.users
      .map((user) => {
        const userPositions = state.positions.filter((position) => position.userId === user.id);
        const openValue = userPositions.reduce((sum, position) => {
          const market = state.markets.find((entry) => entry.id === position.marketId);
          if (!market) {
            return sum;
          }

          return (
            sum +
            position.yesShares * market.currentProbability +
            position.noShares * (1 - market.currentProbability)
          );
        }, 0);

        return {
          user: localUserToSummary(user),
          portfolioValue: user.cashBalance + openValue,
          cashBalance: user.cashBalance,
          realizedPnl: userPositions.reduce((sum, position) => sum + position.realizedPnl, 0),
          wins: userPositions.filter((position) => position.realizedPnl > 0).length,
          losses: userPositions.filter((position) => position.realizedPnl < 0).length,
        };
      })
      .sort((a, b) => b.portfolioValue - a.portfolioValue);
  }

  if (isDemoMode()) {
    return demoLeaderboard;
  }

  const db = getRequiredDb();
  const userRows = await db.select().from(users).orderBy(asc(users.name));
  const userIds = userRows.map((user) => user.id);

  const openPositions =
    userIds.length === 0
      ? []
      : await db.select().from(positions).where(inArray(positions.userId, userIds));
  const marketIds = [...new Set(openPositions.map((position) => position.marketId))];
  const marketRows =
    marketIds.length === 0
      ? []
      : await db.select().from(markets).where(inArray(markets.id, marketIds));
  const marketMap = new Map(marketRows.map((market) => [market.id, market]));

  const byUser = new Map<string, { value: number; realized: number }>();

  for (const position of openPositions) {
    const market = marketMap.get(position.marketId);
    if (!market) {
      continue;
    }

    const openValue =
      parseNumber(position.yesShares) * parseNumber(market.currentProbability) +
      parseNumber(position.noShares) * (1 - parseNumber(market.currentProbability));

    const current = byUser.get(position.userId) ?? { value: 0, realized: 0 };
    current.value += openValue;
    current.realized += parseNumber(position.realizedPnl);
    byUser.set(position.userId, current);
  }

  return userRows
    .map((user) => {
      const aggregate = byUser.get(user.id) ?? { value: 0, realized: 0 };
      const userPositions = openPositions.filter((position) => position.userId === user.id);
      return {
        user: userToSummary(user),
        portfolioValue: parseNumber(user.cashBalance) + aggregate.value,
        cashBalance: parseNumber(user.cashBalance),
        realizedPnl: aggregate.realized,
        wins: userPositions.filter((position) => parseNumber(position.realizedPnl) > 0).length,
        losses: userPositions.filter((position) => parseNumber(position.realizedPnl) < 0).length,
      };
    })
    .sort((a, b) => b.portfolioValue - a.portfolioValue);
}
