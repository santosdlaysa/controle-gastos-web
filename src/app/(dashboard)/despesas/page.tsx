"use client";

import { useState } from "react";
import { useExpenses } from "@/hooks/use-expenses";
import { getCurrentMonth, formatMonth, getPrevMonth, getNextMonth } from "@/shared/expense-utils";
import { CATEGORY_COLORS, CATEGORY_LABELS, Expense, ExpenseCategory } from "@/types/expense";
import { ExpenseModal } from "@/components/expense-modal";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export default function DespesasPage() {
  const [month, setMonth] = useState(getCurrentMonth());
  const [selectedCategory, setSelectedCategory] = useState<ExpenseCategory | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const { expenses, totalIncome, totalExpenses, balance, loading, addExpense, updateExpense, deleteExpense, moveExpenseToNextMonth, generateRemainingInstallments } = useExpenses(month);

  const filtered = selectedCategory ? expenses.filter((e) => e.category === selectedCategory) : expenses;

  const categoryTotals = expenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + e.value;
    return acc;
  }, {});

  const handleSave = async (data: Omit<Expense, "id" | "date" | "month">) => {
    if (editingExpense) {
      await updateExpense(editingExpense.id, data);
    } else {
      await addExpense(data);
    }
    setShowModal(false);
    setEditingExpense(null);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Deletar esta despesa?")) await deleteExpense(id);
  };

  const balanceColor = balance >= 0 ? "text-success" : "text-error";

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => setMonth(getPrevMonth(month))} className="w-8 h-8 rounded-lg bg-surface-2 border border-border text-muted hover:text-foreground flex items-center justify-center transition-colors">‹</button>
          <h1 className="text-lg font-semibold text-foreground capitalize">{formatMonth(month)}</h1>
          <button onClick={() => setMonth(getNextMonth(month))} className="w-8 h-8 rounded-lg bg-surface-2 border border-border text-muted hover:text-foreground flex items-center justify-center transition-colors">›</button>
        </div>
        <button onClick={() => { setEditingExpense(null); setShowModal(true); }} className="px-4 py-2 bg-brand text-white text-sm font-semibold rounded-xl hover:bg-brand/90 transition-colors">
          + Nova Despesa
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-surface rounded-xl p-4 border border-border">
          <div className="text-xs text-muted mb-1">Receita</div>
          <div className="text-xl font-bold text-success">{formatCurrency(totalIncome)}</div>
        </div>
        <div className="bg-surface rounded-xl p-4 border border-border">
          <div className="text-xs text-muted mb-1">Gastos</div>
          <div className="text-xl font-bold text-error">{formatCurrency(totalExpenses)}</div>
        </div>
        <div className="bg-surface rounded-xl p-4 border border-border">
          <div className="text-xs text-muted mb-1">Saldo</div>
          <div className={`text-xl font-bold ${balanceColor}`}>{formatCurrency(balance)}</div>
        </div>
      </div>

      {/* Category filter chips */}
      {Object.keys(categoryTotals).length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
              !selectedCategory ? "bg-brand/10 text-brand border-brand/30" : "bg-surface text-muted border-border hover:text-foreground"
            }`}
          >
            Todas
          </button>
          {(Object.entries(categoryTotals) as [ExpenseCategory, number][]).map(([cat, total]) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                selectedCategory === cat ? "text-white border-transparent" : "bg-surface text-muted border-border hover:text-foreground"
              }`}
              style={selectedCategory === cat ? { backgroundColor: CATEGORY_COLORS[cat] } : {}}
            >
              <span style={{ color: selectedCategory === cat ? "white" : CATEGORY_COLORS[cat] }}>●</span>{" "}
              {CATEGORY_LABELS[cat]} · {formatCurrency(total)}
            </button>
          ))}
        </div>
      )}

      {/* Expense list */}
      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-muted">
            {selectedCategory ? "Nenhuma despesa nesta categoria" : "Nenhuma despesa neste mês"}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((expense) => (
              <div key={expense.id} className="flex items-center gap-3 p-4 hover:bg-surface-2 transition-colors">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: CATEGORY_COLORS[expense.category] }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground truncate">{expense.name}</span>
                    {expense.quantity && <span className="text-xs text-muted bg-surface-2 px-1.5 py-0.5 rounded">{expense.quantity}</span>}
                    {expense.paid && <span className="text-xs text-success bg-success/10 px-1.5 py-0.5 rounded">Pago</span>}
                  </div>
                  <div className="text-xs text-muted mt-0.5">{CATEGORY_LABELS[expense.category]}</div>
                </div>
                <div className="text-sm font-semibold text-foreground">{formatCurrency(expense.value)}</div>
                <div className="flex items-center gap-1 ml-2">
                  <button
                    onClick={() => { setEditingExpense(expense); setShowModal(true); }}
                    className="w-7 h-7 rounded-lg text-muted hover:text-foreground hover:bg-surface flex items-center justify-center text-xs transition-colors"
                    title="Editar"
                  >✏️</button>
                  <button
                    onClick={() => moveExpenseToNextMonth(expense.id)}
                    className="w-7 h-7 rounded-lg text-muted hover:text-brand hover:bg-brand/10 flex items-center justify-center text-xs transition-colors"
                    title="Mover para próximo mês"
                  >→</button>
                  {expense.quantity && (
                    <button
                      onClick={() => generateRemainingInstallments(expense.id)}
                      className="w-7 h-7 rounded-lg text-muted hover:text-success hover:bg-success/10 flex items-center justify-center text-xs transition-colors"
                      title="Gerar parcelas restantes"
                    >⚡</button>
                  )}
                  <button
                    onClick={() => handleDelete(expense.id)}
                    className="w-7 h-7 rounded-lg text-muted hover:text-error hover:bg-error/10 flex items-center justify-center text-xs transition-colors"
                    title="Deletar"
                  >🗑️</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <ExpenseModal
          expense={editingExpense}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditingExpense(null); }}
        />
      )}
    </div>
  );
}
