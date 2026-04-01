import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { getDb } from "@/lib/db";
import { env, isDemoMode, isLocalMode } from "@/lib/env";
import { accounts, sessions, users, verificationTokens } from "@/lib/db/schema";
import { verifyTeamLoginCode } from "@/lib/auth/slack";
import { signInLocalUser } from "@/lib/local-store";

const db = isLocalMode() || isDemoMode() ? null : getDb();

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
    strategy: "jwt",
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
    : !isDemoMode()
      ? [
          CredentialsProvider({
            id: "slack-email-code",
            name: "Slack email code",
            credentials: {
              email: {
                label: "Email",
                type: "email",
              },
              code: {
                label: "Verification code",
                type: "text",
              },
            },
            async authorize(credentials) {
              const email = credentials?.email?.trim().toLowerCase();
              const code = credentials?.code?.trim();

              if (!email || !code) {
                return null;
              }

              return verifyTeamLoginCode(email, code);
            },
          }),
        ]
      : [],
  pages: isLocalMode() || !isDemoMode()
    ? {
        signIn: "/login",
      }
    : undefined,
  callbacks: {
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
};
