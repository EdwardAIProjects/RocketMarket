"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightLeft } from "lucide-react";
import { formatMoney, formatProbability } from "@/lib/format";
import { quoteTrade } from "@/lib/markets/engine";
import type { AmmState } from "@/lib/types";

const stakePresets = [25, 50, 100, 250];

export function TradePanel({
  marketId,
  probability,
  ammState,
}: {
  marketId: string;
  probability: number;
  ammState: AmmState;
}) {
  const router = useRouter();
  const [side, setSide] = useState<"buy_yes" | "buy_no">("buy_yes");
  const [amount, setAmount] = useState(50);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const quote = quoteTrade({ side, amount, ammState });
  const stake = Number.isFinite(amount) && amount > 0 ? amount : 10;
  const potentialProfit = Math.max(0, quote.maxPayout - stake);
  const sideLabel = side === "buy_yes" ? "YES" : "NO";

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
          onClick={() => setSide("buy_yes")}
          className={`rounded-2xl px-4 py-4 text-left transition ${
            side === "buy_yes"
              ? "border border-emerald-400/40 bg-emerald-500/18 text-white"
              : "border border-emerald-500/18 bg-emerald-500/8 text-emerald-200"
          }`}
        >
          <div className="text-xs uppercase tracking-[0.18em]">Buy Yes</div>
          <div className="mt-1 text-2xl font-semibold">{formatProbability(probability)}</div>
        </button>
        <button
          type="button"
          onClick={() => setSide("buy_no")}
          className={`rounded-2xl px-4 py-4 text-left transition ${
            side === "buy_no"
              ? "border border-rose-400/40 bg-rose-500/18 text-white"
              : "border border-rose-500/18 bg-rose-500/8 text-rose-200"
          }`}
        >
          <div className="text-xs uppercase tracking-[0.18em]">Buy No</div>
          <div className="mt-1 text-2xl font-semibold">{formatProbability(1 - probability)}</div>
        </button>
      </div>

      <label className="mt-5 block text-sm font-medium">
        Stake
        <div className="mt-2 rounded-[22px] border border-[color:var(--line)] bg-white/3 p-3">
          <div className="flex items-center rounded-2xl border border-[color:var(--line)] bg-[rgba(255,255,255,0.03)] px-4 py-3 focus-within:border-[color:var(--accent)]">
            <span className="mr-3 text-sm font-semibold text-[color:var(--muted)]">$</span>
            <input
              value={amount}
              min={10}
              step={10}
              onChange={(event) => setAmount(Number(event.target.value) || 10)}
              type="number"
              className="w-full bg-transparent outline-none"
            />
          </div>

          <div className="mt-3 grid grid-cols-4 gap-2">
            {stakePresets.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setAmount(preset)}
                className={`rounded-full px-3 py-2 text-xs font-semibold transition ${
                  amount === preset
                    ? "bg-[color:var(--accent)] text-slate-950"
                    : "border border-[color:var(--line)] bg-white/4 text-[color:var(--muted)] hover:text-foreground"
                }`}
              >
                {formatMoney(preset)}
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
              Buy {sideLabel} for {formatMoney(stake)}
            </div>
          </div>
          <div
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              side === "buy_yes"
                ? "bg-emerald-500/18 text-emerald-100"
                : "bg-rose-500/18 text-rose-100"
            }`}
          >
            {formatProbability(side === "buy_yes" ? probability : 1 - probability)} entry
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-[color:var(--line)] bg-black/10 p-3">
            <div className="text-xs uppercase tracking-[0.16em] text-[color:var(--muted)]">
              Shares
            </div>
            <div className="mono mt-2 text-xl font-semibold">{quote.shares.toFixed(2)}</div>
            <div className="mt-1 text-xs text-[color:var(--muted)]">
              Avg fill {formatProbability(quote.avgPrice)}
            </div>
          </div>
          <div className="rounded-2xl border border-[color:var(--line)] bg-black/10 p-3">
            <div className="text-xs uppercase tracking-[0.16em] text-[color:var(--muted)]">
              Market after trade
            </div>
            <div className="mono mt-2 text-xl font-semibold">
              {formatProbability(quote.probabilityAfter)}
            </div>
            <div className="mt-1 text-xs text-[color:var(--muted)]">
              New implied odds
            </div>
          </div>
          <div className="rounded-2xl border border-[color:var(--line)] bg-black/10 p-3">
            <div className="text-xs uppercase tracking-[0.16em] text-[color:var(--muted)]">
              Max payout
            </div>
            <div className="mono mt-2 text-xl font-semibold">{formatMoney(quote.maxPayout)}</div>
            <div className="mt-1 text-xs text-[color:var(--muted)]">
              Total return if correct
            </div>
          </div>
          <div className="rounded-2xl border border-[color:var(--line)] bg-black/10 p-3">
            <div className="text-xs uppercase tracking-[0.16em] text-[color:var(--muted)]">
              Potential profit
            </div>
            <div className="mono mt-2 text-xl font-semibold">{formatMoney(potentialProfit)}</div>
            <div className="mt-1 text-xs text-[color:var(--muted)]">
              Excluding your stake
            </div>
          </div>
        </div>
      </div>

      <button
        type="button"
        disabled={isSubmitting}
        className="mt-5 w-full rounded-full bg-[color:var(--accent)] px-4 py-3 text-sm font-semibold text-slate-950 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-65"
        onClick={async () => {
          setIsSubmitting(true);
          setMessage(null);

          const response = await fetch(`/api/markets/${marketId}/trade`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ side, amount }),
          });

          const payload = (await response.json()) as {
            error?: string;
            quote?: { shares: number; probabilityAfter: number };
          };

          if (!response.ok) {
            setMessage(payload.error ?? "Trade failed.");
            setIsSubmitting(false);
            return;
          }

          setMessage(
            `Trade booked: ${payload.quote?.shares?.toFixed(2) ?? "0.00"} shares. Market moved to ${formatProbability(
              payload.quote?.probabilityAfter ?? probability,
            )}.`,
          );
          setIsSubmitting(false);
          router.refresh();
        }}
      >
        {isSubmitting ? "Submitting..." : `Buy ${sideLabel}`}
      </button>
      <p className="mt-3 text-xs leading-5 text-[color:var(--muted)]">
        Trades update your fake-money balance immediately and move the market.
      </p>
      {message ? <p className="mt-3 text-sm font-medium text-[color:var(--accent-strong)]">{message}</p> : null}
    </div>
  );
}
