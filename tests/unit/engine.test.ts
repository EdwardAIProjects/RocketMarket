import { describe, expect, it } from "vitest";
import { createCpmmState, quoteTrade, settlementValue } from "@/lib/markets/engine";

describe("quoteTrade", () => {
  it("moves the market up when buying YES", () => {
    const quote = quoteTrade({
      side: "buy_yes",
      amount: 100,
      ammState: createCpmmState(0.45),
    });

    expect(quote.probabilityAfter).toBeGreaterThan(quote.probabilityBefore);
    expect(quote.shares).toBeGreaterThan(0);
  });

  it("moves the market down when buying NO", () => {
    const quote = quoteTrade({
      side: "buy_no",
      amount: 100,
      ammState: createCpmmState(0.67),
    });

    expect(quote.probabilityAfter).toBeLessThan(quote.probabilityBefore);
  });

  it("gives diminishing returns on larger YES buys", () => {
    const small = quoteTrade({
      side: "buy_yes",
      amount: 50,
      ammState: createCpmmState(0.5),
    });
    const large = quoteTrade({
      side: "buy_yes",
      amount: 500,
      ammState: createCpmmState(0.5),
    });

    expect(large.shares / 500).toBeLessThan(small.shares / 50);
  });
});

describe("settlementValue", () => {
  it("pays YES holders on a YES resolution", () => {
    expect(settlementValue("buy_yes", 20, "yes")).toBe(20);
    expect(settlementValue("buy_no", 20, "yes")).toBe(0);
  });

  it("supports partial outcomes", () => {
    expect(settlementValue("buy_yes", 100, "partial", 0.4)).toBe(40);
    expect(settlementValue("buy_no", 100, "partial", 0.4)).toBe(60);
  });
});
