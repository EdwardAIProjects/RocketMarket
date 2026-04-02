"use client";

import { useMemo, useState } from "react";
import type { AdminUserRecord } from "@/lib/types";
import { AdminUserEditor } from "@/components/admin-user-editor";

export function AdminUserManager({ users }: { users: AdminUserRecord[] }) {
  const sortedUsers = useMemo(
    () => [...users].sort((left, right) => left.name.localeCompare(right.name)),
    [users],
  );
  const [selectedUserId, setSelectedUserId] = useState(sortedUsers[0]?.id ?? "");
  const selectedUser =
    sortedUsers.find((user) => user.id === selectedUserId) ?? sortedUsers[0] ?? null;

  return (
    <section className="grid gap-6 xl:grid-cols-[0.72fr_1.28fr]">
      <div className="panel rounded-[28px] p-5">
        <div className="eyebrow">Users</div>
        <h2 className="mt-2 text-lg font-semibold">Choose a user to edit</h2>
        <div className="mt-5 space-y-3">
          {sortedUsers.map((user) => {
            const isSelected = user.id === selectedUser?.id;

            return (
              <button
                key={user.id}
                type="button"
                onClick={() => setSelectedUserId(user.id)}
                className={`w-full rounded-[20px] border p-4 text-left transition ${
                  isSelected
                    ? "border-[color:var(--accent)] bg-[color:var(--accent)]/10"
                    : "border-[color:var(--line)] bg-white/4 hover:bg-white/7"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{user.name}</div>
                    <div className="truncate text-xs text-[color:var(--muted)]">{user.email}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {user.isBanned ? (
                      <div className="rounded-full border border-rose-500/40 px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-rose-200">
                        banned
                      </div>
                    ) : null}
                    <div className="rounded-full border border-[color:var(--line)] px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-[color:var(--muted)]">
                      {user.role}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {selectedUser ? (
        <AdminUserEditor key={selectedUser.id} user={selectedUser} />
      ) : (
        <div className="panel rounded-[28px] p-5 text-sm text-[color:var(--muted)]">
          No users available.
        </div>
      )}
    </section>
  );
}
