import { and, eq, like, sql, count } from "drizzle-orm";
import {
  expenses,
  incomes,
  budgets,
  categoryBudgets,
  banks,
  InsertExpense,
  ExpenseCategory,
} from "@/drizzle/schema";
import { getDb } from "./db";

export async function getExpensesByMonth(userId: number, month: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(expenses).where(and(eq(expenses.userId, userId), eq(expenses.month, month)));
}

export async function getExpensesByYear(userId: number, year: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(expenses).where(and(eq(expenses.userId, userId), like(expenses.month, `${year}-%`)));
}

export async function createExpense(data: Omit<InsertExpense, "id" | "createdAt" | "updatedAt">): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(expenses).values(data).returning({ id: expenses.id });
  return result[0].id;
}

export async function getBanks(userId: number): Promise<string[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({ name: banks.name }).from(banks).where(eq(banks.userId, userId)).orderBy(banks.name);
  return rows.map((r) => r.name);
}

export async function ensureBank(userId: number, name: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(banks).values({ userId, name: name.trim() }).onConflictDoNothing();
}

export async function updateExpense(
  userId: number, id: number,
  data: Partial<Pick<InsertExpense, "name" | "category" | "value" | "quantity" | "paid" | "bank">>,
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(expenses).set({ ...data, updatedAt: new Date() }).where(and(eq(expenses.id, id), eq(expenses.userId, userId)));
}

export async function deleteExpense(userId: number, id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(expenses).where(and(eq(expenses.id, id), eq(expenses.userId, userId)));
}

export async function bulkCreateExpenses(items: Omit<InsertExpense, "id" | "createdAt" | "updatedAt">[]): Promise<void> {
  if (items.length === 0) return;
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(expenses).values(items).onConflictDoNothing();
}

export async function getIncome(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(incomes).where(eq(incomes.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function upsertIncome(userId: number, data: { salary: string; vale: string; other: string }): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(incomes).values({ userId, ...data }).onConflictDoUpdate({ target: incomes.userId, set: { ...data, updatedAt: new Date() } });
}

export async function getBudget(userId: number, month: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(budgets).where(and(eq(budgets.userId, userId), eq(budgets.month, month))).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function upsertBudget(userId: number, month: string, totalBudget: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(budgets).values({ userId, month, totalBudget }).onConflictDoUpdate({ target: [budgets.userId, budgets.month], set: { totalBudget, updatedAt: new Date() } });
}

export async function upsertIncomeOverride(userId: number, month: string, incomeOverride: string | null): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(budgets).values({ userId, month, incomeOverride }).onConflictDoUpdate({ target: [budgets.userId, budgets.month], set: { incomeOverride, updatedAt: new Date() } });
}

export async function getCategoryBudgets(userId: number, month: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(categoryBudgets).where(and(eq(categoryBudgets.userId, userId), eq(categoryBudgets.month, month)));
}

export async function upsertCategoryBudgets(userId: number, month: string, items: Array<{ category: ExpenseCategory; amount: string }>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(categoryBudgets).where(and(eq(categoryBudgets.userId, userId), eq(categoryBudgets.month, month)));
  if (items.length > 0) {
    await db.insert(categoryBudgets).values(items.map((i) => ({ userId, month, category: i.category, amount: i.amount })));
  }
}

export async function getMonthlyHistory(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ month: expenses.month, totalExpenses: sql<string>`SUM(${expenses.value})` })
    .from(expenses)
    .where(eq(expenses.userId, userId))
    .groupBy(expenses.month)
    .orderBy(expenses.month);
}
