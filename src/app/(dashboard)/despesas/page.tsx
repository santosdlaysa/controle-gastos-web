"use client";

import { useState } from "react";
import { useExpenses } from "@/hooks/use-expenses";
import { getCurrentMonth, formatMonth, getPrevMonth, getNextMonth } from "@/shared/expense-utils";
import { CATEGORY_COLORS, CATEGORY_LABELS, Expense, ExpenseCategory } from "@/types/expense";
import { ExpenseModal } from "@/components/expense-modal";
import { trpc } from "@/lib/trpc";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

const CATEGORY_ICONS: Record<ExpenseCategory, string> = {
  transporte: "🚗",
  alimentacao: "🍔",
  moradia: "🏠",
  saude: "❤️",
  educacao: "📚",
  lazer: "🎮",
  outro: "📦",
};

export default function DespesasPage() {
  const [month, setMonth] = useState(getCurrentMonth());
  const [selectedCategory, setSelectedCategory] = useState<ExpenseCategory | "all">("all");
  const [showOnlyUnpaid, setShowOnlyUnpaid] = useState(false);
  const [showOnlyInstallments, setShowOnlyInstallments] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [exporting, setExporting] = useState(false);
  const utils = trpc.useUtils();

  const {
    expenses, totalIncome, totalExpenses, balance, loading, budget,
    addExpense, updateExpense, deleteExpense,
    moveExpenseToNextMonth, generateRemainingInstallments,
  } = useExpenses(month);

  const filtered = expenses.filter((exp) => {
    if (selectedCategory !== "all" && exp.category !== selectedCategory) return false;
    if (showOnlyUnpaid && exp.paid) return false;
    if (showOnlyInstallments && !exp.quantity) return false;
    return true;
  });

  const categoryTotals = expenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + e.value;
    return acc;
  }, {});

  const unpaidExpenses = expenses.filter((e) => !e.paid);
  const unpaidTotal = unpaidExpenses.reduce((sum, e) => sum + e.value, 0);
  const budgetPct = budget > 0 ? Math.round((totalExpenses / budget) * 100) : 0;
  const incomePct = totalIncome > 0 ? Math.round((totalExpenses / totalIncome) * 100) : 0;

  const handleSave = async (data: Omit<Expense, "id" | "date" | "month">) => {
    if (editingExpense) {
      await updateExpense(editingExpense.id, data);
    } else {
      await addExpense(data);
    }
    setShowModal(false);
    setEditingExpense(null);
  };

  const handleTogglePaid = async (expense: Expense) => {
    await updateExpense(expense.id, { paid: !expense.paid });
  };

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      // Use trpc to get all expenses for the current year
      const year = month.split("-")[0];
      const data = await utils.expense.getByYear.fetch({ year });

      const header = ["Mês", "Data", "Descrição", "Categoria", "Parcela", "Valor (R$)", "Pago", "Origem"];
      const rows = data.map((e: any) => [
        e.month,
        e.date,
        `"${e.name.replace(/"/g, '""')}"`,
        e.category,
        e.quantity ?? "",
        parseFloat(e.value).toFixed(2),
        e.paid ? "Sim" : "Não",
        e.source ?? "manual",
      ]);

      const csv = [header.join(","), ...rows.map((r: any[]) => r.join(","))].join("\n");
      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `despesas-${year}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Deletar esta despesa?")) await deleteExpense(id);
  };

  return (
    <div className="p-6 max-w-2xl mx-auto pb-24">

      {/* Month navigation */}
      <div className="flex items-center justify-center gap-4 mb-5">
        <button
          onClick={() => setMonth(getPrevMonth(month))}
          className="w-9 h-9 rounded-xl bg-surface border border-border flex items-center justify-center text-lg text-muted hover:text-foreground transition-colors"
        >‹</button>
        <span className="text-sm font-semibold text-foreground/80 capitalize w-36 text-center">
          {formatMonth(month)}
        </span>
        <button
          onClick={() => setMonth(getNextMonth(month))}
          className="w-9 h-9 rounded-xl bg-surface border border-border flex items-center justify-center text-lg text-muted hover:text-foreground transition-colors"
        >›</button>
        <button
          onClick={handleExportCSV}
          disabled={exporting}
          className="w-9 h-9 rounded-xl bg-surface border border-border flex items-center justify-center text-muted hover:text-foreground transition-colors text-sm"
          title="Exportar CSV do ano"
        >
          {exporting ? "⏳" : "📥"}
        </button>
      </div>

      {/* Hero balance card */}
      <div className="rounded-2xl p-5 mb-4 relative overflow-hidden" style={{ background: "linear-gradient(135deg, #0a7ea4 0%, #0891b2 100%)" }}>
        <div className="absolute top-0 right-0 w-40 h-40 rounded-full opacity-10" style={{ background: "radial-gradient(circle, white, transparent)", transform: "translate(30%, -30%)" }} />
        <div className="text-xs font-semibold mb-1" style={{ color: "rgba(255,255,255,0.65)" }}>SALDO RESTANTE</div>
        <div className="text-4xl font-bold text-white mb-4">{formatCurrency(balance)}</div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.12)" }}>
            <div className="text-xs mb-1" style={{ color: "rgba(255,255,255,0.6)" }}>Receita</div>
            <div className="text-lg font-bold text-white">{formatCurrency(totalIncome)}</div>
          </div>
          <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.12)" }}>
            <div className="text-xs mb-1" style={{ color: "rgba(255,255,255,0.6)" }}>Gastos</div>
            <div className="text-lg font-bold text-white">{formatCurrency(totalExpenses)}</div>
          </div>
        </div>
      </div>

      {/* Budget progress bar */}
      {budget > 0 && (
        <div className="rounded-2xl p-4 mb-4 bg-surface border border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted">ORÇAMENTO DO MÊS</span>
            <span
              className="text-xs font-bold"
              style={{ color: budgetPct > 100 ? "#F87171" : budgetPct > 80 ? "#FBBF24" : "#4ADE80" }}
            >
              {budgetPct}%
            </span>
          </div>
          <div className="h-2 bg-surface-2 rounded-full overflow-hidden mb-2">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min(budgetPct, 100)}%`,
                backgroundColor: budgetPct > 100 ? "#F87171" : budgetPct > 80 ? "#FBBF24" : "#4ADE80",
              }}
            />
          </div>
          <div className="flex justify-between">
            <span className="text-xs text-muted">{formatCurrency(totalExpenses)} gastos</span>
            <span className="text-xs text-muted">limite {formatCurrency(budget)}</span>
          </div>
        </div>
      )}

      {/* Metrics: income usage + unpaid count */}
      {totalIncome > 0 && (
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-surface rounded-xl p-3 border border-border">
            <div className="text-xs text-muted mb-1">Uso da renda</div>
            <div
              className="text-lg font-bold"
              style={{ color: incomePct > 100 ? "#F87171" : incomePct > 80 ? "#FBBF24" : "#ECEDEE" }}
            >
              {incomePct}%
            </div>
            <div className="h-1.5 bg-surface-2 rounded-full overflow-hidden mt-2">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(incomePct, 100)}%`,
                  backgroundColor: incomePct > 100 ? "#F87171" : incomePct > 80 ? "#FBBF24" : "#0a7ea4",
                }}
              />
            </div>
          </div>
          <div className="bg-surface rounded-xl p-3 border border-border">
            <div className="text-xs text-muted mb-1">Não pagas</div>
            <div className="text-lg font-bold text-warning">{unpaidExpenses.length}</div>
            <div className="text-xs text-muted mt-1">{formatCurrency(unpaidTotal)}</div>
          </div>
        </div>
      )}

      {/* Unpaid summary */}
      {totalIncome === 0 && unpaidExpenses.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface border border-border mb-4">
          <div className="w-2 h-2 rounded-full bg-warning flex-shrink-0" />
          <span className="text-sm text-muted flex-1">
            {unpaidExpenses.length} despesa{unpaidExpenses.length !== 1 ? "s" : ""} não paga{unpaidExpenses.length !== 1 ? "s" : ""}
          </span>
          <span className="text-sm font-semibold text-warning">{formatCurrency(unpaidTotal)}</span>
        </div>
      )}

      {/* Quick toggles */}
      <div className="flex gap-2 mb-3 flex-wrap">
        <button
          onClick={() => setShowOnlyUnpaid(v => !v)}
          className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
          style={{
            border: `1.5px solid ${showOnlyUnpaid ? "#4ADE80" : "#334155"}`,
            backgroundColor: showOnlyUnpaid ? "rgba(74,222,128,0.12)" : "transparent",
            color: showOnlyUnpaid ? "#4ADE80" : "#9BA1A6",
          }}
        >
          Somente não pagas
        </button>
        <button
          onClick={() => setShowOnlyInstallments(v => !v)}
          className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
          style={{
            border: `1.5px solid ${showOnlyInstallments ? "#0a7ea4" : "#334155"}`,
            backgroundColor: showOnlyInstallments ? "rgba(10,126,164,0.12)" : "transparent",
            color: showOnlyInstallments ? "#0a7ea4" : "#9BA1A6",
          }}
        >
          Somente parcelas
        </button>
      </div>

      {/* Category filter chips */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
        <button
          onClick={() => setSelectedCategory("all")}
          className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
          style={{
            border: `1.5px solid ${selectedCategory === "all" ? "#0a7ea4" : "#334155"}`,
            backgroundColor: selectedCategory === "all" ? "#0a7ea4" : "transparent",
            color: selectedCategory === "all" ? "#fff" : "#9BA1A6",
          }}
        >
          <span style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: selectedCategory === "all" ? "#fff" : "#9BA1A6", display: "inline-block", flexShrink: 0 }} />
          <span>Todas</span>
          <span style={{ opacity: 0.75 }}>{expenses.length}</span>
        </button>

        {(Object.keys(categoryTotals) as ExpenseCategory[]).map((cat) => {
          const isSelected = selectedCategory === cat;
          const color = CATEGORY_COLORS[cat];
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(isSelected ? "all" : cat)}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
              style={{
                border: `${isSelected ? 2 : 1.5}px solid ${isSelected ? color : "#334155"}`,
                backgroundColor: isSelected ? color + "22" : "transparent",
                color: isSelected ? color : "#9BA1A6",
              }}
            >
              <span style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: color, display: "inline-block", flexShrink: 0 }} />
              {CATEGORY_LABELS[cat]}
              <span style={{ opacity: 0.7 }}>{formatCurrency(categoryTotals[cat])}</span>
            </button>
          );
        })}
      </div>

      {/* Expense list */}
      <div className="space-y-2">
        {loading ? (
          <div className="py-16 text-center text-muted text-sm">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-muted text-sm">
            {selectedCategory !== "all" ? "Nenhuma despesa nesta categoria" : "Nenhuma despesa neste mês"}
          </div>
        ) : (
          filtered.map((expense) => {
            const accentColor = expense.paid ? "#4ADE80" : CATEGORY_COLORS[expense.category];
            return (
              <div
                key={expense.id}
                className="flex items-center gap-3 p-4 rounded-2xl bg-surface border border-border transition-all hover:bg-surface-2"
                style={{
                  borderLeftWidth: 4,
                  borderLeftColor: accentColor,
                  opacity: expense.paid ? 0.7 : 1,
                }}
              >
                {/* Icon */}
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                  style={{ backgroundColor: CATEGORY_COLORS[expense.category] + "22" }}
                >
                  {CATEGORY_ICONS[expense.category]}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-foreground truncate">
                      {expense.name}
                    </span>
                    {expense.source && expense.source !== "manual" && (
                      <span
                        className="text-xs px-1.5 py-0.5 rounded-md flex-shrink-0 font-semibold"
                        style={{
                          backgroundColor: expense.source === "pluggy" ? "rgba(59,130,246,0.15)" : "rgba(128,0,128,0.15)",
                          color: expense.source === "pluggy" ? "#60A5FA" : "#C084FC",
                        }}
                      >
                        {expense.source === "pluggy" ? "🏦 Pluggy" : "🟣 Nubank"}
                      </span>
                    )}
                    {expense.quantity && (
                      <span className="text-xs px-1.5 py-0.5 rounded-md bg-surface-2 text-muted flex-shrink-0">
                        {expense.quantity}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted mt-0.5">{CATEGORY_LABELS[expense.category]}</div>
                </div>

                {/* Value */}
                <div className="text-sm font-bold flex-shrink-0" style={{ color: accentColor }}>
                  {formatCurrency(expense.value)}
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-0.5 flex-shrink-0">
                  <button
                    onClick={() => { setEditingExpense(expense); setShowModal(true); }}
                    className="w-8 h-8 rounded-lg text-muted hover:text-foreground hover:bg-surface-2 flex items-center justify-center text-sm transition-colors"
                    title="Editar"
                  >✏️</button>
                  <button
                    onClick={() => moveExpenseToNextMonth(expense.id)}
                    className="w-8 h-8 rounded-lg text-muted hover:text-brand hover:bg-brand/10 flex items-center justify-center text-sm transition-colors"
                    title="Mover para próximo mês"
                  >→</button>
                  {expense.quantity && (
                    <button
                      onClick={() => generateRemainingInstallments(expense.id)}
                      className="w-8 h-8 rounded-lg text-muted hover:text-success hover:bg-success/10 flex items-center justify-center text-sm transition-colors"
                      title="Gerar parcelas restantes"
                    >⚡</button>
                  )}
                  <button
                    onClick={() => handleDelete(expense.id)}
                    className="w-8 h-8 rounded-lg text-muted hover:text-error hover:bg-error/10 flex items-center justify-center text-sm transition-colors"
                    title="Deletar"
                  >🗑️</button>
                </div>

                {/* Paid toggle */}
                <button
                  onClick={() => handleTogglePaid(expense)}
                  className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all active:scale-90"
                  style={{
                    border: `2px solid ${expense.paid ? "#4ADE80" : "#9BA1A6"}`,
                    backgroundColor: expense.paid ? "#4ADE80" : "transparent",
                  }}
                  title={expense.paid ? "Marcar como não pago" : "Marcar como pago"}
                >
                  {expense.paid && (
                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => { setEditingExpense(null); setShowModal(true); }}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-brand text-white text-3xl font-light flex items-center justify-center z-40 transition-transform active:scale-95 hover:bg-brand/90"
        style={{ boxShadow: "0 4px 20px rgba(10,126,164,0.45)" }}
      >
        +
      </button>

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
