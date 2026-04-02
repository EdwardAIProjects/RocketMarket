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

describe("market lifecycle", () => {
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

  it("automatically closes local markets once the close time has passed", async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), "rocketmarket-market-lifecycle-"));
    const statePath = path.join(tempDir, "state.json");
    const { getMarketById, readLocalState, writeLocalState } = await loadLocalModules(statePath);

    const seededState = await readLocalState();
    const market = seededState.markets.find((entry) => entry.status === "open");

    if (!market) {
      throw new Error("Expected a seeded open market.");
    }

    market.closeTime = new Date(Date.now() - 60_000).toISOString();
    await writeLocalState(seededState);

    const updatedMarket = await getMarketById(market.id);
    const normalizedState = await readLocalState();

    expect(updatedMarket?.status).toBe("closed");
    expect(normalizedState.markets.find((entry) => entry.id === market.id)?.status).toBe("closed");
  });

  it("lets admins manually close and reopen unresolved markets in local mode", async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), "rocketmarket-market-lifecycle-"));
    const statePath = path.join(tempDir, "state.json");
    const { readLocalState, setAdminMarketStatus } = await loadLocalModules(statePath);

    const seededState = await readLocalState();
    const admin = seededState.users.find((entry) => entry.role === "admin");
    const market = seededState.markets.find((entry) => entry.status === "open");

    if (!admin || !market) {
      throw new Error("Expected seeded admin and open market.");
    }

    const closed = await setAdminMarketStatus(market.id, { status: "closed" }, admin.id);
    const reopened = await setAdminMarketStatus(market.id, { status: "open" }, admin.id);

    expect(closed.status).toBe("closed");
    expect(reopened.status).toBe("open");
  });

  it("lets admins delete local markets that have no trades", async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), "rocketmarket-market-lifecycle-"));
    const statePath = path.join(tempDir, "state.json");
    const { createMarket, deleteAdminMarket, readLocalState, getMarketById } =
      await loadLocalModules(statePath);

    const seededState = await readLocalState();
    const admin = seededState.users.find((entry) => entry.role === "admin");

    if (!admin) {
      throw new Error("Expected a seeded admin.");
    }

    const market = await createMarket(
      {
        question: "Will a deletion-safe draft market exist?",
        description: "",
        category: "Test",
        closeTime: new Date(Date.now() + 60_000).toISOString(),
        resolveByTime: new Date(Date.now() + 120_000).toISOString(),
        resolutionCriteria: "Check whether the market exists.",
        resolutionSource: "Admin test action",
      },
      admin.id,
    );

    await deleteAdminMarket(market.id, admin.id);

    expect(await getMarketById(market.id)).toBeUndefined();
    expect((await readLocalState()).markets.some((entry) => entry.id === market.id)).toBe(false);
  });

  it("blocks local market deletion once trades exist", async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), "rocketmarket-market-lifecycle-"));
    const statePath = path.join(tempDir, "state.json");
    const { deleteAdminMarket, readLocalState } = await loadLocalModules(statePath);

    const seededState = await readLocalState();
    const admin = seededState.users.find((entry) => entry.role === "admin");
    const tradedMarket = seededState.markets.find((market) =>
      seededState.trades.some((trade) => trade.marketId === market.id),
    );

    if (!admin || !tradedMarket) {
      throw new Error("Expected a seeded admin and traded market.");
    }

    await expect(deleteAdminMarket(tradedMarket.id, admin.id)).rejects.toThrow(
      "Markets with trades cannot be deleted.",
    );
  });

  it("lets admins ban and unban local users", async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), "rocketmarket-market-lifecycle-"));
    const statePath = path.join(tempDir, "state.json");
    const { readLocalState, updateAdminUser } = await loadLocalModules(statePath);

    const seededState = await readLocalState();
    const admin = seededState.users.find((entry) => entry.role === "admin");
    const member = seededState.users.find((entry) => entry.role === "member");

    if (!admin || !member) {
      throw new Error("Expected a seeded admin and member.");
    }

    const banned = await updateAdminUser(
      member.id,
      {
        name: member.name,
        email: member.email,
        role: member.role,
        isBanned: true,
        startingBalance: member.startingBalance,
        cashBalance: member.cashBalance,
        bankruptcyCount: member.bankruptcyCount,
      },
      admin.id,
    );

    const unbanned = await updateAdminUser(
      member.id,
      {
        name: member.name,
        email: member.email,
        role: member.role,
        isBanned: false,
        startingBalance: member.startingBalance,
        cashBalance: member.cashBalance,
        bankruptcyCount: member.bankruptcyCount,
      },
      admin.id,
    );

    expect(banned.isBanned).toBe(true);
    expect(unbanned.isBanned).toBe(false);
  });

  it("prevents removing the last active admin in local mode", async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), "rocketmarket-market-lifecycle-"));
    const statePath = path.join(tempDir, "state.json");
    const { readLocalState, updateAdminUser } = await loadLocalModules(statePath);

    const seededState = await readLocalState();
    const admin = seededState.users.find((entry) => entry.role === "admin");

    if (!admin) {
      throw new Error("Expected a seeded admin.");
    }

    await expect(
      updateAdminUser(
        admin.id,
        {
          name: admin.name,
          email: admin.email,
          role: "admin",
          isBanned: true,
          startingBalance: admin.startingBalance,
          cashBalance: admin.cashBalance,
          bankruptcyCount: admin.bankruptcyCount,
        },
        admin.id,
      ),
    ).rejects.toThrow("At least one active admin must remain.");
  });
});
