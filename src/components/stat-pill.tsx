import { cn } from "@/lib/utils";

export function StatPill({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "success" | "danger";
}) {
  return (
    <div
      className={cn(
        "rounded-full border px-3 py-2 text-sm",
        tone === "neutral" && "border-[color:var(--line)] bg-white/4",
        tone === "success" && "border-emerald-500/20 bg-emerald-500/10 text-emerald-200",
        tone === "danger" && "border-rose-500/20 bg-rose-500/10 text-rose-200",
      )}
    >
      <span className="mr-2 text-[color:var(--muted)]">{label}</span>
      <span className="font-semibold text-foreground">{value}</span>
    </div>
  );
}
