"use client";

import { useState, useEffect } from "react";
import { UberEntry, UberEntryType, UBER_EARNING_CATEGORIES, UBER_EXPENSE_CATEGORIES, UBER_EARNING_CATEGORY_LABELS, UBER_EXPENSE_CATEGORY_LABELS, UberCategory } from "@/types/uber-earnings";

interface Props {
  entry: UberEntry | null;
  defaultType?: UberEntryType;
  onSave: (data: Omit<UberEntry, "id" | "date" | "month">) => Promise<void>;
  onClose: () => void;
}

export function UberEntryModal({ entry, defaultType = "ganho", onSave, onClose }: Props) {
  const [description, setDescription] = useState(entry?.description ?? "");
  const [entryType, setEntryType] = useState<UberEntryType>(entry?.entryType ?? defaultType);
  const [category, setCategory] = useState<UberCategory>(entry?.category ?? "corrida");
  const [value, setValue] = useState(entry ? entry.value.toFixed(2) : "");
  const [loading, setLoading] = useState(false);

  const categories = entryType === "ganho" ? UBER_EARNING_CATEGORIES : UBER_EXPENSE_CATEGORIES;
  const labels = entryType === "ganho" ? UBER_EARNING_CATEGORY_LABELS : UBER_EXPENSE_CATEGORY_LABELS;

  useEffect(() => {
    // Reset category when type changes
    setCategory(entryType === "ganho" ? "corrida" : "combustivel");
  }, [entryType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !value) return;
    setLoading(true);
    try {
      await onSave({ description: description.trim(), category, entryType, value: parseFloat(value) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-surface rounded-2xl p-6 w-full max-w-md border border-border">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-foreground">{entry ? "Editar Entrada" : "Nova Entrada"}</h2>
          <button onClick={onClose} className="text-muted hover:text-foreground text-xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type toggle */}
          <div className="flex gap-2">
            {(["ganho", "gasto"] as UberEntryType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setEntryType(t)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${entryType === t ? (t === "ganho" ? "bg-success/10 text-success border-success/30" : "bg-error/10 text-error border-error/30") : "bg-surface-2 text-muted border-border hover:text-foreground"}`}
              >
                {t === "ganho" ? "🟢 Ganho" : "🔴 Gasto"}
              </button>
            ))}
          </div>

          <div>
            <label className="text-xs text-muted font-semibold tracking-wider block mb-1.5">DESCRIÇÃO</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Corridas de domingo"
              required
              className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder-muted focus:outline-none focus:border-brand transition-colors"
            />
          </div>

          <div>
            <label className="text-xs text-muted font-semibold tracking-wider block mb-1.5">CATEGORIA</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as UberCategory)}
              className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:border-brand transition-colors"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>{(labels as Record<string, string>)[cat]}</option>
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

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border border-border text-sm text-muted hover:text-foreground transition-colors">Cancelar</button>
            <button type="submit" disabled={loading} className="flex-1 py-3 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand/90 disabled:opacity-60 transition-colors">
              {loading ? "Salvando..." : entry ? "Salvar" : "Adicionar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
