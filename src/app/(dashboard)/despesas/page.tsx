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
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportYear, setExportYear] = useState(() => new Date().getFullYear().toString());
  const [editingIncome, setEditingIncome] = useState(false);
  const [incomeInput, setIncomeInput] = useState("");
  const utils = trpc.useUtils();

  const {
    expenses, income, totalIncome, totalExpenses, balance, loading, budget, categoryBudgets,
    incomeOverride,
    addExpense, updateExpense, deleteExpense,
    moveExpenseToNextMonth, generateRemainingInstallments,
    updateIncomeOverride,
  } = useExpenses(month);

  const handleIncomeEditStart = () => {
    setIncomeInput(totalIncome > 0 ? String(totalIncome) : "");
    setEditingIncome(true);
  };

  const handleIncomeConfirm = async () => {
    const parsed = parseFloat(incomeInput.replace(",", "."));
    if (!isNaN(parsed) && parsed >= 0) {
      await updateIncomeOverride(parsed);
    }
    setEditingIncome(false);
  };

  const handleIncomeCancel = () => {
    setEditingIncome(false);
    setIncomeInput("");
  };

  const handleIncomeClear = async () => {
    await updateIncomeOverride(null);
  };

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
  const budgetPct = budget > 0 ? Math.min(999, Math.round((totalExpenses / budget) * 100)) : 0;
  const incomePct = totalIncome > 0 ? Math.min(999, Math.round((totalExpenses / totalIncome) * 100)) : 0;

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

  const MONTH_NAMES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const data = await utils.expense.getByYear.fetch({ year: exportYear });

      const today = new Date();
      const gen = `${String(today.getDate()).padStart(2,"0")}/${String(today.getMonth()+1).padStart(2,"0")}/${today.getFullYear()}`;
      const lines: string[] = [];
      lines.push(`Relatório Anual de Despesas - ${exportYear}`);
      lines.push(`Gerado em: ${gen}`);
      lines.push("");
      lines.push("Mês,Data,Descrição,Categoria,Parcela,Valor (R$),Pago");

      const sorted = [...data].sort((a: any, b: any) =>
        a.month !== b.month ? a.month.localeCompare(b.month) : a.date.localeCompare(b.date)
      );

      const byMonth: Record<string, number> = {};
      let total = 0;
      for (const e of sorted) {
        const [, mn] = (e as any).month.split("-");
        const mName = MONTH_NAMES[parseInt(mn, 10) - 1] ?? (e as any).month;
        const v = parseFloat((e as any).value);
        byMonth[(e as any).month] = (byMonth[(e as any).month] ?? 0) + v;
        total += v;
        const cat = CATEGORY_LABELS[(e as any).category as ExpenseCategory] ?? (e as any).category;
        const desc = `"${(e as any).name.replace(/"/g,'""')}"`;
        lines.push(`${mName}/${exportYear},${(e as any).date},${desc},${cat},${(e as any).quantity ?? ""},${v.toFixed(2)},${(e as any).paid ? "Sim" : "Não"}`);
      }

      lines.push("");
      lines.push("--- RESUMO MENSAL ---");
      lines.push("Mês,Total Despesas (R$)");
      for (const m of Object.keys(byMonth).sort()) {
        const [, mn] = m.split("-");
        const name = MONTH_NAMES[parseInt(mn, 10) - 1] ?? m;
        lines.push(`${name}/${exportYear},${byMonth[m].toFixed(2)}`);
      }
      lines.push("");
      lines.push(`Total Anual,${total.toFixed(2)}`);

      const csv = lines.join("\n");
      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `despesas-${exportYear}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
      setShowExportModal(false);
    }
  };

  const handleExportHTML = async () => {
    setExporting(true);
    try {
      const data = await utils.expense.getByYear.fetch({ year: exportYear });

      const today = new Date();
      const gen = `${String(today.getDate()).padStart(2,"0")}/${String(today.getMonth()+1).padStart(2,"0")}/${today.getFullYear()}`;

      const byMonth: Record<string, number> = {};
      let total = 0;
      for (const e of data as any[]) {
        const v = parseFloat(e.value);
        byMonth[e.month] = (byMonth[e.month] ?? 0) + v;
        total += v;
      }

      const sorted = [...data as any[]].sort((a, b) =>
        a.month !== b.month ? a.month.localeCompare(b.month) : a.date.localeCompare(b.date)
      );

      const monthRows = Object.keys(byMonth).sort().map(m => {
        const [, mn] = m.split("-");
        const name = MONTH_NAMES[parseInt(mn, 10) - 1] ?? m;
        return `<tr><td>${name}</td><td style="text-align:right;font-weight:600">R$ ${byMonth[m].toFixed(2)}</td></tr>`;
      }).join("");

      const entryRows = sorted.map(e => {
        const [, mn] = e.month.split("-");
        const mName = MONTH_NAMES[parseInt(mn, 10) - 1] ?? e.month;
        const cat = CATEGORY_LABELS[e.category as ExpenseCategory] ?? e.category;
        const color = CATEGORY_COLORS[e.category as ExpenseCategory] ?? "#6B7280";
        const d = new Date(e.date);
        const dateStr = `${String(d.getUTCDate()).padStart(2,"0")}/${String(d.getUTCMonth()+1).padStart(2,"0")}/${d.getUTCFullYear()}`;
        return `<tr><td>${mName}</td><td>${dateStr}</td><td>${e.name.replace(/</g,"&lt;")}</td><td><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${color};margin-right:4px"></span>${cat}</td><td style="text-align:center">${e.quantity ?? "—"}</td><td style="text-align:right">R$ ${parseFloat(e.value).toFixed(2)}</td><td style="text-align:center">${e.paid ? "&#10003;" : "—"}</td></tr>`;
      }).join("");

      const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Despesas ${exportYear}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;font-size:12px;color:#1a1a1a;padding:24px;background:#fff}
