"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightLeft } from "lucide-react";
import { formatMoney, formatProbability } from "@/lib/format";
import { quoteTrade } from "@/lib/markets/engine";
import type { AmmState, MarketStatus, Position, TradeSide } from "@/lib/types";

const buyPresets = [25, 50, 100, 250];
const sellPresets = [10, 25, 50, 100];
const minimumBuyAmount = 10;
const minimumSellShares = 1;
const sharePrecision = 4;

type TradeMode = "buy" | "sell";

const tradeToneClasses: Record<TradeSide, string> = {
  buy_yes: "border border-emerald-400/40 bg-emerald-500/18 text-white",
  buy_no: "border border-rose-400/40 bg-rose-500/18 text-white",
  sell_yes: "border border-emerald-400/40 bg-emerald-500/18 text-white",
  sell_no: "border border-rose-400/40 bg-rose-500/18 text-white",
};

const tradeMutedClasses: Record<TradeSide, string> = {
  buy_yes: "border border-emerald-500/18 bg-emerald-500/8 text-emerald-200",
  buy_no: "border border-rose-500/18 bg-rose-500/8 text-rose-200",
  sell_yes: "border border-emerald-500/18 bg-emerald-500/8 text-emerald-200",
  sell_no: "border border-rose-500/18 bg-rose-500/8 text-rose-200",
};

function floorToSharePrecision(value: number) {
  const factor = 10 ** sharePrecision;
  return Math.floor(value * factor) / factor;
}

function formatShares(value: number) {
  const floored = floorToSharePrecision(value);
  return floored.toFixed(sharePrecision).replace(/\.?0+$/, "");
}

