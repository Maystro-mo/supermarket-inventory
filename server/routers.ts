import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { createCategory, createProduct, createStockTakeReport, deleteCategory, deleteProduct, getInventorySummary, getStockTakeReport, listCategories, listProducts, listStockTakeReports, updateProduct } from "./db";

const productInput = z.object({ name: z.string().trim().min(1).max(180), barcode: z.string().trim().max(80).optional().or(z.literal("")), category: z.string().trim().min(1).max(100), unit: z.string().trim().min(1).max(24), quantity: z.coerce.number().min(0), minStock: z.coerce.number().min(0), purchasePrice: z.coerce.number().min(0), sellingPrice: z.coerce.number().min(0) });
const productValues = (input: z.infer<typeof productInput>) => ({ name: input.name, barcode: input.barcode || null, category: input.category, unit: input.unit, quantity: input.quantity.toFixed(3), minStock: input.minStock.toFixed(3), purchasePrice: input.purchasePrice.toFixed(2), sellingPrice: input.sellingPrice.toFixed(2) });

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => { const cookieOptions = getSessionCookieOptions(ctx.req); ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 }); return { success: true } as const; }),
  }),
  products: router({
    list: protectedProcedure.input(z.object({ search: z.string().optional() })).query(({ input }) => listProducts(input.search)),
    summary: protectedProcedure.query(() => getInventorySummary()),
    create: protectedProcedure.input(productInput).mutation(({ input }) => createProduct(productValues(input))),
    update: protectedProcedure.input(productInput.extend({ id: z.number().int().positive() })).mutation(({ input }) => { const { id, ...values } = input; return updateProduct(id, productValues(values)); }),
    delete: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ input }) => deleteProduct(input.id)),
  }),
  categories: router({
    list: protectedProcedure.query(() => listCategories()),
    create: protectedProcedure.input(z.object({ name: z.string().trim().min(1).max(100) })).mutation(({ input }) => createCategory({ name: input.name })),
    delete: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ input }) => deleteCategory(input.id)),
  }),
  stockTakes: router({
    list: protectedProcedure.query(() => listStockTakeReports()),
    get: protectedProcedure.input(z.object({ id: z.number().int().positive() })).query(({ input }) => getStockTakeReport(input.id)),
    create: protectedProcedure.input(z.object({ notes: z.string().max(500).optional(), items: z.array(z.object({ productId: z.number().int().positive(), countedQuantity: z.coerce.number().min(0) })).min(1) })).mutation(({ input }) => createStockTakeReport(input)),
  }),
});

export type AppRouter = typeof appRouter;
