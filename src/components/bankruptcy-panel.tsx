"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function BankruptcyPanel({
  bankruptcyCount,
}: {
  bankruptcyCount: number;
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  return (
    <section className="panel rounded-[28px] p-5">
      <div className="eyebrow">Bankruptcy</div>
      <h2 className="mt-2 text-lg font-semibold">Declare permanent bankruptcy</h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-[color:var(--muted)]">
        This permanently records that you declared bankruptcy. It resets your cash back
        to the starting balance, wipes your open and settled positions, and adds a
        permanent public bankruptcy badge to your leaderboard name.
      </p>
      <div className="mt-4 text-sm text-[color:var(--muted)]">
        Permanent bankruptcy count:{" "}
        <span className="font-semibold text-foreground">{bankruptcyCount}</span>
      </div>
      <button
        type="button"
        disabled={isSubmitting}
        className="mt-5 rounded-full border border-rose-500/35 bg-rose-500/12 px-4 py-3 text-sm font-semibold text-rose-100 transition hover:bg-rose-500/18 disabled:cursor-not-allowed disabled:opacity-65"
        onClick={async () => {
          const confirmed = window.confirm(
            "Declare bankruptcy?\n\nThis permanently records a public bankruptcy badge on your leaderboard name. Your cash will reset and all of your positions will be cleared.",
          );

          if (!confirmed) {
            return;
          }

          setIsSubmitting(true);
          setMessage(null);

          const response = await fetch("/api/portfolio/bankruptcy", {
            method: "POST",
          });

          const payload = (await response.json()) as { error?: string };
          setMessage(
            response.ok
              ? "Bankruptcy declared. Your account was reset and your permanent public bankruptcy badge was added."
              : payload.error ?? "Bankruptcy reset failed.",
          );
          setIsSubmitting(false);

          if (response.ok) {
            router.refresh();
          }
        }}
      >
        {isSubmitting ? "Declaring bankruptcy..." : "Declare permanent bankruptcy"}
      </button>
      {message ? <p className="mt-4 text-sm font-medium">{message}</p> : null}
    </section>
  );
}
