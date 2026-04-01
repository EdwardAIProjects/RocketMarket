import { formatDateTime, formatMoney } from "@/lib/format";
import type { MarketBetSummary } from "@/lib/types";

function sideLabel(side: MarketBetSummary["side"]) {
  switch (side) {
    case "buy_yes":
      return "bought YES";
    case "buy_no":
      return "bought NO";
    case "sell_yes":
      return "sold YES";
    case "sell_no":
      return "sold NO";
  }
}

export function MarketBetList({
  bets,
  title = "Bet history",
}: {
  bets: MarketBetSummary[];
  title?: string;
}) {
  if (bets.length === 0) {
    return null;
  }

  return (
    <div className="rounded-[18px] border border-[color:var(--line)] bg-black/10 p-4">
      <div className="text-xs font-medium uppercase tracking-[0.18em] text-[color:var(--muted)]">
        {title}
      </div>
      <div className="thin-scrollbar mt-3 max-h-72 space-y-3 overflow-y-auto pr-3">
        {bets.map((bet) => (
          <div
            key={`${bet.userId}-${bet.createdAt}-${bet.side}`}
            className="flex items-start gap-4 text-sm"
          >
            <div className="min-w-0 flex-1">
              <div className="font-medium text-foreground">{bet.userName}</div>
              <div className="text-[color:var(--muted)]">{sideLabel(bet.side)}</div>
              <div className="text-xs text-[color:var(--muted)]">{formatDateTime(bet.createdAt)}</div>
            </div>
            <div className="shrink-0 font-semibold text-foreground">{formatMoney(bet.amount)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
