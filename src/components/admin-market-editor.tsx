"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AdminUserRecord, Market } from "@/lib/types";

export function AdminMarketEditor({
  market,
  users,
}: {
  market: Market;
  users: AdminUserRecord[];
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    question: market.question,
    description: market.description,
    category: market.category,
    closeTime: market.closeTime.slice(0, 16),
    resolveByTime: market.resolveByTime.slice(0, 16),
    resolutionCriteria: market.resolutionCriteria,
    resolutionSource: market.resolutionSource,
    resolverUserId: market.resolver.id,
  });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <section className="panel rounded-[28px] p-5">
      <div className="eyebrow">Edit market</div>
      <h2 className="mt-2 text-lg font-semibold">Update market metadata</h2>

      <form
        className="mt-5 space-y-4"
        onSubmit={async (event) => {
          event.preventDefault();
          setError(null);
          setMessage(null);
          setIsSubmitting(true);

          const response = await fetch(`/api/admin/markets/${market.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...form,
              closeTime: new Date(form.closeTime).toISOString(),
              resolveByTime: new Date(form.resolveByTime).toISOString(),
            }),
          });

          const payload = (await response.json()) as { error?: string };

          if (!response.ok) {
            setError(payload.error ?? "Market update failed.");
            setIsSubmitting(false);
            return;
          }

          setMessage("Market updated.");
          setIsSubmitting(false);
          router.refresh();
        }}
      >
        <label className="block text-sm font-medium">
          Question
          <input
            value={form.question}
            onChange={(event) => setForm((current) => ({ ...current, question: event.target.value }))}
            className="mt-2 w-full rounded-2xl border border-[color:var(--line)] bg-white/4 px-4 py-3 outline-none"
          />
        </label>

        <label className="block text-sm font-medium">
          Description
          <textarea
            value={form.description}
            onChange={(event) =>
              setForm((current) => ({ ...current, description: event.target.value }))
            }
            className="mt-2 min-h-28 w-full rounded-2xl border border-[color:var(--line)] bg-white/4 px-4 py-3 outline-none"
          />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm font-medium">
            Category
            <input
              value={form.category}
              onChange={(event) =>
                setForm((current) => ({ ...current, category: event.target.value }))
              }
              className="mt-2 w-full rounded-2xl border border-[color:var(--line)] bg-white/4 px-4 py-3 outline-none"
            />
          </label>
          <label className="block text-sm font-medium">
            Resolver
            <select
              value={form.resolverUserId}
              onChange={(event) =>
                setForm((current) => ({ ...current, resolverUserId: event.target.value }))
              }
              className="mt-2 w-full rounded-2xl border border-[color:var(--line)] bg-white/4 px-4 py-3 outline-none"
            >
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.email})
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium">
            Close time
            <input
              type="datetime-local"
              value={form.closeTime}
              onChange={(event) =>
                setForm((current) => ({ ...current, closeTime: event.target.value }))
              }
              className="mt-2 w-full rounded-2xl border border-[color:var(--line)] bg-white/4 px-4 py-3 outline-none"
            />
          </label>
          <label className="block text-sm font-medium">
            Resolve by
            <input
              type="datetime-local"
              value={form.resolveByTime}
              onChange={(event) =>
                setForm((current) => ({ ...current, resolveByTime: event.target.value }))
              }
              className="mt-2 w-full rounded-2xl border border-[color:var(--line)] bg-white/4 px-4 py-3 outline-none"
            />
          </label>
        </div>

        <label className="block text-sm font-medium">
          Resolution criteria
          <textarea
            value={form.resolutionCriteria}
            onChange={(event) =>
              setForm((current) => ({ ...current, resolutionCriteria: event.target.value }))
            }
            className="mt-2 min-h-28 w-full rounded-2xl border border-[color:var(--line)] bg-white/4 px-4 py-3 outline-none"
          />
        </label>

        <label className="block text-sm font-medium">
          Resolution source
          <textarea
            value={form.resolutionSource}
            onChange={(event) =>
              setForm((current) => ({ ...current, resolutionSource: event.target.value }))
            }
            className="mt-2 min-h-24 w-full rounded-2xl border border-[color:var(--line)] bg-white/4 px-4 py-3 outline-none"
          />
        </label>

        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-full bg-[color:var(--accent)] px-5 py-3 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-65"
        >
          {isSubmitting ? "Saving..." : "Save market"}
        </button>
        {message ? <p className="text-sm font-medium text-[color:var(--accent)]">{message}</p> : null}
        {error ? <p className="text-sm font-medium text-rose-300">{error}</p> : null}
      </form>
    </section>
  );
}
