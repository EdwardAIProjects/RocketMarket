"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AdminUserRecord } from "@/lib/types";

export function AdminUserEditor({ user }: { user: AdminUserRecord }) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: user.name,
    email: user.email,
    role: user.role,
    startingBalance: String(user.startingBalance),
    cashBalance: String(user.cashBalance),
    bankruptcyCount: String(user.bankruptcyCount),
  });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <div className="panel rounded-[28px] p-5">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <div className="eyebrow">Edit user</div>
          <div className="text-lg font-semibold">{user.name}</div>
          <div className="text-sm text-[color:var(--muted)]">{user.email}</div>
        </div>
        <div className="rounded-full border border-[color:var(--line)] px-3 py-1 text-xs uppercase tracking-[0.16em] text-[color:var(--muted)]">
          {user.role}
        </div>
      </div>

      <form
        className="grid gap-4 md:grid-cols-2"
        onSubmit={async (event) => {
          event.preventDefault();
          setError(null);
          setMessage(null);
          setIsSubmitting(true);

          const response = await fetch(`/api/admin/users/${user.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...form,
              startingBalance: Number(form.startingBalance),
              cashBalance: Number(form.cashBalance),
              bankruptcyCount: Number(form.bankruptcyCount),
            }),
          });

          const payload = (await response.json()) as { error?: string };
          if (!response.ok) {
            setError(payload.error ?? "User update failed.");
            setIsSubmitting(false);
            return;
          }

          setMessage("User updated.");
          setIsSubmitting(false);
          router.refresh();
        }}
      >
        <label className="block text-sm font-medium">
          Name
          <input
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            className="mt-2 w-full rounded-2xl border border-[color:var(--line)] bg-white/4 px-4 py-3 outline-none"
          />
        </label>
        <label className="block text-sm font-medium">
          Email
          <input
            type="email"
            value={form.email}
            onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
            className="mt-2 w-full rounded-2xl border border-[color:var(--line)] bg-white/4 px-4 py-3 outline-none"
          />
        </label>
        <label className="block text-sm font-medium">
          Role
          <select
            value={form.role}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                role: event.target.value as "member" | "admin",
              }))
            }
            className="mt-2 w-full rounded-2xl border border-[color:var(--line)] bg-white/4 px-4 py-3 outline-none"
          >
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
        </label>
        <label className="block text-sm font-medium">
          Bankruptcy count
          <input
            type="number"
            min={0}
            value={form.bankruptcyCount}
            onChange={(event) =>
              setForm((current) => ({ ...current, bankruptcyCount: event.target.value }))
            }
            className="mt-2 w-full rounded-2xl border border-[color:var(--line)] bg-white/4 px-4 py-3 outline-none"
          />
        </label>
        <label className="block text-sm font-medium">
          Starting balance
          <input
            type="number"
            min={0}
            step="0.01"
            value={form.startingBalance}
            onChange={(event) =>
              setForm((current) => ({ ...current, startingBalance: event.target.value }))
            }
            className="mt-2 w-full rounded-2xl border border-[color:var(--line)] bg-white/4 px-4 py-3 outline-none"
          />
        </label>
        <label className="block text-sm font-medium">
          Cash balance
          <input
            type="number"
            min={0}
            step="0.01"
            value={form.cashBalance}
            onChange={(event) =>
              setForm((current) => ({ ...current, cashBalance: event.target.value }))
            }
            className="mt-2 w-full rounded-2xl border border-[color:var(--line)] bg-white/4 px-4 py-3 outline-none"
          />
        </label>
        <div className="flex flex-wrap items-center gap-3 md:col-span-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-full bg-[color:var(--accent)] px-5 py-3 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-65"
          >
            {isSubmitting ? "Saving..." : "Save user"}
          </button>
          {message ? <p className="text-sm font-medium text-[color:var(--accent)]">{message}</p> : null}
          {error ? <p className="text-sm font-medium text-rose-300">{error}</p> : null}
        </div>
      </form>
    </div>
  );
}
