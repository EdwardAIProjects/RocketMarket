import Link from "next/link";
import { AdminUserManager } from "@/components/admin-user-manager";
import { requireAdmin } from "@/lib/auth/session";
import { listAdminUsers } from "@/lib/data/service";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  await requireAdmin("/admin/users");
  const users = await listAdminUsers();

  return (
    <div className="space-y-6">
      <section className="panel rounded-[36px] px-6 py-7 sm:px-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="eyebrow">Admin</div>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight">
              Adjust user identity, roles, and balances.
            </h1>
          </div>
          <Link
            href="/admin/markets"
            className="rounded-full border border-[color:var(--line)] px-4 py-2 text-sm font-semibold text-[color:var(--muted)] transition hover:text-foreground"
          >
            Manage markets
          </Link>
        </div>
      </section>

      <AdminUserManager users={users} />
    </div>
  );
}
