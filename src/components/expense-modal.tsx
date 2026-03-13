"use client";

import { useState, useEffect } from "react";
import { Expense, ExpenseCategory, CATEGORY_LABELS } from "@/types/expense";

interface Props {
  expense: Expense | null;
  onSave: (data: Omit<Expense, "id" | "date" | "month">) => Promise<void>;
  onClose: () => void;
}

const CATEGORIES = Object.keys(CATEGORY_LABELS) as ExpenseCategory[];

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
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-surface rounded-2xl p-6 w-full max-w-md border border-border">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-foreground">{expense ? "Editar Despesa" : "Nova Despesa"}</h2>
          <button onClick={onClose} className="text-muted hover:text-foreground text-xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-muted font-semibold tracking-wider block mb-1.5">NOME</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Supermercado"
              required
              className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder-muted focus:outline-none focus:border-brand transition-colors"
            />
          </div>

          <div>
            <label className="text-xs text-muted font-semibold tracking-wider block mb-1.5">CATEGORIA</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
              className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:border-brand transition-colors"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-muted font-semibold tracking-wider block mb-1.5">VALOR (R$)</label>
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

          <div>
            <label className="text-xs text-muted font-semibold tracking-wider block mb-1.5">PARCELA (opcional)</label>
            <input
              type="text"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Ex: 1/10"
              className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder-muted focus:outline-none focus:border-brand transition-colors"
            />
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={paid} onChange={(e) => setPaid(e.target.checked)} className="w-4 h-4 rounded accent-brand" />
            <span className="text-sm text-foreground">Já pago</span>
          </label>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border border-border text-sm text-muted hover:text-foreground transition-colors">Cancelar</button>
            <button type="submit" disabled={loading} className="flex-1 py-3 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand/90 disabled:opacity-60 transition-colors">
              {loading ? "Salvando..." : expense ? "Salvar" : "Adicionar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
