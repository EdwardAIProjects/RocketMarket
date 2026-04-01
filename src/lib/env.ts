export const env = {
  databaseUrl: process.env.DATABASE_URL ?? "",
  authSecret: process.env.AUTH_SECRET ?? "dev-secret",
  nextAuthUrl: process.env.NEXTAUTH_URL ?? "",
  allowedEmailDomain: process.env.ALLOWED_EMAIL_DOMAIN ?? "",
  adminEmailsCsv: process.env.ADMIN_EMAILS ?? "",
  adminTotpSecret: process.env.ADMIN_TOTP_SECRET ?? "",
  slackBotToken: process.env.SLACK_BOT_TOKEN ?? "",
  slackVerificationCodeTtlMinutes: Number(
    process.env.SLACK_VERIFICATION_CODE_TTL_MINUTES ?? "10",
  ),
  localDevMode: process.env.LOCAL_DEV_MODE === "true",
  localStatePath: process.env.LOCAL_STATE_PATH ?? "/tmp/rocketmarket-local.json",
};

export function isDemoMode() {
  return !env.localDevMode && env.databaseUrl.length === 0;
}

export function isLocalMode() {
  return env.localDevMode;
}

export function hasSlackAuthConfigured() {
  return env.slackBotToken.length > 0;
}
