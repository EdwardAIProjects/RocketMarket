import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["member", "admin"]);
export const marketStatusEnum = pgEnum("market_status", [
  "open",
  "closed",
  "resolved",
  "canceled",
]);
export const resolutionOutcomeEnum = pgEnum("resolution_outcome", [
  "yes",
  "no",
  "partial",
  "canceled",
]);
export const tradeSideEnum = pgEnum("trade_side", [
  "buy_yes",
  "buy_no",
  "sell_yes",
  "sell_no",
]);
export const ledgerTypeEnum = pgEnum("ledger_type", [
  "starting_balance",
  "trade_debit",
  "trade_credit",
  "market_payout",
  "market_refund",
  "manual_adjustment",
]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 255 }).notNull().unique(),
  emailVerified: timestamp("email_verified", { withTimezone: true }),
  image: text("image"),
  role: userRoleEnum("role").default("member").notNull(),
  isBanned: boolean("is_banned").default(false).notNull(),
  startingBalance: numeric("starting_balance", { precision: 12, scale: 2 })
    .default("10000")
    .notNull(),
  cashBalance: numeric("cash_balance", { precision: 12, scale: 2 })
    .default("10000")
    .notNull(),
  bankruptcyCount: integer("bankruptcy_count").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const accounts = pgTable(
  "accounts",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 255 }).notNull(),
    provider: varchar("provider", { length: 255 }).notNull(),
    providerAccountId: varchar("provider_account_id", { length: 255 }).notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: varchar("token_type", { length: 255 }),
    scope: varchar("scope", { length: 255 }),
    id_token: text("id_token"),
    session_state: varchar("session_state", { length: 255 }),
  },
  (table) => ({
    providerProviderAccountIdIdx: uniqueIndex("accounts_provider_provider_account_id_idx").on(
      table.provider,
      table.providerAccountId,
    ),
  }),
);

export const sessions = pgTable("sessions", {
  sessionToken: varchar("session_token", { length: 255 }).primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { withTimezone: true }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: varchar("identifier", { length: 255 }).notNull(),
    token: varchar("token", { length: 255 }).notNull(),
    expires: timestamp("expires", { withTimezone: true }).notNull(),
  },
  (table) => ({
    uniqueTokenIdx: uniqueIndex("verification_tokens_token_idx").on(table.token),
    uniqueIdentifierTokenIdx: uniqueIndex("verification_tokens_identifier_token_idx").on(
      table.identifier,
      table.token,
    ),
  }),
);

export const markets = pgTable("markets", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  question: text("question").notNull(),
  description: text("description").notNull(),
  category: varchar("category", { length: 80 }).notNull(),
  status: marketStatusEnum("status").default("open").notNull(),
  closeTime: timestamp("close_time", { withTimezone: true }).notNull(),
  resolveByTime: timestamp("resolve_by_time", { withTimezone: true }).notNull(),
  resolutionCriteria: text("resolution_criteria").notNull(),
  resolutionSource: text("resolution_source").notNull(),
  resolutionNotes: text("resolution_notes"),
  resolutionOutcome: resolutionOutcomeEnum("resolution_outcome"),
  resolutionPercentYes: numeric("resolution_percent_yes", {
    precision: 6,
    scale: 4,
  }),
  createdByUserId: uuid("created_by_user_id")
    .notNull()
    .references(() => users.id),
  resolverUserId: uuid("resolver_user_id")
    .notNull()
    .references(() => users.id),
  currentProbability: numeric("current_probability", { precision: 6, scale: 4 })
    .default("0.5000")
    .notNull(),
  volume: numeric("volume", { precision: 12, scale: 2 }).default("0").notNull(),
  tradersCount: integer("traders_count").default(0).notNull(),
  ammState: jsonb("amm_state").default({ liquidity: 1400, probability: 0.5 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
});

export const trades = pgTable("trades", {
  id: uuid("id").defaultRandom().primaryKey(),
  marketId: uuid("market_id")
    .notNull()
    .references(() => markets.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  side: tradeSideEnum("side").notNull(),
  stakeAmount: numeric("stake_amount", { precision: 12, scale: 2 }).notNull(),
  avgPrice: numeric("avg_price", { precision: 6, scale: 4 }).notNull(),
  sharesReceived: numeric("shares_received", { precision: 12, scale: 4 }).notNull(),
  probabilityBefore: numeric("probability_before", { precision: 6, scale: 4 }).notNull(),
  probabilityAfter: numeric("probability_after", { precision: 6, scale: 4 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const positions = pgTable(
  "positions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    marketId: uuid("market_id")
      .notNull()
      .references(() => markets.id, { onDelete: "cascade" }),
    yesShares: numeric("yes_shares", { precision: 12, scale: 4 }).default("0").notNull(),
    noShares: numeric("no_shares", { precision: 12, scale: 4 }).default("0").notNull(),
    avgYesPrice: numeric("avg_yes_price", { precision: 6, scale: 4 }).default("0").notNull(),
    avgNoPrice: numeric("avg_no_price", { precision: 6, scale: 4 }).default("0").notNull(),
    realizedPnl: numeric("realized_pnl", { precision: 12, scale: 2 }).default("0").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    uniqueUserMarketIdx: uniqueIndex("positions_user_market_idx").on(
      table.userId,
      table.marketId,
    ),
  }),
);

export const ledgerEntries = pgTable("ledger_entries", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  marketId: uuid("market_id").references(() => markets.id, { onDelete: "set null" }),
  tradeId: uuid("trade_id").references(() => trades.id, { onDelete: "set null" }),
  type: ledgerTypeEnum("type").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const resolutionAuditLogs = pgTable("resolution_audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  marketId: uuid("market_id")
    .notNull()
    .references(() => markets.id, { onDelete: "cascade" }),
  actorUserId: uuid("actor_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  action: varchar("action", { length: 32 }).notNull(),
  payloadJson: jsonb("payload_json").default({}).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const marketChartPoints = pgTable("market_chart_points", {
  id: uuid("id").defaultRandom().primaryKey(),
  marketId: uuid("market_id")
    .notNull()
    .references(() => markets.id, { onDelete: "cascade" }),
  probability: numeric("probability", { precision: 6, scale: 4 }).notNull(),
  at: timestamp("at", { withTimezone: true }).defaultNow().notNull(),
});

export const featureFlags = pgTable("feature_flags", {
  key: varchar("key", { length: 100 }).primaryKey(),
  enabled: boolean("enabled").default(false).notNull(),
});
