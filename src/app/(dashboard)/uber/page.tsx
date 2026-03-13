"use client";

import { useState } from "react";
import { useUberEarnings } from "@/hooks/use-uber-earnings";
import { getCurrentMonth, formatMonth, getPrevMonth, getNextMonth } from "@/shared/expense-utils";
import { UberEntry, getCategoryLabel, getCategoryColor } from "@/types/uber-earnings";
import { UberEntryModal } from "@/components/uber-entry-modal";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export default function UberPage() {
  const [month, setMonth] = useState(getCurrentMonth());
  const [showModal, setShowModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<UberEntry | null>(null);
  const [tab, setTab] = useState<"ganho" | "gasto">("ganho");

  const { entries, earnings, expenses, totalEarnings, totalExpenses, netBalance, loading, addEntry, updateEntry, deleteEntry } = useUberEarnings(month);

  const displayed = tab === "ganho" ? earnings : expenses;

  const handleSave = async (data: Omit<UberEntry, "id" | "date" | "month">) => {
    if (editingEntry) await updateEntry(editingEntry.id, data);
    else await addEntry(data);
    setShowModal(false);
    setEditingEntry(null);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Deletar esta entrada?")) await deleteEntry(id);
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => setMonth(getPrevMonth(month))} className="w-8 h-8 rounded-lg bg-surface-2 border border-border text-muted hover:text-foreground flex items-center justify-center transition-colors">‹</button>
          <h1 className="text-lg font-semibold text-foreground capitalize">{formatMonth(month)}</h1>
          <button onClick={() => setMonth(getNextMonth(month))} className="w-8 h-8 rounded-lg bg-surface-2 border border-border text-muted hover:text-foreground flex items-center justify-center transition-colors">›</button>
        </div>
        <button onClick={() => { setEditingEntry(null); setShowModal(true); }} className="px-4 py-2 bg-brand text-white text-sm font-semibold rounded-xl hover:bg-brand/90 transition-colors">
          + Adicionar
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-surface rounded-xl p-4 border border-border">
          <div className="text-xs text-muted mb-1">Ganhos</div>
          <div className="text-lg font-bold text-success">{formatCurrency(totalEarnings)}</div>
        </div>
        <div className="bg-surface rounded-xl p-4 border border-border">
          <div className="text-xs text-muted mb-1">Gastos</div>
          <div className="text-lg font-bold text-error">{formatCurrency(totalExpenses)}</div>
        </div>
        <div className="bg-surface rounded-xl p-4 border border-border">
          <div className="text-xs text-muted mb-1">Líquido</div>
          <div className={`text-lg font-bold ${netBalance >= 0 ? "text-success" : "text-error"}`}>{formatCurrency(netBalance)}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {(["ganho", "gasto"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-colors ${tab === t ? "bg-brand/10 text-brand border-brand/30" : "bg-surface text-muted border-border hover:text-foreground"}`}>
            {t === "ganho" ? "🟢 Ganhos" : "🔴 Gastos"}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted">Carregando...</div>
        ) : displayed.length === 0 ? (
          <div className="p-8 text-center text-muted">Nenhum registro neste mês</div>
        ) : (
          <div className="divide-y divide-border">
            {displayed.map((entry) => (
              <div key={entry.id} className="flex items-center gap-3 p-4 hover:bg-surface-2 transition-colors">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: getCategoryColor(entry.category) }} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{entry.description}</div>
                  <div className="text-xs text-muted mt-0.5">{getCategoryLabel(entry.category)}</div>
                </div>
                <div className={`text-sm font-semibold ${entry.entryType === "ganho" ? "text-success" : "text-error"}`}>
                  {entry.entryType === "ganho" ? "+" : "-"}{formatCurrency(entry.value)}
                </div>
                <div className="flex items-center gap-1 ml-2">
                  <button onClick={() => { setEditingEntry(entry); setShowModal(true); }} className="w-7 h-7 rounded-lg text-muted hover:text-foreground hover:bg-surface flex items-center justify-center text-xs transition-colors">✏️</button>
                  <button onClick={() => handleDelete(entry.id)} className="w-7 h-7 rounded-lg text-muted hover:text-error hover:bg-error/10 flex items-center justify-center text-xs transition-colors">🗑️</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <UberEntryModal
          entry={editingEntry}
          defaultType={tab}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditingEntry(null); }}
        />
      )}
    </div>
  );
}
