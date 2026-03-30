"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ResolutionOutcome } from "@/lib/types";

const outcomes: ResolutionOutcome[] = ["yes", "no", "partial", "canceled"];

export function ResolutionPanel({ marketId }: { marketId: string }) {
  const router = useRouter();
  const [outcome, setOutcome] = useState<ResolutionOutcome>("yes");
  const [notes, setNotes] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <div className="panel rounded-[28px] p-5">
      <div className="eyebrow">Resolution</div>
      <h3 className="mt-2 text-lg font-semibold">Admin / resolver action</h3>

      <div className="mt-5 grid grid-cols-2 gap-3">
        {outcomes.map((entry) => (
          <button
            key={entry}
            type="button"
            onClick={() => setOutcome(entry)}
            className={`rounded-2xl border px-4 py-3 text-left text-sm font-medium capitalize transition ${
              outcome === entry
                ? "border-[color:var(--accent)] bg-[color:var(--accent-soft)] text-foreground"
                : "border-[color:var(--line)] bg-white/4 text-[color:var(--muted)]"
            }`}
          >
            {entry}
          </button>
        ))}
      </div>

      <label className="mt-5 block text-sm font-medium">
        Resolution note <span className="text-[color:var(--muted)]">(optional)</span>
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          className="mt-2 min-h-32 w-full rounded-2xl border border-[color:var(--line)] bg-white/4 px-4 py-3 outline-none transition focus:border-[color:var(--accent)]"
          placeholder="Summarize why the market resolved this way."
        />
      </label>

      <label className="mt-4 block text-sm font-medium">
        Evidence URL
        <input
          value={evidenceUrl}
          onChange={(event) => setEvidenceUrl(event.target.value)}
          className="mt-2 w-full rounded-2xl border border-[color:var(--line)] bg-white/4 px-4 py-3 outline-none transition focus:border-[color:var(--accent)]"
          placeholder="https://..."
        />
      </label>

      <div className="mt-5 flex gap-3">
        <button
          type="button"
          className="rounded-full border border-[color:var(--line)] bg-white/2 px-4 py-3 text-sm font-semibold"
          onClick={async () => {
            setIsSubmitting(true);
            setMessage(null);

            const response = await fetch(`/api/markets/${marketId}/close`, {
              method: "POST",
            });

            const payload = (await response.json()) as { error?: string };
            setMessage(response.ok ? "Market closed." : payload.error ?? "Close failed.");
            setIsSubmitting(false);
            if (response.ok) {
              router.refresh();
            }
          }}
        >
          Close market
        </button>
        <button
          type="button"
          disabled={isSubmitting}
          className="rounded-full bg-[color:var(--accent)] px-4 py-3 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-65"
          onClick={async () => {
            setIsSubmitting(true);
            setMessage(null);

            const response = await fetch(`/api/markets/${marketId}/resolve`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ outcome, notes, evidenceUrl }),
            });

            const payload = (await response.json()) as { error?: string };
            setMessage(
              response.ok ? `Market resolved as ${outcome}.` : payload.error ?? "Resolution failed.",
            );
            setIsSubmitting(false);
            if (response.ok) {
              router.refresh();
            }
          }}
        >
          {isSubmitting ? "Working..." : "Resolve"}
        </button>
      </div>
      {message ? <p className="mt-4 text-sm font-medium">{message}</p> : null}
    </div>
  );
}
