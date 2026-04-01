import { createHash, createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { verificationTokens, users } from "@/lib/db/schema";
import { env } from "@/lib/env";

const adminEmails = new Set(
  env.adminEmailsCsv
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean),
);

function isAdminEmail(email: string) {
  return adminEmails.has(normalizeEmail(email));
}

interface SlackApiResponse {
  ok: boolean;
  error?: string;
}

interface SlackLookupResponse extends SlackApiResponse {
  user?: {
    id: string;
    deleted?: boolean;
    is_bot?: boolean;
    real_name?: string;
    profile?: {
      display_name?: string;
      display_name_normalized?: string;
      real_name?: string;
      image_192?: string;
      email?: string;
    };
  };
}

interface SlackConversationOpenResponse extends SlackApiResponse {
  channel?: {
    id: string;
  };
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function verificationIdentifier(email: string) {
  return `slack-login:${normalizeEmail(email)}`;
}

function codeHash(email: string, code: string) {
  return createHash("sha256")
    .update(`${env.authSecret}:${normalizeEmail(email)}:${code.trim()}`)
    .digest("hex");
}

function base32ToBuffer(secret: string) {
  const normalized = secret.toUpperCase().replace(/=+$/g, "").replace(/[^A-Z2-7]/g, "");

  if (!normalized) {
    throw new Error("Admin TOTP secret is not configured.");
  }

  let bits = "";
  for (const char of normalized) {
    const value = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567".indexOf(char);
    if (value === -1) {
      throw new Error("Admin TOTP secret is invalid.");
    }
    bits += value.toString(2).padStart(5, "0");
  }

  const bytes = [];
  for (let index = 0; index + 8 <= bits.length; index += 8) {
    bytes.push(Number.parseInt(bits.slice(index, index + 8), 2));
  }

  return Buffer.from(bytes);
}

function hotp(secret: Buffer, counter: number, digits = 6) {
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));

  const digest = createHmac("sha1", secret).update(counterBuffer).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const codeInt =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);

  return String(codeInt % 10 ** digits).padStart(digits, "0");
}

export function generateTotpCode(secretInput: string, timestamp = Date.now()) {
  const secret = base32ToBuffer(secretInput);
  const counter = Math.floor(timestamp / 30_000);
  return hotp(secret, counter);
}

function verifyTotpCode(secretInput: string, codeInput: string, timestamp = Date.now()) {
  const normalizedCode = codeInput.trim();

  if (!/^\d{6}$/.test(normalizedCode)) {
    return false;
  }

  const secret = base32ToBuffer(secretInput);
  const counter = Math.floor(timestamp / 30_000);

  for (let offset = -1; offset <= 1; offset += 1) {
    const expected = hotp(secret, counter + offset);
    if (timingSafeEqual(Buffer.from(normalizedCode), Buffer.from(expected))) {
      return true;
    }
  }

  return false;
}

function displayNameFromEmail(email: string) {
  const base = email.split("@")[0] ?? "User";
  return base
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

async function upsertTeamUser(input: {
  email: string;
  role: "admin" | "member";
  name: string;
  imageUrl?: string | null;
}) {
  const db = getDb();

  if (!db) {
    throw new Error("Team login requires PostgreSQL-backed team mode.");
  }

  const [existingUser] = await db.select().from(users).where(eq(users.email, input.email)).limit(1);
  let userId = existingUser?.id;

  if (existingUser) {
    await db
      .update(users)
      .set({
        name: input.name,
        image: input.imageUrl ?? null,
        role: input.role,
      })
      .where(eq(users.id, existingUser.id));
  } else {
    const [createdUser] = await db
      .insert(users)
      .values({
        email: input.email,
        name: input.name,
        image: input.imageUrl ?? null,
        role: input.role,
      })
      .returning();

    userId = createdUser.id;
  }

  return {
    id: userId ?? existingUser?.id ?? "",
    email: input.email,
    name: input.name,
    image: input.imageUrl ?? undefined,
  };
}

function slackDisplayName(user: NonNullable<SlackLookupResponse["user"]>, email: string) {
  return (
    user.profile?.display_name_normalized ||
    user.profile?.display_name ||
    user.profile?.real_name ||
    user.real_name ||
    displayNameFromEmail(email)
  );
}

async function slackApi<T extends SlackApiResponse>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(`https://slack.com/api/${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${env.slackBotToken}`,
      ...(init.body ? { "Content-Type": "application/json; charset=utf-8" } : {}),
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Slack verification failed.");
  }

  return (await response.json()) as T;
}

