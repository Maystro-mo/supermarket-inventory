export function toNumber(value: string | number | null | undefined): number {
  const parsed = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function calculateStockValue(quantity: string | number, purchasePrice: string | number): number {
  return toNumber(quantity) * toNumber(purchasePrice);
}

export function calculateRetailValue(quantity: string | number, sellingPrice: string | number): number {
  return toNumber(quantity) * toNumber(sellingPrice);
}

export function isLowStock(quantity: string | number, minStock: string | number): boolean {
  const minimum = toNumber(minStock);
  return minimum > 0 && toNumber(quantity) <= minimum;
}

export function calculateVariance(systemQuantity: string | number, countedQuantity: string | number): number {
  return toNumber(countedQuantity) - toNumber(systemQuantity);
}

export function calculateVarianceValue(variance: string | number, purchasePrice: string | number): number {
  return toNumber(variance) * toNumber(purchasePrice);
}