export function TradePanel({
  marketId,
  probability,
  ammState,
  marketStatus,
  position,
}: {
  marketId: string;
  probability: number;
  ammState: AmmState;
  marketStatus: MarketStatus;
  position: Pick<Position, "yesShares" | "noShares" | "avgYesPrice" | "avgNoPrice"> | null;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<TradeMode>("buy");
  const [side, setSide] = useState<TradeSide>("buy_yes");
  const [amountInput, setAmountInput] = useState("50");
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isBuy = mode === "buy";
  const selectedOutcome = side.endsWith("yes") ? "yes" : "no";
  const normalizedSide = `${mode}_${selectedOutcome}` as TradeSide;
  const yesSharesOwned = position?.yesShares ?? 0;
  const noSharesOwned = position?.noShares ?? 0;
  const ownedShares = floorToSharePrecision(
    selectedOutcome === "yes" ? yesSharesOwned : noSharesOwned,
  );
  const amountLabel = isBuy ? "Stake" : "Shares to sell";
  const amountUnit = isBuy ? "$" : "sh";
  const amountPresets = isBuy ? buyPresets : sellPresets;
  const minAmount = isBuy ? minimumBuyAmount : minimumSellShares;
  const parsedAmount = amountInput.trim() === "" ? Number.NaN : Number(amountInput);
  const isAmountValid = Number.isFinite(parsedAmount) && parsedAmount >= minAmount;
  const exceedsOwnedShares = !isBuy && isAmountValid && parsedAmount > ownedShares + 1e-9;
  const amount = isAmountValid ? parsedAmount : minAmount;
  const quote = quoteTrade({ side: normalizedSide, amount, ammState });
  const sideLabel = selectedOutcome.toUpperCase();
  const potentialProfit = isBuy && isAmountValid ? Math.max(0, quote.maxPayout - parsedAmount) : 0;
  const tradingDisabled = marketStatus !== "open";
  const submitDisabled = isSubmitting || !isAmountValid || tradingDisabled || exceedsOwnedShares;
  const sellModeDefaultAmount =
    ownedShares >= 10 ? "10" : ownedShares >= minimumSellShares ? String(ownedShares) : "10";
  const actionLabel =
    marketStatus === "closed"
      ? "Market closed"
      : marketStatus === "resolved"
        ? "Market resolved"
        : marketStatus === "canceled"
          ? "Market canceled"
          : isBuy
            ? `Buy ${sideLabel}`
            : `Sell ${sideLabel}`;

  return (
    <div className="panel rounded-[28px] p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="eyebrow">Trade</div>
          <div className="mt-2 text-lg font-semibold">Place a trade</div>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--line)] bg-white/3">
          <ArrowRightLeft className="h-5 w-5 text-[color:var(--muted)]" />
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <button
          type="button"
          disabled={tradingDisabled}
          onClick={() => {
            setMode("buy");
            setSide(selectedOutcome === "yes" ? "buy_yes" : "buy_no");
            setAmountInput("50");
            setMessage(null);
          }}
          className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${
            tradingDisabled
              ? "cursor-not-allowed border border-white/10 bg-white/5 text-[color:var(--muted)]"
              : isBuy
                ? "bg-[color:var(--accent)] text-slate-950"
                : "border border-[color:var(--line)] bg-white/4 text-[color:var(--muted)] hover:text-foreground"
          }`}
        >
          Buy
        </button>
        <button
          type="button"
          disabled={tradingDisabled}
          onClick={() => {
            setMode("sell");
            setSide(selectedOutcome === "yes" ? "sell_yes" : "sell_no");
            setAmountInput(sellModeDefaultAmount);
            setMessage(null);
          }}
          className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${
            tradingDisabled
              ? "cursor-not-allowed border border-white/10 bg-white/5 text-[color:var(--muted)]"
              : !isBuy
                ? "bg-[color:var(--accent)] text-slate-950"
                : "border border-[color:var(--line)] bg-white/4 text-[color:var(--muted)] hover:text-foreground"
          }`}
        >
          Sell
        </button>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <button
          type="button"
          disabled={tradingDisabled}
          onClick={() => {
            setSide(isBuy ? "buy_yes" : "sell_yes");
            setMessage(null);
          }}
          className={`rounded-2xl px-4 py-4 text-left transition ${
            tradingDisabled
              ? "cursor-not-allowed border border-white/10 bg-white/5 text-[color:var(--muted)]"
              : normalizedSide === (isBuy ? "buy_yes" : "sell_yes")
                ? tradeToneClasses[normalizedSide]
                : tradeMutedClasses[isBuy ? "buy_yes" : "sell_yes"]
          }`}
        >
          <div className="text-xs uppercase tracking-[0.18em]">
            {isBuy ? "Buy Yes" : "Sell Yes"}
          </div>
          <div className="mt-1 text-2xl font-semibold">{formatProbability(probability)}</div>
          {!isBuy ? (
            <div className="mt-1 text-xs text-current/80">{formatShares(yesSharesOwned)} owned</div>
          ) : null}
        </button>
        <button
          type="button"
          disabled={tradingDisabled}
          onClick={() => {
            setSide(isBuy ? "buy_no" : "sell_no");
            setMessage(null);
          }}
          className={`rounded-2xl px-4 py-4 text-left transition ${
            tradingDisabled
              ? "cursor-not-allowed border border-white/10 bg-white/5 text-[color:var(--muted)]"
              : normalizedSide === (isBuy ? "buy_no" : "sell_no")
                ? tradeToneClasses[normalizedSide]
                : tradeMutedClasses[isBuy ? "buy_no" : "sell_no"]
          }`}
        >
          <div className="text-xs uppercase tracking-[0.18em]">
            {isBuy ? "Buy No" : "Sell No"}
          </div>
          <div className="mt-1 text-2xl font-semibold">{formatProbability(1 - probability)}</div>
          {!isBuy ? (
            <div className="mt-1 text-xs text-current/80">{formatShares(noSharesOwned)} owned</div>
          ) : null}
        </button>
      </div>

      <label className="mt-5 block text-sm font-medium">
        {amountLabel}
        <div className="mt-2 rounded-[22px] border border-[color:var(--line)] bg-white/3 p-3">
          <div className="flex items-center rounded-2xl border border-[color:var(--line)] bg-[rgba(255,255,255,0.03)] px-4 py-3 focus-within:border-[color:var(--accent)]">
            <span className="mr-3 text-sm font-semibold text-[color:var(--muted)]">{amountUnit}</span>
            <input
              value={amountInput}
              min={minAmount}
              max={isBuy ? undefined : ownedShares}
              step={isBuy ? 10 : 0.0001}
              onChange={(event) => setAmountInput(event.target.value)}
              type="number"
              disabled={tradingDisabled}
              className="w-full bg-transparent outline-none"
            />
          </div>
          {!isAmountValid ? (
            <p className="mt-2 text-xs text-rose-300">
              {isBuy
                ? "Enter a stake of at least $10."
                : "Enter at least 1 share to sell."}
            </p>
          ) : null}
          {exceedsOwnedShares ? (
            <p className="mt-2 text-xs text-rose-300">
              You only own {formatShares(ownedShares)} {sideLabel} shares.
            </p>
          ) : null}
          {!isBuy ? (
            <div className="mt-2 flex items-center justify-between gap-3 text-xs text-[color:var(--muted)]">
              <span>Available: {formatShares(ownedShares)} shares</span>
              <button
                type="button"
                disabled={tradingDisabled || ownedShares <= 0}
                onClick={() => setAmountInput(String(ownedShares))}
                className="font-semibold text-[color:var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Sell all
              </button>
            </div>
          ) : null}

          <div className="mt-3 grid grid-cols-4 gap-2">
            {amountPresets.map((preset) => (
              <button
                key={preset}
                type="button"
                disabled={tradingDisabled}
                onClick={() => setAmountInput(String(preset))}
                className={`rounded-full px-3 py-2 text-xs font-semibold transition ${
                  tradingDisabled
                    ? "cursor-not-allowed border border-white/10 bg-white/5 text-[color:var(--muted)]"
                    : isAmountValid && parsedAmount === preset
                    ? "bg-[color:var(--accent)] text-slate-950"
                    : "border border-[color:var(--line)] bg-white/4 text-[color:var(--muted)] hover:text-foreground"
                }`}
              >
                {isBuy ? formatMoney(preset) : `${preset} sh`}
              </button>
            ))}
          </div>
        </div>
      </label>

      <div className="mt-5 rounded-[24px] border border-[color:var(--line)] bg-white/3 p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.18em] text-[color:var(--muted)]">
              Order summary
            </div>
            <div className="mt-2 text-lg font-semibold">
              {isBuy
                ? `Buy ${sideLabel} for ${formatMoney(isAmountValid ? parsedAmount : 0)}`
                : `Sell ${sideLabel} ${isAmountValid ? formatShares(parsedAmount) : "0"} shares`}
            </div>
          </div>
          <div
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              normalizedSide.endsWith("yes")
                ? "bg-emerald-500/18 text-emerald-100"
                : "bg-rose-500/18 text-rose-100"
            }`}
          >
            {formatProbability(normalizedSide.endsWith("yes") ? probability : 1 - probability)} entry
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-[color:var(--line)] bg-black/10 p-3">
            <div className="text-xs uppercase tracking-[0.16em] text-[color:var(--muted)]">
              {isBuy ? "Shares" : "Cash received"}
            </div>
            <div className="mono mt-2 text-xl font-semibold">
              {isAmountValid
                ? isBuy
                  ? quote.shares.toFixed(2)
                  : formatMoney(quote.maxPayout)
                : "--"}
            </div>
            <div className="mt-1 text-xs text-[color:var(--muted)]">
              {isAmountValid
                ? isBuy
                  ? `Avg fill ${formatProbability(quote.avgPrice)}`
                  : `Avg exit ${formatProbability(quote.avgPrice)}`
                : "Waiting for valid amount"}
            </div>
          </div>
          <div className="rounded-2xl border border-[color:var(--line)] bg-black/10 p-3">
            <div className="text-xs uppercase tracking-[0.16em] text-[color:var(--muted)]">
              Market after trade
            </div>
            <div className="mono mt-2 text-xl font-semibold">
              {isAmountValid ? formatProbability(quote.probabilityAfter) : "--"}
            </div>
            <div className="mt-1 text-xs text-[color:var(--muted)]">
              New implied odds
            </div>
          </div>
          <div className="rounded-2xl border border-[color:var(--line)] bg-black/10 p-3">
            <div className="text-xs uppercase tracking-[0.16em] text-[color:var(--muted)]">
              {isBuy ? "Max payout" : "Shares remaining"}
            </div>
            <div className="mono mt-2 text-xl font-semibold">
              {isAmountValid
                ? isBuy
                  ? formatMoney(quote.maxPayout)
                  : formatShares(Math.max(0, ownedShares - parsedAmount))
                : "--"}
            </div>
            <div className="mt-1 text-xs text-[color:var(--muted)]">
              {isBuy ? "Total return if correct" : `Owned before sale: ${formatShares(ownedShares)}`}
            </div>
          </div>
          <div className="rounded-2xl border border-[color:var(--line)] bg-black/10 p-3">
            <div className="text-xs uppercase tracking-[0.16em] text-[color:var(--muted)]">
              {isBuy ? "Potential profit" : "Average cost"}
            </div>
            <div className="mono mt-2 text-xl font-semibold">
              {isBuy
                ? formatMoney(potentialProfit)
                : formatProbability(selectedOutcome === "yes" ? (position?.avgYesPrice ?? 0) : (position?.avgNoPrice ?? 0))}
            </div>
            <div className="mt-1 text-xs text-[color:var(--muted)]">
              {isBuy ? "Excluding your stake" : "Average entry price on owned shares"}
            </div>
          </div>
        </div>
      </div>

      <button
        type="button"
        disabled={submitDisabled}
        className={`mt-5 w-full rounded-full px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-65 ${
          tradingDisabled
            ? "bg-white/10 text-[color:var(--muted)]"
            : "bg-[color:var(--accent)] text-slate-950 hover:opacity-90"
        }`}
        onClick={async () => {
          if (!isAmountValid || tradingDisabled || exceedsOwnedShares) {
            return;
          }

          setIsSubmitting(true);
          setMessage(null);

          const response = await fetch(`/api/markets/${marketId}/trade`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ side: normalizedSide, amount: parsedAmount }),
          });

          const payload = (await response.json()) as {
            error?: string;
            quote?: { shares: number; probabilityAfter: number; maxPayout: number };
          };

          if (!response.ok) {
            setMessage(payload.error ?? "Trade failed.");
            setIsSubmitting(false);
            return;
          }

          setMessage(
            isBuy
              ? `Trade booked: ${payload.quote?.shares?.toFixed(2) ?? "0.00"} shares. Market moved to ${formatProbability(
                  payload.quote?.probabilityAfter ?? probability,
                )}.`
              : `Sale booked: ${formatShares(parsedAmount)} shares sold for ${formatMoney(payload.quote?.maxPayout ?? 0)}. Market moved to ${formatProbability(
                  payload.quote?.probabilityAfter ?? probability,
                )}.`,
          );
          setIsSubmitting(false);
          router.refresh();
        }}
      >
        {isSubmitting ? "Submitting..." : actionLabel}
      </button>
      <p className="mt-3 text-xs leading-5 text-[color:var(--muted)]">
        {tradingDisabled
          ? "Trading is disabled because this market is no longer open."
          : isBuy
            ? "Trades update your balance immediately and move the market."
            : "Selling closes part of your position, credits cash immediately, and moves the market."}
      </p>
      {message ? <p className="mt-3 text-sm font-medium text-[color:var(--accent-strong)]">{message}</p> : null}
    </div>
  );
}
