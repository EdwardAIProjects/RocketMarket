"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MarketStatusBadge } from "@/components/market-status-badge";
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
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const statusLocked = market.status === "resolved" || market.status === "canceled";

  return (
    <section className="panel rounded-[28px] p-5">
      <div className="eyebrow">Edit market</div>
      <div className="mt-2 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h2 className="text-lg font-semibold">Update market metadata</h2>
        <MarketStatusBadge status={market.status} />
      </div>

      <div className="mt-5 rounded-[22px] border border-[color:var(--line)] bg-white/4 p-4">
        <div className="text-xs uppercase tracking-[0.18em] text-[color:var(--muted)]">
          Manual market status
        </div>
        <div className="mt-3 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={isUpdatingStatus || statusLocked || market.status === "open"}
            className="rounded-full border border-emerald-400/25 bg-emerald-400/12 px-4 py-2 text-sm font-semibold text-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={async () => {
              setIsUpdatingStatus(true);
              setError(null);
              setMessage(null);

              const response = await fetch(`/api/admin/markets/${market.id}/status`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "open" }),
              });

              const payload = (await response.json()) as { error?: string };
              if (!response.ok) {
                setError(payload.error ?? "Market open failed.");
                setIsUpdatingStatus(false);
                return;
              }

              setMessage("Market opened.");
              setIsUpdatingStatus(false);
              router.refresh();
            }}
          >
            Open market
          </button>
          <button
            type="button"
            disabled={isUpdatingStatus || statusLocked || market.status === "closed"}
            className="rounded-full border border-amber-400/25 bg-amber-400/12 px-4 py-2 text-sm font-semibold text-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={async () => {
              setIsUpdatingStatus(true);
              setError(null);
              setMessage(null);

              const response = await fetch(`/api/admin/markets/${market.id}/status`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "closed" }),
              });

              const payload = (await response.json()) as { error?: string };
              if (!response.ok) {
                setError(payload.error ?? "Market close failed.");
                setIsUpdatingStatus(false);
                return;
              }

              setMessage("Market closed.");
              setIsUpdatingStatus(false);
              router.refresh();
            }}
          >
            Close market
          </button>
        </div>
        <p className="mt-3 text-sm text-[color:var(--muted)]">
          {statusLocked
            ? "Resolved and canceled markets are locked from manual reopen/close changes."
            : "Admins can manually open or close unresolved markets here."}
        </p>
      </div>

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
          Resolution source <span className="text-[color:var(--muted)]">(optional)</span>
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
          disabled={isSubmitting || isDeleting}
          className="rounded-full bg-[color:var(--accent)] px-5 py-3 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-65"
        >
          {isSubmitting ? "Saving..." : "Save market"}
        </button>
        <button
          type="button"
          disabled={isSubmitting || isUpdatingStatus || isDeleting}
          className="ml-3 rounded-full border border-rose-400/25 bg-rose-400/12 px-5 py-3 text-sm font-semibold text-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={async () => {
            const confirmed = window.confirm(
              "Delete this market? Markets with trades cannot be deleted.",
            );

            if (!confirmed) {
              return;
            }

            setIsDeleting(true);
            setError(null);
            setMessage(null);

            const response = await fetch(`/api/admin/markets/${market.id}`, {
              method: "DELETE",
            });

            const payload = (await response.json()) as { error?: string };

            if (!response.ok) {
              setError(payload.error ?? "Market deletion failed.");
              setIsDeleting(false);
              return;
            }

            router.push("/admin/markets");
            router.refresh();
          }}
        >
          {isDeleting ? "Deleting..." : "Delete market"}
        </button>
        {message ? <p className="text-sm font-medium text-[color:var(--accent)]">{message}</p> : null}
        {error ? <p className="text-sm font-medium text-rose-300">{error}</p> : null}
      </form>
    </section>
  );
}
