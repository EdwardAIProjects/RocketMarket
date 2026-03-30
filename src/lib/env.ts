export const env = {
  databaseUrl: process.env.DATABASE_URL ?? "",
  authSecret: process.env.AUTH_SECRET ?? "dev-secret",
  googleClientId: process.env.AUTH_GOOGLE_ID ?? "",
  googleClientSecret: process.env.AUTH_GOOGLE_SECRET ?? "",
  nextAuthUrl: process.env.NEXTAUTH_URL ?? "",
  allowedEmailDomain: process.env.ALLOWED_EMAIL_DOMAIN ?? "",
  adminEmailsCsv: process.env.ADMIN_EMAILS ?? "",
  localDevMode: process.env.LOCAL_DEV_MODE === "true",
  localStatePath: process.env.LOCAL_STATE_PATH ?? "/tmp/rocketmarket-local.json",
};

export function isDemoMode() {
  return !env.localDevMode && env.databaseUrl.length === 0;
}

export function isLocalMode() {
  return env.localDevMode;
}

export function hasGoogleOAuthConfigured() {
  return env.googleClientId.length > 0 && env.googleClientSecret.length > 0;
}
