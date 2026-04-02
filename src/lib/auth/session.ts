import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { authOptions } from "@/auth";
import { getDb } from "@/lib/db";
import { isDemoMode, isLocalMode } from "@/lib/env";
import { users } from "@/lib/db/schema";
import { getLocalUserByEmail } from "@/lib/local-store";

async function getActiveUserByEmail(email: string) {
  if (isLocalMode()) {
    const localUser = await getLocalUserByEmail(email);

    if (!localUser || localUser.isBanned) {
      return null;
    }

    return {
      id: localUser.id,
      name: localUser.name,
      email: localUser.email,
      emailVerified: null,
      image: null,
      role: localUser.role,
      startingBalance: localUser.startingBalance.toFixed(2),
      cashBalance: localUser.cashBalance.toFixed(2),
      bankruptcyCount: localUser.bankruptcyCount,
      createdAt: new Date(localUser.createdAt),
    };
  }

  const db = getDb();
  if (!db) {
    return null;
  }

  const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const user = rows[0] ?? null;

  if (!user || user.isBanned) {
    return null;
  }

  return user;
}

export async function getCurrentSession() {
  if (isDemoMode()) {
    return null;
  }

  const session = await getServerSession(authOptions);
  const email = session?.user?.email;

  if (!email) {
    return session;
  }

  return (await getActiveUserByEmail(email)) ? session : null;
}

export async function getCurrentUser() {
  if (isDemoMode()) {
    return null;
  }

  const session = await getCurrentSession();
  const email = session?.user?.email;

  if (!email) {
    return null;
  }

  return getActiveUserByEmail(email);
}

export async function requireCurrentUser(callbackPath?: string) {
  const user = await getCurrentUser();

  if (!user) {
    const target = callbackPath
      ? `/api/auth/signin?callbackUrl=${encodeURIComponent(callbackPath)}`
      : "/api/auth/signin";
    redirect(target);
  }

  return user;
}

export async function requireAdmin(callbackPath?: string) {
  const user = await requireCurrentUser(callbackPath);

  if (user.role !== "admin") {
    redirect("/");
  }

  return user;
}
