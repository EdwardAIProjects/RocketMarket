import type { NextAuthOptions } from "next-auth";
import { eq } from "drizzle-orm";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { getDb } from "@/lib/db";
import { env, hasGoogleOAuthConfigured, isLocalMode } from "@/lib/env";
import { accounts, sessions, users, verificationTokens } from "@/lib/db/schema";
import { signInLocalUser } from "@/lib/local-store";

const db = isLocalMode() ? null : getDb();
const adminEmails = new Set(
  env.adminEmailsCsv
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean),
);

export const authOptions: NextAuthOptions = {
  secret: env.authSecret,
  adapter: db
    ? DrizzleAdapter(db, {
        usersTable: users,
        accountsTable: accounts,
        sessionsTable: sessions,
        verificationTokensTable: verificationTokens,
      })
    : undefined,
  session: {
    strategy: isLocalMode() || !db ? "jwt" : "database",
  },
  providers: isLocalMode()
    ? [
        CredentialsProvider({
          id: "local-email",
          name: "Local email",
          credentials: {
            email: {
              label: "Email",
              type: "email",
            },
          },
          async authorize(credentials) {
            const email = credentials?.email?.trim().toLowerCase();

            if (!email) {
              return null;
            }

            const user = await signInLocalUser(email);
            return {
              id: user.id,
              email: user.email,
              name: user.name,
            };
          },
        }),
      ]
    : hasGoogleOAuthConfigured()
      ? [
          GoogleProvider({
            clientId: env.googleClientId,
            clientSecret: env.googleClientSecret,
          }),
        ]
      : [],
  pages: isLocalMode()
    ? {
        signIn: "/login",
      }
    : undefined,
  callbacks: {
    async signIn({ user }) {
      if (isLocalMode()) {
        return true;
      }

      if (!env.allowedEmailDomain) {
        return true;
      }

      const email = user.email ?? "";
      return email.endsWith(`@${env.allowedEmailDomain}`);
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }

      return token;
    },
    async session({ session, user, token }) {
      if (session.user) {
        (session.user as { id?: string }).id =
          (token.id as string | undefined) ?? user?.id;
      }

      return session;
    },
  },
  events: {
    async signIn({ user }) {
      if (isLocalMode()) {
        return;
      }

      const email = user.email?.toLowerCase();

      if (!db || !email || !adminEmails.has(email)) {
        return;
      }

      await db.update(users).set({ role: "admin" }).where(eq(users.email, email));
    },
  },
};
