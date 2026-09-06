import { asc, eq, like, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertProduct, InsertUser, products, users } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  type TextField = (typeof textFields)[number];

  for (const field of textFields) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
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
  const filter = trimmed
    ? or(
        like(products.name, `%${trimmed}%`),
        like(products.barcode, `%${trimmed}%`),
        like(products.category, `%${trimmed}%`),
      )
    : undefined;

  return db
    .select()
    .from(products)
    .where(filter)
    .orderBy(asc(products.name));
}

export async function getInventorySummary() {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");

  const [summary] = await db
    .select({
      totalProducts: sql<number>`count(*)`,
      totalUnits: sql<string>`coalesce(sum(${products.quantity}), 0)`,
      purchaseValue: sql<string>`coalesce(sum(${products.quantity} * ${products.purchasePrice}), 0)`,
      retailValue: sql<string>`coalesce(sum(${products.quantity} * ${products.sellingPrice}), 0)`,
      lowStock: sql<number>`coalesce(sum(case when ${products.minStock} > 0 and ${products.quantity} <= ${products.minStock} then 1 else 0 end), 0)`,
    })
    .from(products);

  return {
    totalProducts: Number(summary?.totalProducts ?? 0),
    totalUnits: Number(summary?.totalUnits ?? 0),
    purchaseValue: Number(summary?.purchaseValue ?? 0),
    retailValue: Number(summary?.retailValue ?? 0),
    lowStock: Number(summary?.lowStock ?? 0),
  };
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
