import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

async function loadLocalModules(statePath: string) {
  process.env.LOCAL_DEV_MODE = "true";
  process.env.LOCAL_STATE_PATH = statePath;
  delete process.env.DATABASE_URL;

  vi.resetModules();

  const service = await import("@/lib/data/service");
  const localStore = await import("@/lib/local-store");

  return {
    ...service,
    ...localStore,
  };
}

describe("declareBankruptcy", () => {
  let tempDir: string | undefined;

  afterEach(async () => {
    vi.resetModules();
    delete process.env.LOCAL_DEV_MODE;
    delete process.env.LOCAL_STATE_PATH;
    delete process.env.DATABASE_URL;

    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
      tempDir = undefined;
    }
  });

  it("resets a local user to the starting balance and clears their positions", async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), "rocketmarket-bankruptcy-"));
    const statePath = path.join(tempDir, "state.json");
    const {
      declareBankruptcy,
      executeTrade,
      formatLeaderboardUserName,
      getLeaderboard,
      readLocalState,
      signInLocalUser,
    } = await loadLocalModules(statePath);

    const user = await signInLocalUser("bankrupt@example.com");
    const seededState = await readLocalState();
    const marketId = seededState.markets[0]?.id;

    if (!marketId) {
      throw new Error("Expected a seeded market.");
    }

    await executeTrade({
      marketId,
      side: "buy_yes",
      amount: 500,
      actorUserId: user.id,
    });

    const portfolio = await declareBankruptcy(user.id);
    const updatedState = await readLocalState();
    const updatedUser = updatedState.users.find((entry) => entry.id === user.id);
    const leaderboardEntry = (await getLeaderboard()).find((entry) => entry.user.id === user.id);

    expect(portfolio.cashBalance).toBe(10000);
    expect(portfolio.estimatedValue).toBe(10000);
    expect(portfolio.realizedPnl).toBe(0);
    expect(portfolio.positions).toHaveLength(0);
    expect(portfolio.user.bankruptcyCount).toBe(1);
    expect(updatedUser?.bankruptcyCount).toBe(1);
    expect(updatedState.positions.some((position) => position.userId === user.id)).toBe(false);
    expect(
      updatedState.ledgerEntries.some(
        (entry) =>
          entry.userId === user.id &&
          entry.type === "manual_adjustment" &&
          entry.note?.includes("Bankruptcy reset #1"),
      ),
    ).toBe(true);
    expect(leaderboardEntry?.user.bankruptcyCount).toBe(1);
    expect(
      leaderboardEntry ? formatLeaderboardUserName(leaderboardEntry.user) : "",
    ).toContain("bankruptcy x1");
  });

  it("increments the bankruptcy counter on repeated resets", async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), "rocketmarket-bankruptcy-"));
    const statePath = path.join(tempDir, "state.json");
    const { declareBankruptcy, readLocalState, signInLocalUser } =
      await loadLocalModules(statePath);

    const user = await signInLocalUser("repeat@example.com");

    await declareBankruptcy(user.id);
    const portfolio = await declareBankruptcy(user.id);
    const updatedState = await readLocalState();
    const updatedUser = updatedState.users.find((entry) => entry.id === user.id);

    expect(portfolio.user.bankruptcyCount).toBe(2);
    expect(updatedUser?.bankruptcyCount).toBe(2);
  });
});
