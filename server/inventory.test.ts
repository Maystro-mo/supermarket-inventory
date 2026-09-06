import { describe, expect, it } from "vitest";
import { calculateRetailValue, calculateStockValue, calculateVariance, calculateVarianceValue, isLowStock, toNumber } from "../shared/inventory";

describe("inventory calculations", () => {
  it("calculates purchase stock value from quantity and unit cost", () => {
    expect(calculateStockValue("12.5", "2.40")).toBeCloseTo(30);
  });

  it("calculates retail value from quantity and selling price", () => {
    expect(calculateRetailValue(8, 3.75)).toBeCloseTo(30);
  });

  it("flags items at or below their configured minimum", () => {
    expect(isLowStock(5, 5)).toBe(true);
    expect(isLowStock(5, 4)).toBe(false);
    expect(isLowStock(0, 0)).toBe(false);
  });

  it("normalizes invalid numeric input to zero", () => {
    expect(toNumber("not-a-number")).toBe(0);
    expect(toNumber(undefined)).toBe(0);
  });

  it("calculates signed stock-take variance and its purchase value", () => {
    expect(calculateVariance(10, 8)).toBe(-2);
    expect(calculateVarianceValue(-2, 4.5)).toBeCloseTo(-9);
  });
});
