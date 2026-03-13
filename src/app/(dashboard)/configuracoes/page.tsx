"use client";

import { useState, useEffect } from "react";
import { getCurrentMonth } from "@/shared/expense-utils";
import { useExpenses } from "@/hooks/use-expenses";
import { CATEGORY_LABELS, CATEGORY_COLORS, ExpenseCategory } from "@/types/expense";
import { useAuth } from "@/providers/auth-provider";
import { trpc } from "@/lib/trpc";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

const CATEGORY_ICONS: Record<ExpenseCategory, string> = {
  transporte: "🚗", alimentacao: "🍔", moradia: "🏠",
  saude: "❤️", educacao: "📚", lazer: "🎮", outro: "📦",
};

export default function ConfiguracoesPage() {
  const month = getCurrentMonth();
  const { user, logout, refetch } = useAuth();
  const { income, budget, categoryBudgets, updateIncome, updateBudget, updateCategoryBudgets } = useExpenses(month);

  // Income & budget state
  const [salary, setSalary] = useState("");
  const [vale, setVale] = useState("");
  const [otherIncome, setOtherIncome] = useState("");
  const [totalBudget, setTotalBudget] = useState("");
  const [catBudgets, setCatBudgets] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Profile state
  const [name, setName] = useState(user?.name ?? "");
  const [nameChanged, setNameChanged] = useState(false);
  const [savingName, setSavingName] = useState(false);

  // Delete account state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Mutations
  const updateNameMut = trpc.profile.updateName.useMutation({
    onSuccess: async () => {
      await refetch();
      setNameChanged(false);
      setSavingName(false);
    },
  });

  const deleteAccountMut = trpc.profile.deleteAccount.useMutation({
    onSuccess: () => logout(),
  });

  useEffect(() => {
    setSalary(income.salary > 0 ? income.salary.toFixed(2) : "");
    setVale(income.vale > 0 ? income.vale.toFixed(2) : "");
    setOtherIncome(income.other > 0 ? income.other.toFixed(2) : "");
    setTotalBudget(budget > 0 ? budget.toFixed(2) : "");
    const cb: Record<string, string> = {};
    for (const [cat, amt] of Object.entries(categoryBudgets)) {
      if (amt) cb[cat] = (amt as number).toFixed(2);
    }
    setCatBudgets(cb);
  }, [income, budget, categoryBudgets]);

  useEffect(() => {
    if (user?.name) setName(user.name);
  }, [user]);

  const handleSaveName = async () => {
    if (!name.trim()) return;
    setSavingName(true);
    updateNameMut.mutate({ name: name.trim() });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await Promise.all([
        updateIncome({ salary: parseFloat(salary) || 0, vale: parseFloat(vale) || 0, other: parseFloat(otherIncome) || 0 }),
        updateBudget(parseFloat(totalBudget) || 0),
        updateCategoryBudgets(Object.fromEntries(Object.entries(catBudgets).map(([k, v]) => [k, parseFloat(v) || 0])) as any),
      ]);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const categories = Object.keys(CATEGORY_LABELS) as ExpenseCategory[];
  const initials = (name || user?.email || "?")[0].toUpperCase();

  return (
    <div className="p-6 max-w-xl mx-auto pb-8">
      <h1 className="text-xl font-bold text-foreground mb-6">Configurações</h1>

      {/* Profile card */}
      <div className="bg-surface rounded-2xl p-5 border border-border mb-4">
        <div className="flex items-center gap-4 mb-4">
          {/* Avatar */}
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold text-white flex-shrink-0"
            style={{ backgroundColor: "#0a7ea4" }}
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-muted mb-1">Email</div>
            <div className="text-sm text-foreground truncate">{user?.email}</div>
          </div>
        </div>

        {/* Editable name */}
        <div>
          <label className="text-xs font-semibold text-muted tracking-wider block mb-2">NOME</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setNameChanged(e.target.value !== (user?.name ?? "")); }}
              placeholder="Seu nome"
              className="flex-1 bg-surface-2 border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder-muted focus:outline-none focus:border-brand transition-colors"
            />
            {nameChanged && (
              <button
                onClick={handleSaveName}
                disabled={savingName}
                className="px-4 py-2 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand/90 disabled:opacity-60 transition-colors flex-shrink-0"
              >
                {savingName ? "..." : "Salvar"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Income */}
      <div className="bg-surface rounded-2xl p-5 border border-border mb-4">
        <h2 className="text-sm font-semibold text-foreground mb-4">Receita Mensal</h2>
        <div className="space-y-3">
          {[
            { label: "Salário", icon: "💰", value: salary, set: setSalary },
            { label: "Vale", icon: "🎫", value: vale, set: setVale },
            { label: "Outros", icon: "➕", value: otherIncome, set: setOtherIncome },
          ].map(({ label, icon, value, set }) => (
            <div key={label} className="flex items-center gap-3">
              <span className="text-base w-6 flex-shrink-0">{icon}</span>
              <label className="text-xs text-muted w-14">{label}</label>
              <input
                type="number" min="0" step="0.01"
                value={value}
                onChange={(e) => set(e.target.value)}
                placeholder="0,00"
                className="flex-1 bg-surface-2 border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder-muted focus:outline-none focus:border-brand transition-colors"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Total budget */}
      <div className="bg-surface rounded-2xl p-5 border border-border mb-4">
        <h2 className="text-sm font-semibold text-foreground mb-3">Orçamento Total (mês atual)</h2>
        <input
          type="number" min="0" step="0.01"
          value={totalBudget}
          onChange={(e) => setTotalBudget(e.target.value)}
          placeholder="0,00"
          className="w-full bg-surface-2 border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder-muted focus:outline-none focus:border-brand transition-colors"
        />
      </div>

      {/* Category budgets */}
      <div className="bg-surface rounded-2xl p-5 border border-border mb-5">
        <h2 className="text-sm font-semibold text-foreground mb-4">Orçamento por Categoria</h2>
        <div className="space-y-3">
          {categories.map((cat) => (
            <div key={cat} className="flex items-center gap-3">
              <span className="text-base w-6 flex-shrink-0">{CATEGORY_ICONS[cat]}</span>
              <label className="text-xs text-muted w-24">{CATEGORY_LABELS[cat]}</label>
              <input
                type="number" min="0" step="0.01"
                value={catBudgets[cat] ?? ""}
                onChange={(e) => setCatBudgets((prev) => ({ ...prev, [cat]: e.target.value }))}
                placeholder="0,00"
                className="flex-1 bg-surface-2 border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder-muted focus:outline-none focus:border-brand transition-colors"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className={`w-full py-3.5 rounded-xl font-semibold text-sm transition-colors mb-6 ${saved ? "bg-success text-white" : "bg-brand text-white hover:bg-brand/90"} disabled:opacity-60`}
      >
        {saved ? "✓ Salvo!" : saving ? "Salvando..." : "Salvar Configurações"}
      </button>

      {/* Danger zone */}
      <div className="rounded-2xl p-5 border mb-2" style={{ borderColor: "rgba(248,113,113,0.3)", backgroundColor: "rgba(248,113,113,0.05)" }}>
        <h2 className="text-sm font-semibold mb-1" style={{ color: "#F87171" }}>Zona de Perigo</h2>
        <p className="text-xs text-muted mb-4">Ações irreversíveis. Prossiga com cuidado.</p>

        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full py-3 rounded-xl text-sm font-semibold transition-colors"
            style={{ border: "1.5px solid #F87171", color: "#F87171", backgroundColor: "transparent" }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(248,113,113,0.1)")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
          >
            🗑️ Deletar Conta
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-center" style={{ color: "#F87171" }}>
              Esta ação é <strong>irreversível</strong>. Todos os dados serão apagados permanentemente.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2.5 rounded-xl text-sm text-muted border border-border hover:text-foreground transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => deleteAccountMut.mutate()}
                disabled={deleteAccountMut.isPending}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-60"
                style={{ backgroundColor: "#F87171" }}
              >
                {deleteAccountMut.isPending ? "Deletando..." : "Confirmar"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
