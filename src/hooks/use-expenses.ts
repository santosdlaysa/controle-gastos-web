"use client";

import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { CategoryBudgets, Expense, Income } from "@/types/expense";
import { getNextMonth, parseQuantity } from "@/shared/expense-utils";

const DEFAULT_INCOME: Income = { salary: 0, vale: 0, other: 0 };

function toExpense(row: { id: number; name: string; category: string; value: string; date: string; month: string; quantity: string | null; paid: boolean | null }): Expense {
  return { id: row.id.toString(), name: row.name, category: row.category as Expense["category"], value: parseFloat(row.value), date: row.date, month: row.month, quantity: row.quantity ?? undefined, paid: row.paid ?? undefined };
}

export function useExpenses(month: string) {
  const utils = trpc.useUtils();
  const expensesQuery = trpc.expense.getByMonth.useQuery({ month });
  const incomeQuery = trpc.income.get.useQuery();
  const budgetQuery = trpc.budget.get.useQuery({ month });

  const loading = expensesQuery.isLoading || incomeQuery.isLoading || budgetQuery.isLoading;

  const expenses: Expense[] = useMemo(() => (expensesQuery.data ?? []).map(toExpense), [expensesQuery.data]);

  const income: Income = useMemo(() => {
    const d = incomeQuery.data;
    if (!d) return DEFAULT_INCOME;
    return { salary: parseFloat(d.salary ?? "0"), vale: parseFloat(d.vale ?? "0"), other: parseFloat(d.other ?? "0") };
  }, [incomeQuery.data]);

  const budget: number = useMemo(() => parseFloat(budgetQuery.data?.budget?.totalBudget ?? "0"), [budgetQuery.data]);

  const incomeOverride: number | null = useMemo(() => {
    const raw = budgetQuery.data?.budget?.incomeOverride;
    return raw != null ? parseFloat(raw) : null;
  }, [budgetQuery.data]);

  const categoryBudgets: CategoryBudgets = useMemo(() => {
    const rows = budgetQuery.data?.categoryBudgets ?? [];
    const result: CategoryBudgets = {};
    for (const row of rows) result[row.category as keyof CategoryBudgets] = parseFloat(row.amount);
    return result;
  }, [budgetQuery.data]);

  const invalidateExpenses = () => utils.expense.getByMonth.invalidate({ month });
  const invalidateBudget = () => utils.budget.get.invalidate({ month });
  const invalidateIncome = () => utils.income.get.invalidate();

  const createMut = trpc.expense.create.useMutation({ onSuccess: invalidateExpenses });
  const updateMut = trpc.expense.update.useMutation({ onSuccess: invalidateExpenses });
  const deleteMut = trpc.expense.delete.useMutation({ onSuccess: invalidateExpenses });
  const bulkCreateMut = trpc.expense.bulkCreate.useMutation({ onSuccess: invalidateExpenses });
  const incomeUpdateMut = trpc.income.update.useMutation({ onSuccess: invalidateIncome });
  const budgetTotalMut = trpc.budget.updateTotal.useMutation({ onSuccess: invalidateBudget });
  const budgetCatMut = trpc.budget.updateCategories.useMutation({ onSuccess: invalidateBudget });
  const incomeOverrideMut = trpc.budget.updateIncomeOverride.useMutation();

  const addExpense = async (expense: Omit<Expense, "id" | "date" | "month">) => {
    await createMut.mutateAsync({ name: expense.name, category: expense.category, value: expense.value, date: new Date().toISOString(), month, quantity: expense.quantity, paid: expense.paid });
  };

  const updateExpense = async (id: string, updates: Partial<Omit<Expense, "id" | "date" | "month">>) => {
    await updateMut.mutateAsync({ id: parseInt(id, 10), name: updates.name, category: updates.category, value: updates.value, quantity: updates.quantity ?? null, paid: updates.paid });
  };

  const deleteExpense = async (id: string) => {
    await deleteMut.mutateAsync({ id: parseInt(id, 10) });
  };

  const moveExpenseToNextMonth = async (id: string) => {
    const exp = expenses.find((e) => e.id === id);
    if (!exp) return;
    const nextMonth = getNextMonth(month);
    let nextQuantity = exp.quantity;
    if (exp.quantity) {
      const parsed = parseQuantity(exp.quantity);
      if (parsed && parsed.installmentCurrent < parsed.installmentTotal) nextQuantity = `${parsed.installmentCurrent + 1}/${parsed.installmentTotal}`;
    }
    await createMut.mutateAsync({ name: exp.name, category: exp.category, value: exp.value, date: new Date().toISOString(), month: nextMonth, quantity: nextQuantity, paid: false });
  };

  const generateRemainingInstallments = async (id: string) => {
    const exp = expenses.find((e) => e.id === id);
    if (!exp || !exp.quantity) return;
    const parsed = parseQuantity(exp.quantity);
    if (!parsed || parsed.installmentCurrent >= parsed.installmentTotal) return;
    const { installmentCurrent, installmentTotal } = parsed;
    const toCreate: Parameters<typeof bulkCreateMut.mutateAsync>[0]["expenses"] = [];
    let targetMonth = month;
    for (let i = installmentCurrent + 1; i <= installmentTotal; i++) {
      targetMonth = getNextMonth(targetMonth);
      toCreate.push({ name: exp.name, category: exp.category, value: exp.value, date: new Date().toISOString(), month: targetMonth, quantity: `${i}/${installmentTotal}`, paid: false });
    }
    if (toCreate.length > 0) await bulkCreateMut.mutateAsync({ expenses: toCreate });
  };

  const updateIncome = async (newIncome: Income) => {
    await incomeUpdateMut.mutateAsync({ salary: newIncome.salary, vale: newIncome.vale, other: newIncome.other });
  };

  const updateBudget = async (newBudget: number) => {
    await budgetTotalMut.mutateAsync({ month, totalBudget: newBudget });
  };

  const updateIncomeOverride = async (value: number | null) => {
    await incomeOverrideMut.mutateAsync({ month, incomeOverride: value });
    await utils.budget.get.invalidate({ month });
  };

  const updateCategoryBudgets = async (newCategoryBudgets: CategoryBudgets) => {
    const entries = Object.entries(newCategoryBudgets)
      .filter(([, amount]) => amount != null && amount > 0)
      .map(([category, amount]) => ({ category: category as Expense["category"], amount: amount as number }));
    await budgetCatMut.mutateAsync({ month, budgets: entries });
  };

  const reload = () => {
    utils.expense.getByMonth.invalidate({ month });
    utils.income.get.invalidate();
    utils.budget.get.invalidate({ month });
  };

  const baseIncome = income.salary + income.vale + income.other;
  const totalIncome = incomeOverride !== null ? incomeOverride : baseIncome;
  const totalExpenses = expenses.reduce((sum, e) => sum + e.value, 0);
  const balance = totalIncome - totalExpenses;

  return { expenses, income, loading, budget, categoryBudgets, incomeOverride, totalIncome, totalExpenses, balance, addExpense, updateExpense, deleteExpense, moveExpenseToNextMonth, generateRemainingInstallments, updateIncome, updateBudget, updateCategoryBudgets, updateIncomeOverride, reload };
}
