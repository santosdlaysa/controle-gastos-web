"use client";

import { useState, useEffect } from "react";
import { Expense, ExpenseCategory, CATEGORY_LABELS, CATEGORY_COLORS } from "@/types/expense";

interface Props {
  expense: Expense | null;
  onSave: (data: Omit<Expense, "id" | "date" | "month">) => Promise<void>;
  onClose: () => void;
}

const CATEGORIES = Object.keys(CATEGORY_LABELS) as ExpenseCategory[];

const CATEGORY_ICONS: Record<ExpenseCategory, string> = {
  transporte: "🚗",
  alimentacao: "🍔",
  moradia: "🏠",
  saude: "❤️",
  educacao: "📚",
  lazer: "🎮",
  outro: "📦",
};

export function ExpenseModal({ expense, onSave, onClose }: Props) {
  const [name, setName] = useState(expense?.name ?? "");
  const [category, setCategory] = useState<ExpenseCategory>(expense?.category ?? "outro");
  const [value, setValue] = useState(expense ? expense.value.toFixed(2) : "");
  const [quantity, setQuantity] = useState(expense?.quantity ?? "");
  const [paid, setPaid] = useState(expense?.paid ?? false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (expense) {
      setName(expense.name);
      setCategory(expense.category);
      setValue(expense.value.toFixed(2));
      setQuantity(expense.quantity ?? "");
      setPaid(expense.paid ?? false);
    }
  }, [expense]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !value) return;
    setLoading(true);
    try {
      await onSave({ name: name.trim(), category, value: parseFloat(value), quantity: quantity || undefined, paid });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-surface w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl border border-border overflow-hidden">
        {/* Handle bar (mobile style) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        <div className="p-6 overflow-y-auto max-h-[90vh]">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-foreground">
              {expense ? "Editar Despesa" : "Adicionar Despesa"}
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-surface-2 flex items-center justify-center text-muted hover:text-foreground transition-colors text-lg"
            >×</button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted tracking-wider">NOME DA DESPESA</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Supermercado"
                required
                className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder-muted focus:outline-none focus:border-brand transition-colors"
              />
            </div>

            {/* Category chips */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted tracking-wider">CATEGORIA</label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => {
                  const isSelected = category === cat;
                  const color = CATEGORY_COLORS[cat];
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all"
                      style={{
                        border: `${isSelected ? 2 : 1.5}px solid ${isSelected ? color : "#334155"}`,
                        backgroundColor: isSelected ? color + "22" : "transparent",
                        color: isSelected ? color : "#9BA1A6",
                      }}
                    >
                      <span>{CATEGORY_ICONS[cat]}</span>
                      {CATEGORY_LABELS[cat]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Value */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted tracking-wider">VALOR (R$)</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="0,00"
                required
                className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder-muted focus:outline-none focus:border-brand transition-colors"
              />
            </div>

            {/* Installments */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted tracking-wider">PARCELA (opcional)</label>
              <input
                type="text"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="Ex: 1/10"
                className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder-muted focus:outline-none focus:border-brand transition-colors"
              />
            </div>

            {/* Paid toggle */}
            <button
              type="button"
              onClick={() => setPaid(v => !v)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all"
              style={{
                borderColor: paid ? "#4ADE80" : "#334155",
                backgroundColor: paid ? "rgba(74,222,128,0.08)" : "transparent",
              }}
            >
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
                style={{
                  border: `2px solid ${paid ? "#4ADE80" : "#9BA1A6"}`,
                  backgroundColor: paid ? "#4ADE80" : "transparent",
                }}
              >
                {paid && (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <span className="text-sm font-medium" style={{ color: paid ? "#4ADE80" : "#9BA1A6" }}>
                {paid ? "Marcado como pago" : "Marcar como pago"}
              </span>
            </button>

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 rounded-xl border border-border text-sm text-muted hover:text-foreground transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand/90 disabled:opacity-60 transition-colors"
              >
                {loading ? "Salvando..." : expense ? "Salvar" : "Adicionar"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
