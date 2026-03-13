"use client";

import { useState } from "react";
import { useUberEarnings } from "@/hooks/use-uber-earnings";
import { getCurrentMonth, formatMonth, getPrevMonth, getNextMonth } from "@/shared/expense-utils";
import { trpc } from "@/lib/trpc";
import {
  UberEntry, UberCategory,
  getCategoryLabel, getCategoryColor,
  UBER_EARNING_CATEGORIES, UBER_EXPENSE_CATEGORIES,
  UBER_EARNING_CATEGORY_LABELS, UBER_EXPENSE_CATEGORY_LABELS,
  UBER_EARNING_CATEGORY_COLORS, UBER_EXPENSE_CATEGORY_COLORS,
} from "@/types/uber-earnings";
import { UberEntryModal } from "@/components/uber-entry-modal";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

const CATEGORY_ICONS: Record<string, string> = {
  corrida: "🚗", uber_eats: "🍕", bonus: "⭐", outro_ganho: "💰",
  combustivel: "⛽", manutencao: "🔧", pedagio: "🛣️", lavagem: "🚿", seguro: "🛡️", outro_gasto: "📦",
};

type TabType = "todos" | "ganho" | "gasto";

export default function UberPage() {
  const [month, setMonth] = useState(getCurrentMonth());
  const [tab, setTab] = useState<TabType>("todos");
  const [selectedCategory, setSelectedCategory] = useState<UberCategory | "all">("all");
  const [showModal, setShowModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<UberEntry | null>(null);
  const [exporting, setExporting] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportYear, setExportYear] = useState(() => new Date().getFullYear().toString());
  const utils = trpc.useUtils();

  const { entries, earnings, expenses, totalEarnings, totalExpenses, netBalance, loading, addEntry, updateEntry, deleteEntry } = useUberEarnings(month);

  const baseEntries = tab === "todos" ? entries : tab === "ganho" ? earnings : expenses;

  const displayed = selectedCategory === "all"
    ? baseEntries
    : baseEntries.filter((e) => e.category === selectedCategory);

  const categoryTotals = baseEntries.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + e.value;
    return acc;
  }, {});

  const visibleCategories = tab === "gasto" ? UBER_EXPENSE_CATEGORIES : UBER_EARNING_CATEGORIES;
  const activeCategories = visibleCategories.filter((cat) => (categoryTotals[cat] ?? 0) > 0);

  const handleSave = async (data: Omit<UberEntry, "id" | "date" | "month">) => {
    if (editingEntry) await updateEntry(editingEntry.id, data);
    else await addEntry(data);
    setShowModal(false);
    setEditingEntry(null);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Deletar esta entrada?")) await deleteEntry(id);
  };

  const handleTabChange = (t: TabType) => {
    setTab(t);
    setSelectedCategory("all");
  };

  const UBER_MONTH_NAMES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const data = await utils.uberEarnings.getByYear.fetch({ year: exportYear });

      const today = new Date();
      const gen = `${String(today.getDate()).padStart(2,"0")}/${String(today.getMonth()+1).padStart(2,"0")}/${today.getFullYear()}`;
      const lines: string[] = [];
      lines.push(`Relatório Anual Uber - ${exportYear}`);
      lines.push(`Gerado em: ${gen}`);
      lines.push("");
      lines.push("Mês,Data,Descrição,Categoria,Tipo,Valor (R$)");

      const sorted = [...data as any[]].sort((a, b) =>
        a.month !== b.month ? a.month.localeCompare(b.month) : a.date.localeCompare(b.date)
      );

      const byMonth: Record<string, { ganho: number; gasto: number }> = {};
      let totalGanho = 0, totalGasto = 0;
      for (const e of sorted) {
        const [, mn] = e.month.split("-");
        const mName = UBER_MONTH_NAMES[parseInt(mn, 10) - 1] ?? e.month;
        const v = parseFloat(e.value);
        if (!byMonth[e.month]) byMonth[e.month] = { ganho: 0, gasto: 0 };
        if (e.entryType === "ganho") { byMonth[e.month].ganho += v; totalGanho += v; }
        else { byMonth[e.month].gasto += v; totalGasto += v; }
        const cat = getCategoryLabel(e.category);
        const desc = `"${e.description.replace(/"/g,'""')}"`;
        lines.push(`${mName}/${exportYear},${e.date},${desc},${cat},${e.entryType === "ganho" ? "Ganho" : "Gasto"},${v.toFixed(2)}`);
      }

      lines.push("");
      lines.push("--- RESUMO MENSAL ---");
      lines.push("Mês,Total Ganhos (R$),Total Gastos (R$),Lucro Líquido (R$)");
      for (const m of Object.keys(byMonth).sort()) {
        const [, mn] = m.split("-");
        const name = UBER_MONTH_NAMES[parseInt(mn, 10) - 1] ?? m;
        const { ganho, gasto } = byMonth[m];
        lines.push(`${name}/${exportYear},${ganho.toFixed(2)},${gasto.toFixed(2)},${(ganho - gasto).toFixed(2)}`);
      }
      lines.push("");
      lines.push(`Total Anual,${totalGanho.toFixed(2)},${totalGasto.toFixed(2)},${(totalGanho - totalGasto).toFixed(2)}`);

      const csv = lines.join("\n");
      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `uber-${exportYear}.csv`;
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
      const data = await utils.uberEarnings.getByYear.fetch({ year: exportYear });

      const today = new Date();
      const gen = `${String(today.getDate()).padStart(2,"0")}/${String(today.getMonth()+1).padStart(2,"0")}/${today.getFullYear()}`;

      const byMonth: Record<string, { ganho: number; gasto: number }> = {};
      let totalGanho = 0, totalGasto = 0;
      for (const e of data as any[]) {
        const v = parseFloat(e.value);
        if (!byMonth[e.month]) byMonth[e.month] = { ganho: 0, gasto: 0 };
        if (e.entryType === "ganho") { byMonth[e.month].ganho += v; totalGanho += v; }
        else { byMonth[e.month].gasto += v; totalGasto += v; }
      }

      const sorted = [...data as any[]].sort((a, b) =>
        a.month !== b.month ? a.month.localeCompare(b.month) : a.date.localeCompare(b.date)
      );

      const monthRows = Object.keys(byMonth).sort().map(m => {
        const [, mn] = m.split("-");
        const name = UBER_MONTH_NAMES[parseInt(mn, 10) - 1] ?? m;
        const { ganho, gasto } = byMonth[m];
        const net = ganho - gasto;
        return `<tr><td>${name}</td><td style="text-align:right;color:#10B981;font-weight:600">R$ ${ganho.toFixed(2)}</td><td style="text-align:right;color:#EF4444;font-weight:600">R$ ${gasto.toFixed(2)}</td><td style="text-align:right;font-weight:700;color:${net >= 0 ? "#10B981" : "#EF4444"}">R$ ${net.toFixed(2)}</td></tr>`;
      }).join("");

      const entryRows = sorted.map(e => {
        const [, mn] = e.month.split("-");
        const mName = UBER_MONTH_NAMES[parseInt(mn, 10) - 1] ?? e.month;
        const cat = getCategoryLabel(e.category);
        const color = getCategoryColor(e.category);
        const isGanho = e.entryType === "ganho";
        const d = new Date(e.date);
        const dateStr = `${String(d.getUTCDate()).padStart(2,"0")}/${String(d.getUTCMonth()+1).padStart(2,"0")}/${d.getUTCFullYear()}`;
        return `<tr><td>${mName}</td><td>${dateStr}</td><td>${e.description.replace(/</g,"&lt;")}</td><td><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${color};margin-right:4px"></span>${cat}</td><td style="text-align:center"><span style="padding:2px 8px;border-radius:12px;font-size:10px;font-weight:600;background:${isGanho ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)"};color:${isGanho ? "#10B981" : "#EF4444"}">${isGanho ? "Ganho" : "Gasto"}</span></td><td style="text-align:right;font-weight:600;color:${isGanho ? "#10B981" : "#EF4444"}">${isGanho ? "+" : "-"}R$ ${parseFloat(e.value).toFixed(2)}</td></tr>`;
      }).join("");

      const net = totalGanho - totalGasto;
      const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Uber ${exportYear}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;font-size:12px;color:#1a1a1a;padding:24px;background:#fff}