async function lookupSlackUserByEmail(email: string) {
  const response = await slackApi<SlackLookupResponse>(
    `users.lookupByEmail?email=${encodeURIComponent(email)}`,
  );

  if (!response.ok || !response.user || response.user.deleted || response.user.is_bot) {
    throw new Error("Could not verify that email against the UBCRocket Slack workspace.");
  }

  return {
    slackUserId: response.user.id,
    name: slackDisplayName(response.user, email),
    imageUrl: response.user.profile?.image_192 ?? null,
    email: response.user.profile?.email ?? email,
  };
}

async function sendSlackVerificationCode(slackUserId: string, code: string) {
  const openResponse = await slackApi<SlackConversationOpenResponse>("conversations.open", {
    method: "POST",
    body: JSON.stringify({
      users: slackUserId,
      return_im: true,
    }),
  });

  const channelId = openResponse.channel?.id;

  if (!openResponse.ok || !channelId) {
    throw new Error("Could not open a Slack DM for verification.");
  }

  const postResponse = await slackApi<SlackApiResponse>("chat.postMessage", {
    method: "POST",
    body: JSON.stringify({
      channel: channelId,
      text: formatVerificationCodeMessage(code),
    }),
  });

  if (!postResponse.ok) {
    throw new Error("Could not send the Slack verification code.");
  }
}

export function formatVerificationCodeMessage(code: string) {
  return `Your RocketMarket verification code is ${code}. It expires in ${env.slackVerificationCodeTtlMinutes} minutes.`;
}

export async function requestSlackVerificationCode(emailInput: string) {
  const email = normalizeEmail(emailInput);

  if (!env.slackBotToken) {
    throw new Error("Slack login is not configured.");
  }

  if (!email) {
    throw new Error("Email is required.");
  }

  if (isAdminEmail(email)) {
    if (!env.adminTotpSecret) {
      throw new Error("Admin TOTP secret is not configured.");
    }

    return {
      email,
      mode: "admin" as const,
    };
  }

  if (env.allowedEmailDomain && !email.endsWith(`@${env.allowedEmailDomain}`)) {
    throw new Error(`Use your @${env.allowedEmailDomain} email address.`);
  }

  const db = getDb();

  if (!db) {
    throw new Error("Slack login requires PostgreSQL-backed team mode.");
  }

  const slackUser = await lookupSlackUserByEmail(email);

  const code = String(randomInt(100000, 1000000));
  const expiresAt = new Date(
    Date.now() + env.slackVerificationCodeTtlMinutes * 60 * 1000,
  );

  await db
    .delete(verificationTokens)
    .where(eq(verificationTokens.identifier, verificationIdentifier(email)));
  await db.insert(verificationTokens).values({
    identifier: verificationIdentifier(email),
    token: codeHash(email, code),
    expires: expiresAt,
  });

  await sendSlackVerificationCode(slackUser.slackUserId, code);

  return {
    email,
    expiresAt: expiresAt.toISOString(),
    mode: "slack" as const,
  };
}

export async function verifyTeamLoginCode(emailInput: string, codeInput: string) {
  const email = normalizeEmail(emailInput);
  const code = codeInput.trim();

  if (!email || !code) {
    throw new Error("Email and verification code are required.");
  }

  if (isAdminEmail(email)) {
    if (!env.adminTotpSecret) {
      throw new Error("Admin TOTP secret is not configured.");
    }

    if (!verifyTotpCode(env.adminTotpSecret, code)) {
      throw new Error("Invalid admin authenticator code.");
    }

    return upsertTeamUser({
      email,
      role: "admin",
      name: displayNameFromEmail(email),
    });
  }

  if (!env.slackBotToken) {
    throw new Error("Slack login is not configured.");
  }

  const db = getDb();

  if (!db) {
    throw new Error("Slack login requires PostgreSQL-backed team mode.");
  }

  const [tokenRow] = await db
    .select()
    .from(verificationTokens)
    .where(
      and(
        eq(verificationTokens.identifier, verificationIdentifier(email)),
        eq(verificationTokens.token, codeHash(email, code)),
      ),
    )
    .limit(1);

  if (!tokenRow) {
    throw new Error("Invalid or expired verification code.");
  }

  if (tokenRow.expires < new Date()) {
    await db
      .delete(verificationTokens)
      .where(eq(verificationTokens.identifier, verificationIdentifier(email)));
    throw new Error("Invalid or expired verification code.");
  }

  const slackUser = await lookupSlackUserByEmail(email);
  await db
    .delete(verificationTokens)
    .where(eq(verificationTokens.identifier, verificationIdentifier(email)));

  return upsertTeamUser({
    name: slackUser.name,
    email,
    imageUrl: slackUser.imageUrl,
    role: "member",
  });
}
