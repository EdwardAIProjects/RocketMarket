export type MarketStatus = "open" | "closed" | "resolved" | "canceled";

export type ResolutionOutcome = "yes" | "no" | "partial" | "canceled";

export type TradeSide = "buy_yes" | "buy_no" | "sell_yes" | "sell_no";

export type UserRole = "member" | "admin";

export interface UserSummary {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  bankruptcyCount: number;
  imageUrl?: string;
}

export interface ChartPoint {
  timestamp: string;
  probability: number;
}

export interface AmmState {
  poolYes: number;
  poolNo: number;
  p: number;
}

export interface Market {
  id: string;
  slug: string;
  question: string;
  description: string;
  status: MarketStatus;
  category: string;
  closeTime: string;
  resolveByTime: string;
  resolutionCriteria: string;
  resolutionSource: string;
  resolutionNotes?: string;
  resolver: UserSummary;
  createdBy: UserSummary;
  currentProbability: number;
  ammState: AmmState;
  volume: number;
  tradersCount: number;
  chart: ChartPoint[];
}

export interface Position {
  marketId: string;
  marketSlug: string;
  question: string;
  yesShares: number;
  noShares: number;
  avgYesPrice: number;
  avgNoPrice: number;
  currentProbability: number;
}

export interface PortfolioSnapshot {
  user: UserSummary;
  cashBalance: number;
  estimatedValue: number;
  realizedPnl: number;
  positions: Position[];
}

export interface LeaderboardEntry {
  user: UserSummary;
  portfolioValue: number;
  cashBalance: number;
  realizedPnl: number;
  wins: number;
  losses: number;
}

export interface TradeQuote {
  side: TradeSide;
  amount: number;
  avgPrice: number;
  shares: number;
  probabilityBefore: number;
  probabilityAfter: number;
  maxPayout: number;
  nextAmmState: AmmState;
}

export interface ResolutionPayload {
  outcome: ResolutionOutcome;
  notes: string;
  evidenceUrl?: string;
  percentYes?: number;
}

export interface CreateMarketInput {
  question: string;
  description: string;
  category: string;
  closeTime: string;
  resolveByTime: string;
  resolutionCriteria: string;
  resolutionSource: string;
}