h1{font-size:20px;font-weight:700;margin-bottom:4px}.subtitle{color:#6B7280;font-size:11px;margin-bottom:20px}
.cards{display:flex;gap:12px;margin-bottom:20px}.card{flex:1;border-radius:8px;padding:14px;border:1px solid #e5e7eb;background:#f9fafb}
.cw{background:#eff6ff;border-color:#bfdbfe}.clabel{font-size:10px;color:#6B7280;margin-bottom:4px;text-transform:uppercase;letter-spacing:.05em}.cval{font-size:18px;font-weight:700}
h2{font-size:13px;font-weight:700;margin:20px 0 8px;border-bottom:2px solid #e5e7eb;padding-bottom:4px;color:#374151}
table{width:100%;border-collapse:collapse;font-size:11px}
th{background:#f3f4f6;padding:7px 10px;text-align:left;font-weight:600;border-bottom:2px solid #e5e7eb;color:#374151}
td{padding:6px 10px;border-bottom:1px solid #f3f4f6}tr:hover td{background:#f9fafb}
tfoot td{background:#f3f4f6;font-weight:700}
.footer{margin-top:20px;font-size:10px;color:#9CA3AF;text-align:center;padding-top:12px;border-top:1px solid #e5e7eb}
@media print{body{padding:0}@page{margin:1.5cm}}
</style></head><body>
<h1>Relatorio Anual de Despesas - ${exportYear}</h1>
<div class="subtitle">Gerado em ${gen} &middot; ${data.length} registro${data.length !== 1 ? "s" : ""}</div>
<div class="cards">
  <div class="card cw"><div class="clabel">Total Anual</div><div class="cval" style="color:#0a7ea4">R$ ${total.toFixed(2)}</div></div>
  <div class="card"><div class="clabel">Registros</div><div class="cval">${data.length}</div></div>
  <div class="card"><div class="clabel">Meses com dados</div><div class="cval">${Object.keys(byMonth).length}</div></div>
</div>
<h2>Resumo Mensal</h2>
<table><thead><tr><th>Mes</th><th style="text-align:right">Total Despesas</th></tr></thead><tbody>${monthRows}</tbody><tfoot><tr><td>Total Anual</td><td style="text-align:right">R$ ${total.toFixed(2)}</td></tr></tfoot></table>
<h2>Registros Detalhados</h2>
<table><thead><tr><th>Mes</th><th>Data</th><th>Descricao</th><th>Categoria</th><th style="text-align:center">Parcela</th><th style="text-align:right">Valor</th><th style="text-align:center">Pago</th></tr></thead><tbody>${entryRows}</tbody></table>
<div class="footer">Controle de Gastos &mdash; Relatorio de Despesas ${exportYear}</div>
</body></html>`;

      const blob = new Blob([html], { type: "text/html;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `despesas-${exportYear}.html`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
      setShowExportModal(false);
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
          onClick={() => { setExportYear(month.split("-")[0]); setShowExportModal(true); }}
          disabled={exporting}
          className="w-9 h-9 rounded-xl bg-surface border border-border flex items-center justify-center text-muted hover:text-foreground transition-colors text-sm"
          title="Exportar dados do ano"
        >
          {exporting ? "⏳" : "📥"}
        </button>
      </div>

      {/* Export modal */}
      {showExportModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={() => setShowExportModal(false)}
        >
          <div
            className="bg-surface border border-border rounded-2xl p-6 w-full max-w-xs shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-bold text-foreground">Exportar Despesas</span>
              <button onClick={() => setShowExportModal(false)} className="text-muted hover:text-foreground text-lg leading-none">✕</button>
            </div>
            <div className="mb-4">
              <label className="text-xs text-muted mb-1.5 block">Ano</label>
              <select
                value={exportYear}
                onChange={(e) => setExportYear(e.target.value)}
                className="w-full bg-surface-2 border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-brand"
              >
                {Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - i).toString()).map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={handleExportCSV}
                disabled={exporting}
                className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{ background: "rgba(10,126,164,0.12)", border: "1.5px solid #0a7ea4", color: "#0a7ea4" }}
              >
                {exporting ? "Exportando..." : "Baixar CSV"}
              </button>
              <button
                onClick={handleExportHTML}
                disabled={exporting}
                className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{ background: "rgba(139,92,246,0.12)", border: "1.5px solid #8B5CF6", color: "#8B5CF6" }}
              >
                {exporting ? "Exportando..." : "Baixar HTML"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hero balance card */}
      <div className="rounded-2xl p-5 mb-4 relative overflow-hidden" style={{ background: "linear-gradient(135deg, #0a7ea4 0%, #0891b2 100%)" }}>
        <div className="absolute top-0 right-0 w-40 h-40 rounded-full opacity-10" style={{ background: "radial-gradient(circle, white, transparent)", transform: "translate(30%, -30%)" }} />
        <div className="text-xs font-semibold mb-1" style={{ color: "rgba(255,255,255,0.65)" }}>SALDO RESTANTE</div>
        <div className="text-4xl font-bold text-white mb-1">{formatCurrency(balance)}</div>
        {totalExpenses <= budget && budget > 0 ? (
          <div className="text-xs font-semibold mb-3" style={{ color: "#4ADE80" }}>Dentro do orçamento</div>
        ) : totalExpenses > totalIncome ? (
          <div className="text-xs font-semibold mb-3" style={{ color: "#F87171" }}>Acima da renda</div>
        ) : totalExpenses > budget && budget > 0 ? (
          <div className="text-xs font-semibold mb-3" style={{ color: "#FBBF24" }}>Acima do orçamento</div>
        ) : (
          <div className="mb-4" />
        )}
        <div className="grid grid-cols-2 gap-3">
          {/* Receita card */}
          <button
            onClick={handleIncomeEditStart}
            className="rounded-xl p-3 text-left transition-opacity hover:opacity-80"
            style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(147,197,253,0.25)" }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: "#93C5FD" }}>Renda</span>
              <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "rgba(147,197,253,0.2)" }}>
                <span className="text-xs" style={{ color: "#93C5FD" }}>✏️</span>
              </div>
            </div>
            <div className="text-lg font-bold text-white">{formatCurrency(totalIncome)}</div>
            <div className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.35)" }}>
              {incomeOverride !== null ? "personalizada · clique p/ editar" : "clique para editar"}
            </div>
          </button>

          {/* Despesas card */}
          <button
            onClick={() => { setEditingExpense(null); setShowModal(true); }}
            className="rounded-xl p-3 text-left transition-opacity hover:opacity-80"
            style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(252,165,165,0.25)" }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: "#FCA5A5" }}>Despesas</span>
              <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "rgba(252,165,165,0.2)" }}>
                <span className="text-xs font-bold" style={{ color: "#FCA5A5" }}>+</span>
              </div>
            </div>
            <div className="text-lg font-bold text-white">{formatCurrency(totalExpenses)}</div>
            <div className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.35)" }}>
              {expenses.length} registro{expenses.length !== 1 ? "s" : ""} · clique p/ adicionar
            </div>
          </button>
        </div>
      </div>

      {/* Painel de edição de renda */}
      {editingIncome && (
        <div className="rounded-2xl p-4 mb-4 bg-surface border border-border">
          <div className="text-xs text-muted mb-3">Editar renda do mês</div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold" style={{ color: "#4ADE80" }}>R$</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={incomeInput}
              onChange={(e) => setIncomeInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleIncomeConfirm();
                if (e.key === "Escape") handleIncomeCancel();
              }}
              autoFocus
              className="flex-1 bg-surface-2 border border-border rounded-xl px-3 py-2 text-lg font-bold focus:outline-none focus:border-brand transition-colors"
              style={{ color: "#4ADE80" }}
              placeholder="0.00"
            />
            <button
              onClick={handleIncomeConfirm}
              className="w-9 h-9 rounded-full flex items-center justify-center text-lg transition-opacity hover:opacity-80"
              style={{ color: "#4ADE80" }}
              title="Confirmar"
            >✓</button>
            <button
              onClick={handleIncomeCancel}
              className="w-9 h-9 rounded-full flex items-center justify-center text-lg transition-opacity hover:opacity-80 text-muted"
              title="Cancelar"
            >✕</button>
          </div>
          {incomeOverride !== null && (
            <button
              onClick={handleIncomeClear}
              className="mt-3 text-xs text-muted hover:text-foreground transition-colors"
            >
              Restaurar padrão (R$ {(income.salary + income.vale + income.other).toFixed(2)})
            </button>
          )}
        </div>
      )}

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
          <div className="mt-1">
            <span className="text-xs text-muted">Orçamento</span>
            <span className="text-xs text-muted ml-1">· Restante: {formatCurrency(Math.max(budget - totalExpenses, 0))}</span>
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
          <span>Todas ({filtered.length})</span>
        </button>

        {(Object.keys(categoryTotals) as ExpenseCategory[]).map((cat) => {
          const isSelected = selectedCategory === cat;
          const color = CATEGORY_COLORS[cat];
          const catTotal = categoryTotals[cat] ?? 0;
          const catBudget = categoryBudgets[cat] ?? 0;
          const catPct = catBudget > 0 ? Math.min(999, Math.round((catTotal / catBudget) * 100)) : null;
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
              {catBudget > 0 && catTotal > 0
                ? `${CATEGORY_LABELS[cat]} · ${formatCurrency(catTotal)} de ${formatCurrency(catBudget)} (${catPct}%)`
                : CATEGORY_LABELS[cat]}
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
                  <div className="text-xs text-muted mt-0.5">
                    {CATEGORY_LABELS[expense.category]}
                    {!expense.quantity && expense.date && (
                      <span className="ml-1.5">
                        {(() => {
                          const d = new Date(expense.date);
                          const day = d.getUTCDate();
                          const mon = d.toLocaleDateString("pt-BR", { month: "short", timeZone: "UTC" }).replace(".", "");
                          return `${day} ${mon}`;
                        })()}
                      </span>
                    )}
                  </div>
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
          currentMonth={month}
          onSave={handleSave}
          onDelete={editingExpense ? async (id) => { await deleteExpense(id); setShowModal(false); setEditingExpense(null); } : undefined}
          onMoveToNextMonth={editingExpense ? async (id) => { await moveExpenseToNextMonth(id); setShowModal(false); setEditingExpense(null); } : undefined}
          onGenerateInstallments={editingExpense ? async (id) => { await generateRemainingInstallments(id); setShowModal(false); setEditingExpense(null); } : undefined}
          onClose={() => { setShowModal(false); setEditingExpense(null); }}
        />
      )}
    </div>
  );
}
