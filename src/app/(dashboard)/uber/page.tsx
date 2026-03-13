"use client";

import { useState } from "react";
import { useUberEarnings } from "@/hooks/use-uber-earnings";
import { getCurrentMonth, formatMonth, getPrevMonth, getNextMonth } from "@/shared/expense-utils";
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
      </div>

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
