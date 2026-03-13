import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import { getUberEarningsByMonth, getUberEarningsByYear, createUberEarning, updateUberEarning, deleteUberEarning } from "./uber-earnings-db";

export const uberEarningsRouter = router({
  getByMonth: protectedProcedure
    .input(z.object({ month: z.string().regex(/^\d{4}-\d{2}$/) }))
    .query(async ({ ctx, input }) => getUberEarningsByMonth(ctx.user.id, input.month)),

  getByYear: protectedProcedure
    .input(z.object({ year: z.string().regex(/^\d{4}$/) }))
    .query(async ({ ctx, input }) => getUberEarningsByYear(ctx.user.id, input.year)),

  create: protectedProcedure
    .input(z.object({
      description: z.string().min(1),
      category: z.string().min(1),
      entryType: z.enum(["ganho", "gasto"]).default("ganho"),
      value: z.number().positive(),
      date: z.string(),
      month: z.string().regex(/^\d{4}-\d{2}$/),
    }))
    .mutation(async ({ ctx, input }) => {
      const id = await createUberEarning({ userId: ctx.user.id, ...input, value: input.value.toFixed(2) });
      return { id };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number().int().positive(),
      description: z.string().min(1).optional(),
      category: z.string().optional(),
      entryType: z.enum(["ganho", "gasto"]).optional(),
      value: z.number().positive().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, value, ...rest } = input;
      await updateUberEarning(ctx.user.id, id, { ...rest, ...(value !== undefined ? { value: value.toFixed(2) } : {}) });
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      await deleteUberEarning(ctx.user.id, input.id);
      return { success: true };
    }),
});