h1{font-size:20px;font-weight:700;margin-bottom:4px}.subtitle{color:#6B7280;font-size:11px;margin-bottom:20px}
.cards{display:flex;gap:12px;margin-bottom:20px}.card{flex:1;border-radius:8px;padding:14px;border:1px solid #e5e7eb;background:#f9fafb}
.clabel{font-size:10px;color:#6B7280;margin-bottom:4px;text-transform:uppercase;letter-spacing:.05em}.cval{font-size:18px;font-weight:700}
h2{font-size:13px;font-weight:700;margin:20px 0 8px;border-bottom:2px solid #e5e7eb;padding-bottom:4px;color:#374151}
table{width:100%;border-collapse:collapse;font-size:11px}
th{background:#f3f4f6;padding:7px 10px;text-align:left;font-weight:600;border-bottom:2px solid #e5e7eb;color:#374151}
td{padding:6px 10px;border-bottom:1px solid #f3f4f6}tr:hover td{background:#f9fafb}
tfoot td{background:#f3f4f6;font-weight:700}
.footer{margin-top:20px;font-size:10px;color:#9CA3AF;text-align:center;padding-top:12px;border-top:1px solid #e5e7eb}
@media print{body{padding:0}@page{margin:1.5cm}}
</style></head><body>
<h1>Relatorio Anual Uber - ${exportYear}</h1>
<div class="subtitle">Gerado em ${gen} &middot; ${data.length} registro${data.length !== 1 ? "s" : ""}</div>
<div class="cards">
  <div class="card" style="border-color:#a7f3d0;background:#ecfdf5"><div class="clabel">Total Ganhos</div><div class="cval" style="color:#059669">R$ ${totalGanho.toFixed(2)}</div></div>
  <div class="card" style="border-color:#fecaca;background:#fef2f2"><div class="clabel">Total Gastos</div><div class="cval" style="color:#dc2626">R$ ${totalGasto.toFixed(2)}</div></div>
  <div class="card" style="border-color:${net >= 0 ? "#a7f3d0" : "#fecaca"};background:${net >= 0 ? "#ecfdf5" : "#fef2f2"}"><div class="clabel">Lucro Liquido</div><div class="cval" style="color:${net >= 0 ? "#059669" : "#dc2626"}">R$ ${net.toFixed(2)}</div></div>
</div>
<h2>Resumo Mensal</h2>
<table><thead><tr><th>Mes</th><th style="text-align:right">Ganhos</th><th style="text-align:right">Gastos</th><th style="text-align:right">Lucro Liquido</th></tr></thead><tbody>${monthRows}</tbody><tfoot><tr><td>Total Anual</td><td style="text-align:right;color:#10B981">R$ ${totalGanho.toFixed(2)}</td><td style="text-align:right;color:#EF4444">R$ ${totalGasto.toFixed(2)}</td><td style="text-align:right;color:${net >= 0 ? "#059669" : "#dc2626"}">R$ ${net.toFixed(2)}</td></tr></tfoot></table>
<h2>Registros Detalhados</h2>
<table><thead><tr><th>Mes</th><th>Data</th><th>Descricao</th><th>Categoria</th><th style="text-align:center">Tipo</th><th style="text-align:right">Valor</th></tr></thead><tbody>${entryRows}</tbody></table>
<div class="footer">Controle de Gastos &mdash; Relatorio Uber ${exportYear}</div>
</body></html>`;

      const blob = new Blob([html], { type: "text/html;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `uber-${exportYear}.html`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
      setShowExportModal(false);
    }
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
              <span className="text-sm font-bold text-foreground">Exportar Uber</span>
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
                style={{ background: "rgba(5,150,105,0.12)", border: "1.5px solid #059669", color: "#059669" }}
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

      {/* Hero card */}
      <div className="rounded-2xl p-5 mb-4 relative overflow-hidden" style={{ background: "linear-gradient(135deg, #059669 0%, #10b981 100%)" }}>
        <div className="absolute top-0 right-0 w-40 h-40 rounded-full opacity-10" style={{ background: "radial-gradient(circle, white, transparent)", transform: "translate(30%, -30%)" }} />
        <div className="text-xs font-semibold mb-1" style={{ color: "rgba(255,255,255,0.65)" }}>LUCRO LÍQUIDO</div>
        <div className="text-4xl font-bold text-white mb-4">{formatCurrency(netBalance)}</div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.12)" }}>
            <div className="text-xs mb-1" style={{ color: "rgba(255,255,255,0.6)" }}>Ganhos</div>
            <div className="text-lg font-bold text-white">{formatCurrency(totalEarnings)}</div>
          </div>
          <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.12)" }}>
            <div className="text-xs mb-1" style={{ color: "rgba(255,255,255,0.6)" }}>Gastos</div>
            <div className="text-lg font-bold text-white">{formatCurrency(totalExpenses)}</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-3">
        {([
          ["todos", "Todos", entries.length],
          ["ganho", "Ganhos", earnings.length],
          ["gasto", "Gastos", expenses.length],
        ] as [TabType, string, number][]).map(([t, label, count]) => (
          <button
            key={t}
            onClick={() => handleTabChange(t)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{
              border: `1.5px solid ${tab === t ? (t === "gasto" ? "#F87171" : t === "ganho" ? "#4ADE80" : "#0a7ea4") : "#334155"}`,
              backgroundColor: tab === t
                ? (t === "gasto" ? "rgba(248,113,113,0.1)" : t === "ganho" ? "rgba(74,222,128,0.1)" : "rgba(10,126,164,0.1)")
                : "transparent",
              color: tab === t
                ? (t === "gasto" ? "#F87171" : t === "ganho" ? "#4ADE80" : "#0a7ea4")
                : "#9BA1A6",
            }}
          >
            {label}
            <span className="text-xs opacity-70">{count}</span>
          </button>
        ))}
      </div>

      {/* Category filter chips */}
      {activeCategories.length > 0 && (
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          <button
            onClick={() => setSelectedCategory("all")}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
            style={{
              border: `1.5px solid ${selectedCategory === "all" ? "#059669" : "#334155"}`,
              backgroundColor: selectedCategory === "all" ? "#059669" : "transparent",
              color: selectedCategory === "all" ? "#fff" : "#9BA1A6",
            }}
          >
            <span style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: selectedCategory === "all" ? "#fff" : "#9BA1A6", display: "inline-block" }} />
            Todos
            <span style={{ opacity: 0.75 }}>{baseEntries.length}</span>
          </button>

          {activeCategories.map((cat) => {
            const isSelected = selectedCategory === cat;
            const color = getCategoryColor(cat);
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
                <span style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: color, display: "inline-block" }} />
                {getCategoryLabel(cat)}
                <span style={{ opacity: 0.7 }}>{formatCurrency(categoryTotals[cat] ?? 0)}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Entry list */}
      <div className="space-y-2">
        {loading ? (
          <div className="py-16 text-center text-muted text-sm">Carregando...</div>
        ) : displayed.length === 0 ? (
          <div className="py-16 text-center text-muted text-sm">Nenhum registro neste mês</div>
        ) : (
          displayed.map((entry) => {
            const isGanho = entry.entryType === "ganho";
            const accentColor = isGanho ? "#4ADE80" : "#F87171";
            const catColor = getCategoryColor(entry.category);
            return (
              <div
                key={entry.id}
                className="flex items-center gap-3 p-4 rounded-2xl bg-surface border border-border transition-all hover:bg-surface-2"
                style={{ borderLeftWidth: 4, borderLeftColor: accentColor }}
              >
                {/* Icon */}
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                  style={{ backgroundColor: catColor + "22" }}
                >
                  {CATEGORY_ICONS[entry.category] ?? "📦"}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-foreground truncate">{entry.description}</div>
                  <div className="text-xs text-muted mt-0.5">{getCategoryLabel(entry.category)}</div>
                </div>

                {/* Value */}
                <div className="text-sm font-bold flex-shrink-0" style={{ color: accentColor }}>
                  {isGanho ? "+" : "-"}{formatCurrency(entry.value)}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-0.5 flex-shrink-0">
                  <button
                    onClick={() => { setEditingEntry(entry); setShowModal(true); }}
                    className="w-8 h-8 rounded-lg text-muted hover:text-foreground hover:bg-surface-2 flex items-center justify-center text-sm transition-colors"
                    title="Editar"
                  >✏️</button>
                  <button
                    onClick={() => handleDelete(entry.id)}
                    className="w-8 h-8 rounded-lg text-muted hover:text-error hover:bg-error/10 flex items-center justify-center text-sm transition-colors"
                    title="Deletar"
                  >🗑️</button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => { setEditingEntry(null); setShowModal(true); }}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full text-white text-3xl font-light flex items-center justify-center z-40 transition-transform active:scale-95 hover:opacity-90"
        style={{ backgroundColor: "#059669", boxShadow: "0 4px 20px rgba(5,150,105,0.45)" }}
      >
        +
      </button>

      {showModal && (
        <UberEntryModal
          entry={editingEntry}
          defaultType={tab === "gasto" ? "gasto" : "ganho"}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditingEntry(null); }}
        />
      )}
    </div>
  );
}
