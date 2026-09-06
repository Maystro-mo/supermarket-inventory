import { asc, desc, eq, inArray, like, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { categories, InsertCategory, InsertProduct, InsertUser, products, stockTakeItems, stockTakeReports, users } from "../drizzle/schema";
import { calculateVariance, calculateVarianceValue } from "../shared/inventory";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try { _db = drizzle(process.env.DATABASE_URL); }
    catch (error) { console.warn("[Database] Failed to connect:", error); _db = null; }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    if (user[field] !== undefined) { values[field] = user[field] ?? null; updateSet[field] = user[field] ?? null; }
  }
  if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
  if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
  else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function listProducts(search?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const trimmed = search?.trim();
  const filter = trimmed ? or(like(products.name, `%${trimmed}%`), like(products.barcode, `%${trimmed}%`), like(products.category, `%${trimmed}%`)) : undefined;
  return db.select().from(products).where(filter).orderBy(asc(products.name));
}

export async function getInventorySummary() {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const [summary] = await db.select({
    totalProducts: sql<number>`count(*)`,
    totalUnits: sql<string>`coalesce(sum(${products.quantity}), 0)`,
    purchaseValue: sql<string>`coalesce(sum(${products.quantity} * ${products.purchasePrice}), 0)`,
    retailValue: sql<string>`coalesce(sum(${products.quantity} * ${products.sellingPrice}), 0)`,
    lowStock: sql<number>`coalesce(sum(case when ${products.minStock} > 0 and ${products.quantity} <= ${products.minStock} then 1 else 0 end), 0)`,
  }).from(products);
  return { totalProducts: Number(summary?.totalProducts ?? 0), totalUnits: Number(summary?.totalUnits ?? 0), purchaseValue: Number(summary?.purchaseValue ?? 0), retailValue: Number(summary?.retailValue ?? 0), lowStock: Number(summary?.lowStock ?? 0) };
}

export async function createProduct(product: InsertProduct) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.insert(products).values(product);
  const id = Number(result[0].insertId);
  const [created] = await db.select().from(products).where(eq(products.id, id)).limit(1);
  return created;
}

export async function updateProduct(id: number, product: Partial<InsertProduct>) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.update(products).set(product).where(eq(products.id, id));
  const [updated] = await db.select().from(products).where(eq(products.id, id)).limit(1);
  return updated;
}

export async function deleteProduct(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.delete(products).where(eq(products.id, id));
  return { success: true } as const;
}

export async function listCategories() {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.select().from(categories).orderBy(asc(categories.name));
}

export async function createCategory(category: InsertCategory) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.insert(categories).values(category);
  const [created] = await db.select().from(categories).where(eq(categories.id, Number(result[0].insertId))).limit(1);
  return created;
}

export async function deleteCategory(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const [category] = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
  if (category) await db.delete(categories).where(eq(categories.id, id));
  return { success: true, name: category?.name } as const;
}

export async function listStockTakeReports() {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.select().from(stockTakeReports).orderBy(desc(stockTakeReports.createdAt));
}

export async function getStockTakeReport(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const [report] = await db.select().from(stockTakeReports).where(eq(stockTakeReports.id, id)).limit(1);
  const items = await db.select().from(stockTakeItems).where(eq(stockTakeItems.reportId, id)).orderBy(asc(stockTakeItems.productName));
  return { report, items };
}

export async function createStockTakeReport(input: { notes?: string; items: Array<{ productId: number; countedQuantity: number }> }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  if (input.items.length === 0) throw new Error("Add at least one product to the stock take");
  const ids = input.items.map(item => item.productId);
  const currentProducts = await db.select().from(products).where(inArray(products.id, ids));
  const byId = new Map(currentProducts.map(product => [product.id, product]));
  const snapshots = input.items.flatMap(item => {
    const product = byId.get(item.productId);
    if (!product) return [];
    const systemQuantity = Number(product.quantity);
    const countedQuantity = Math.max(0, item.countedQuantity);
    const variance = calculateVariance(systemQuantity, countedQuantity);
    return [{ productId: product.id, productName: product.name, unit: product.unit, systemQuantity, countedQuantity, variance, purchasePrice: Number(product.purchasePrice) }];
  });
  if (snapshots.length === 0) throw new Error("No valid products were found");
  const varianceUnits = snapshots.reduce((total, item) => total + item.variance, 0);
  const varianceValue = snapshots.reduce((total, item) => total + calculateVarianceValue(item.variance, item.purchasePrice), 0);
  const reportResult = await db.insert(stockTakeReports).values({ notes: input.notes?.trim() || null, productCount: snapshots.length, varianceUnits: varianceUnits.toFixed(3), varianceValue: varianceValue.toFixed(2) });
  const reportId = Number(reportResult[0].insertId);
  await db.insert(stockTakeItems).values(snapshots.map(item => ({ reportId, productId: item.productId, productName: item.productName, unit: item.unit, systemQuantity: item.systemQuantity.toFixed(3), countedQuantity: item.countedQuantity.toFixed(3), variance: item.variance.toFixed(3), purchasePrice: item.purchasePrice.toFixed(2) })));
  return getStockTakeReport(reportId);
}
