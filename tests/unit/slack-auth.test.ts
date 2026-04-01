import { afterEach, describe, expect, it, vi } from "vitest";

async function loadSlackModule(envOverrides?: Record<string, string | undefined>) {
  delete process.env.DATABASE_URL;
  delete process.env.LOCAL_DEV_MODE;
  delete process.env.LOCAL_STATE_PATH;
  delete process.env.SLACK_BOT_TOKEN;
  delete process.env.SLACK_VERIFICATION_CODE_TTL_MINUTES;
  delete process.env.ADMIN_TOTP_SECRET;

  for (const [key, value] of Object.entries(envOverrides ?? {})) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  vi.resetModules();
  return import("@/lib/auth/slack");
}

afterEach(() => {
  vi.resetModules();
  delete process.env.DATABASE_URL;
  delete process.env.LOCAL_DEV_MODE;
  delete process.env.LOCAL_STATE_PATH;
  delete process.env.SLACK_BOT_TOKEN;
  delete process.env.SLACK_VERIFICATION_CODE_TTL_MINUTES;
  delete process.env.ADMIN_TOTP_SECRET;
});

describe("Slack auth helpers", () => {
  it("formats the Slack DM with the configured expiration window", async () => {
    const { formatVerificationCodeMessage } = await loadSlackModule({
      SLACK_VERIFICATION_CODE_TTL_MINUTES: "15",
    });

    expect(formatVerificationCodeMessage("123456")).toBe(
      "Your RocketMarket verification code is 123456. It expires in 15 minutes.",
    );
  });

  it("requires team mode persistence before requesting a Slack code", async () => {
    const { requestSlackVerificationCode } = await loadSlackModule({
      SLACK_BOT_TOKEN: "xoxb-test-token",
      ALLOWED_EMAIL_DOMAIN: "ubcrocket.com",
    });

    await expect(
      requestSlackVerificationCode("member@ubcrocket.com"),
    ).rejects.toThrow("Slack login requires PostgreSQL-backed team mode.");
  });

  it("generates a stable 6-digit TOTP code for a known timestamp", async () => {
    const { generateTotpCode } = await loadSlackModule();

    expect(generateTotpCode("JBSWY3DPEHPK3PXP", 0)).toBe("282760");
    expect(generateTotpCode("JBSWY3DPEHPK3PXP", 30_000)).toBe("996554");
  });
});
