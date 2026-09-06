import { decimal, index, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const products = mysqlTable(
  "products",
  {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 180 }).notNull(),
    barcode: varchar("barcode", { length: 80 }),
    category: varchar("category", { length: 100 }).default("General").notNull(),
    unit: varchar("unit", { length: 24 }).default("pcs").notNull(),
    quantity: decimal("quantity", { precision: 12, scale: 3 }).default("0").notNull(),
    minStock: decimal("minStock", { precision: 12, scale: 3 }).default("0").notNull(),
    purchasePrice: decimal("purchasePrice", { precision: 12, scale: 2 }).default("0").notNull(),
    sellingPrice: decimal("sellingPrice", { precision: 12, scale: 2 }).default("0").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    nameIdx: index("products_name_idx").on(table.name),
    barcodeIdx: index("products_barcode_idx").on(table.barcode),
  }),
);

export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;
