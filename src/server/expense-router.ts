import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import { getExpensesByMonth, getExpensesByYear, createExpense, updateExpense, deleteExpense, bulkCreateExpenses, ensureBank } from "./expense-db";
import { EXPENSE_CATEGORIES } from "@/drizzle/schema";

const categoryEnum = z.enum(EXPENSE_CATEGORIES);

export const expenseRouter = router({
  getByMonth: protectedProcedure
    .input(z.object({ month: z.string().regex(/^\d{4}-\d{2}$/) }))
    .query(async ({ ctx, input }) => getExpensesByMonth(ctx.user.id, input.month)),

  getByYear: protectedProcedure
    .input(z.object({ year: z.string().regex(/^\d{4}$/) }))
    .query(async ({ ctx, input }) => getExpensesByYear(ctx.user.id, input.year)),

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      category: categoryEnum,
      value: z.number().positive(),
      date: z.string(),
      month: z.string().regex(/^\d{4}-\d{2}$/),
      quantity: z.string().optional(),
      paid: z.boolean().optional(),
      clientId: z.string().optional(),
      bank: z.string().max(100).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (input.bank?.trim()) await ensureBank(ctx.user.id, input.bank.trim());
      const id = await createExpense({
        userId: ctx.user.id,
        name: input.name,
        category: input.category,
        value: input.value.toFixed(2),
        date: input.date,
        month: input.month,
        quantity: input.quantity ?? null,
        paid: input.paid ?? false,
        source: "manual",
        clientId: input.clientId ?? null,
        bank: input.bank?.trim() ?? null,
      });
      return { id };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number().int().positive(),
      name: z.string().min(1).optional(),
      category: categoryEnum.optional(),
      value: z.number().positive().optional(),
      quantity: z.string().nullable().optional(),
      paid: z.boolean().optional(),
      bank: z.string().max(100).nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input;
      if (updates.bank?.trim()) await ensureBank(ctx.user.id, updates.bank.trim());
      const data: Parameters<typeof updateExpense>[2] = {};
      if (updates.name !== undefined) data.name = updates.name;
      if (updates.category !== undefined) data.category = updates.category;
      if (updates.value !== undefined) data.value = updates.value.toFixed(2);
      if (updates.quantity !== undefined) data.quantity = updates.quantity;
      if (updates.paid !== undefined) data.paid = updates.paid;
      if (updates.bank !== undefined) data.bank = updates.bank?.trim() ?? null;
      await updateExpense(ctx.user.id, id, data);
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      await deleteExpense(ctx.user.id, input.id);
      return { success: true };
    }),

  bulkCreate: protectedProcedure
    .input(z.object({
      expenses: z.array(z.object({
        name: z.string().min(1),
        category: categoryEnum,
        value: z.number().positive(),
        date: z.string(),
        month: z.string().regex(/^\d{4}-\d{2}$/),
        quantity: z.string().optional(),
        paid: z.boolean().optional(),
        clientId: z.string().optional(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      await bulkCreateExpenses(input.expenses.map((e) => ({
        userId: ctx.user.id,
        name: e.name,
        category: e.category,
        value: e.value.toFixed(2),
        date: e.date,
        month: e.month,
        quantity: e.quantity ?? null,
        paid: e.paid ?? false,
        source: "manual" as const,
        clientId: e.clientId ?? null,
      })));
      return { success: true };
    }),
});
