import type { MarketStatus } from "@/lib/types";

const statusStyles: Record<MarketStatus, string> = {
  open: "border-emerald-400/25 bg-emerald-400/12 text-emerald-200",
  closed: "border-amber-400/25 bg-amber-400/12 text-amber-200",
  resolved: "border-sky-400/25 bg-sky-400/12 text-sky-200",
  canceled: "border-slate-300/20 bg-slate-300/10 text-slate-200",
};

export function MarketStatusBadge({ status }: { status: MarketStatus }) {
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${statusStyles[status]}`}
    >
      {status}
    </span>
  );
}
