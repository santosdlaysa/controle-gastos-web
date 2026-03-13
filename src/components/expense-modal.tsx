"use client";

import { useState, useEffect } from "react";
import { Expense, ExpenseCategory, CATEGORY_LABELS, CATEGORY_COLORS } from "@/types/expense";
import { getNextMonth, parseQuantity, formatMonth } from "@/shared/expense-utils";
import { trpc } from "@/lib/trpc";

interface Props {
  expense: Expense | null;
  currentMonth: string;
  onSave: (data: Omit<Expense, "id" | "date" | "month">) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  onMoveToNextMonth?: (id: string) => Promise<void>;
  onGenerateInstallments?: (id: string) => Promise<void>;
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

export function ExpenseModal({ expense, currentMonth, onSave, onDelete, onMoveToNextMonth, onGenerateInstallments, onClose }: Props) {
  const [name, setName] = useState(expense?.name ?? "");
  const [category, setCategory] = useState<ExpenseCategory>(expense?.category ?? "outro");
  const [value, setValue] = useState(expense ? expense.value.toFixed(2) : "");
  const [quantity, setQuantity] = useState(expense?.quantity ?? "");
  const [paid, setPaid] = useState(expense?.paid ?? false);
  const [bank, setBank] = useState(expense?.bank ?? "");
  const [showBankList, setShowBankList] = useState(false);
  const [loading, setLoading] = useState(false);

  const banksQuery = trpc.bank.getAll.useQuery();
  const savedBanks: string[] = banksQuery.data ?? [];
  const filteredBanks = bank.trim()
    ? savedBanks.filter((b) => b.toLowerCase().includes(bank.toLowerCase()))
    : savedBanks;

  // Validation errors
  const [errors, setErrors] = useState<{ name?: string; amount?: string }>({});

  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Move to next month confirmation
  const [showMoveConfirm, setShowMoveConfirm] = useState(false);
  const [moveLoading, setMoveLoading] = useState(false);

  // Generate installments confirmation
  const [showGenerateConfirm, setShowGenerateConfirm] = useState(false);
  const [generateLoading, setGenerateLoading] = useState(false);

  useEffect(() => {
    if (expense) {
      setName(expense.name);
      setCategory(expense.category);
      setValue(expense.value.toFixed(2));
      setQuantity(expense.quantity ?? "");
      setPaid(expense.paid ?? false);
      setBank(expense.bank ?? "");
    }
  }, [expense]);

  // Derived installment info
  const parsedInstallments = parseQuantity(expense?.quantity);
  const isInstallmentExpense = !!parsedInstallments;
  const hasRemainingInstallments =
    parsedInstallments !== null &&
    parsedInstallments.installmentCurrent < parsedInstallments.installmentTotal;
  const remainingCount = hasRemainingInstallments
    ? parsedInstallments!.installmentTotal - parsedInstallments!.installmentCurrent
    : 0;
  const nextMonth = getNextMonth(currentMonth);
  const nextMonthLabel = formatMonth(nextMonth);

  const validate = (): boolean => {
    const newErrors: { name?: string; amount?: string } = {};
    if (!name.trim()) {
      newErrors.name = "Nome da despesa é obrigatório";
    }
    const numVal = parseFloat(value);
    if (!value || isNaN(numVal) || numVal <= 0) {
      newErrors.amount = "Valor deve ser um número positivo";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await onSave({ name: name.trim(), category, value: parseFloat(value), quantity: quantity || undefined, paid, bank: bank.trim() || undefined });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!expense || !onDelete) return;
    setDeleteLoading(true);
    try {
      await onDelete(expense.id);
      onClose();
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleConfirmMove = async () => {
    if (!expense || !onMoveToNextMonth) return;
    setMoveLoading(true);
    try {
      await onMoveToNextMonth(expense.id);
      onClose();
    } finally {
      setMoveLoading(false);
    }
  };

  const handleConfirmGenerate = async () => {
    if (!expense || !onGenerateInstallments) return;
    setGenerateLoading(true);
    try {
      await onGenerateInstallments(expense.id);
      onClose();
    } finally {
      setGenerateLoading(false);
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
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
                }}
                placeholder="Ex: Supermercado"
                className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder-muted focus:outline-none focus:border-brand transition-colors"
              />
              {errors.name && (
                <p className="text-xs mt-1" style={{ color: "#F87171" }}>{errors.name}</p>
              )}
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
                onChange={(e) => {
                  setValue(e.target.value);
                  if (errors.amount) setErrors((prev) => ({ ...prev, amount: undefined }));
                }}
                placeholder="0,00"
                className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder-muted focus:outline-none focus:border-brand transition-colors"
              />
              {errors.amount && (
                <p className="text-xs mt-1" style={{ color: "#F87171" }}>{errors.amount}</p>
              )}
            </div>

            {/* Bank */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted tracking-wider">BANCO / CARTÃO (opcional)</label>
              <div className="relative">
                <input
                  type="text"
                  value={bank}
                  onChange={(e) => { setBank(e.target.value); setShowBankList(true); }}
                  onFocus={() => setShowBankList(true)}
                  onBlur={() => setTimeout(() => setShowBankList(false), 150)}
                  placeholder="Ex: Nubank, Bradesco..."
                  className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder-muted focus:outline-none focus:border-brand transition-colors"
                />
                {showBankList && filteredBanks.length > 0 && (
                  <ul className="absolute z-10 w-full mt-1 bg-surface border border-border rounded-xl overflow-hidden shadow-lg">
                    {filteredBanks.map((b) => (
                      <li key={b}>
                        <button
                          type="button"
                          onMouseDown={() => { setBank(b); setShowBankList(false); }}
                          className="w-full text-left px-4 py-2.5 text-sm text-foreground hover:bg-surface-2 transition-colors flex items-center gap-2"
                        >
                          <span>🏦</span>
                          {b}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
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

            {/* Move to next month button (editing installment expenses only) */}
            {expense && isInstallmentExpense && onMoveToNextMonth && (
              <div className="pt-1">
                {showMoveConfirm ? (
                  <div className="rounded-xl border border-border p-3 space-y-3">
                    <p className="text-sm text-foreground">
                      Mover esta despesa para {nextMonthLabel}?
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setShowMoveConfirm(false)}
                        className="flex-1 py-2 rounded-xl border border-border text-xs text-muted hover:text-foreground transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmMove}
                        disabled={moveLoading}
                        className="flex-1 py-2 rounded-xl text-xs font-semibold disabled:opacity-60 transition-colors"
                        style={{ backgroundColor: "#0a7ea422", border: "1px solid #0a7ea4", color: "#0a7ea4" }}
                      >
                        {moveLoading ? "Movendo..." : "Confirmar"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowMoveConfirm(true)}
                    className="w-full py-3 rounded-xl text-sm font-semibold transition-colors"
                    style={{ border: "1.5px solid #0a7ea4", color: "#0a7ea4", backgroundColor: "transparent" }}
                  >
                    Mover para próx. mês →
                  </button>
                )}
              </div>
            )}

            {/* Generate remaining installments button */}
            {expense && hasRemainingInstallments && onGenerateInstallments && (
              <div className="pt-1">
                {showGenerateConfirm ? (
                  <div className="rounded-xl border border-border p-3 space-y-3">
                    <p className="text-sm text-foreground">
                      Criar as {remainingCount} parcela{remainingCount !== 1 ? "s" : ""} restante{remainingCount !== 1 ? "s" : ""} nos próximos meses?
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setShowGenerateConfirm(false)}
                        className="flex-1 py-2 rounded-xl border border-border text-xs text-muted hover:text-foreground transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmGenerate}
                        disabled={generateLoading}
                        className="flex-1 py-2 rounded-xl text-xs font-semibold disabled:opacity-60 transition-colors"
                        style={{ backgroundColor: "#0a7ea422", border: "1px solid #0a7ea4", color: "#0a7ea4" }}
                      >
                        {generateLoading ? "Gerando..." : "Confirmar"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowGenerateConfirm(true)}
                    className="w-full py-3 rounded-xl text-sm font-semibold transition-colors"
                    style={{ border: "1.5px solid #0a7ea4", color: "#0a7ea4", backgroundColor: "transparent" }}
                  >
                    Gerar parcelas restantes ({remainingCount})
                  </button>
                )}
              </div>
            )}

            {/* Delete button (editing only) */}
            {expense && onDelete && (
              <div className="pt-1">
                {showDeleteConfirm ? (
                  <div className="rounded-xl border p-3 space-y-3" style={{ borderColor: "#F87171" }}>
                    <p className="text-sm" style={{ color: "#F87171" }}>
                      Tem certeza? Esta ação é irreversível.
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(false)}
                        className="flex-1 py-2 rounded-xl border border-border text-xs text-muted hover:text-foreground transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmDelete}
                        disabled={deleteLoading}
                        className="flex-1 py-2 rounded-xl text-xs font-semibold disabled:opacity-60 transition-colors"
                        style={{ backgroundColor: "rgba(248,113,113,0.15)", border: "1px solid #F87171", color: "#F87171" }}
                      >
                        {deleteLoading ? "Deletando..." : "Confirmar"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="w-full py-3 rounded-xl text-sm font-semibold transition-colors"
                    style={{ border: "1.5px solid #F87171", color: "#F87171", backgroundColor: "transparent" }}
                  >
                    Deletar despesa
                  </button>
                )}
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
