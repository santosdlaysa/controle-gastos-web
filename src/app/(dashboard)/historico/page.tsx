"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useExpenses } from "@/hooks/use-expenses";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function getMonthLabel(monthStr: string): string {
  const [year, month] = monthStr.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return date.toLocaleDateString("pt-BR", { month: "long" });
}

export default function HistoricoPage() {
  const currentYear = new Date().getFullYear().toString();
  const [year, setYear] = useState(currentYear);
  const [tab, setTab] = useState<"personal" | "uber">("personal");

  const { data: personalData, isLoading: loadingPersonal } = trpc.history.getMonthly.useQuery();
  const { data: uberData, isLoading: loadingUber } = trpc.uberEarnings.getMonthlyHistory.useQuery();
  const { income } = useExpenses(year + "-01");

  const totalMonthlyIncome = income.salary + income.vale + income.other;

  const personalYear = (personalData ?? [])
    .filter((r) => r.month.startsWith(year))
    .sort((a, b) => b.month.localeCompare(a.month));

  const uberYear = (uberData ?? [])
    .filter((r) => r.month.startsWith(year))
    .sort((a, b) => b.month.localeCompare(a.month));

  const personalAnnualExpenses = personalYear.reduce((sum, r) => sum + parseFloat(r.totalExpenses ?? "0"), 0);
  const personalAnnualIncome = totalMonthlyIncome * personalYear.length;
  const personalAnnualBalance = personalAnnualIncome - personalAnnualExpenses;

  const uberAnnualEarnings = uberYear.reduce((sum, r) => sum + parseFloat(r.totalEarnings ?? "0"), 0);
  const uberAnnualExpenses = uberYear.reduce((sum, r) => sum + parseFloat(r.totalExpenses ?? "0"), 0);
  const uberAnnualProfit = uberAnnualEarnings - uberAnnualExpenses;

  const isPersonal = tab === "personal";
  const heroGradient = isPersonal
    ? "linear-gradient(135deg, #0a7ea4 0%, #0891b2 100%)"
    : "linear-gradient(135deg, #059669 0%, #10b981 100%)";
  const heroShadow = isPersonal ? "rgba(10,126,164,0.45)" : "rgba(5,150,105,0.45)";

  const loading = loadingPersonal || loadingUber;

  return (
    <div className="p-6 max-w-2xl mx-auto pb-8">
      {/* Year navigation */}
      <div className="flex items-center justify-center gap-4 mb-5">
        <button
          onClick={() => setYear((y) => String(parseInt(y) - 1))}
          className="w-9 h-9 rounded-xl bg-surface border border-border flex items-center justify-center text-lg text-muted hover:text-foreground transition-colors"
        >‹</button>
        <span className="text-sm font-semibold text-foreground/80 w-16 text-center">{year}</span>
        <button
          onClick={() => setYear((y) => String(parseInt(y) + 1))}
          className="w-9 h-9 rounded-xl bg-surface border border-border flex items-center justify-center text-lg text-muted hover:text-foreground transition-colors"
        >›</button>
      </div>

      {/* Hero card */}
      <div className="rounded-2xl p-5 mb-4 relative overflow-hidden" style={{ background: heroGradient }}>
        <div className="absolute top-0 right-0 w-40 h-40 rounded-full opacity-10" style={{ background: "radial-gradient(circle, white, transparent)", transform: "translate(30%, -30%)" }} />
        <div className="text-xs font-semibold mb-1" style={{ color: "rgba(255,255,255,0.65)" }}>
          {isPersonal ? "SALDO ANUAL" : "LUCRO ANUAL"}
        </div>
        <div className="text-4xl font-bold text-white mb-1">
          {formatCurrency(isPersonal ? personalAnnualBalance : uberAnnualProfit)}
        </div>
        <div className="text-xs mb-4" style={{ color: "rgba(255,255,255,0.55)" }}>
          {isPersonal ? personalYear.length : uberYear.length} {isPersonal ? (personalYear.length === 1 ? "mês registrado" : "meses registrados") : (uberYear.length === 1 ? "mês registrado" : "meses registrados")}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {isPersonal ? (
            <>
              <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.12)" }}>
                <div className="text-xs mb-1" style={{ color: "rgba(255,255,255,0.6)" }}>Receita estimada</div>
                <div className="text-lg font-bold text-white">{formatCurrency(personalAnnualIncome)}</div>
              </div>
              <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.12)" }}>
                <div className="text-xs mb-1" style={{ color: "rgba(255,255,255,0.6)" }}>Total Gastos</div>
                <div className="text-lg font-bold text-white">{formatCurrency(personalAnnualExpenses)}</div>
              </div>
            </>
          ) : (
            <>
              <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.12)" }}>
                <div className="text-xs mb-1" style={{ color: "rgba(255,255,255,0.6)" }}>Total Ganhos</div>
                <div className="text-lg font-bold text-white">{formatCurrency(uberAnnualEarnings)}</div>
              </div>
              <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.12)" }}>
                <div className="text-xs mb-1" style={{ color: "rgba(255,255,255,0.6)" }}>Total Gastos</div>
                <div className="text-lg font-bold text-white">{formatCurrency(uberAnnualExpenses)}</div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Tab */}
      <div className="flex gap-2 mb-5">
        {([["personal", "💳", "Pessoal"], ["uber", "🚗", "Uber"]] as const).map(([t, icon, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{
              border: `1.5px solid ${tab === t ? (t === "personal" ? "#0a7ea4" : "#059669") : "#334155"}`,
              backgroundColor: tab === t ? (t === "personal" ? "rgba(10,126,164,0.12)" : "rgba(5,150,105,0.12)") : "transparent",
              color: tab === t ? (t === "personal" ? "#0a7ea4" : "#4ADE80") : "#9BA1A6",
            }}
          >
            {icon} {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="py-16 text-center text-muted text-sm">Carregando...</div>
      ) : isPersonal ? (
        personalYear.length === 0 ? (
          <div className="py-16 text-center text-muted text-sm">Nenhum dado em {year}</div>
        ) : (
          <div className="space-y-3">
            {personalYear.map((row) => {
              const exp = parseFloat(row.totalExpenses ?? "0");
              const bal = totalMonthlyIncome - exp;
              const pct = personalAnnualExpenses > 0 ? Math.round((exp / Math.max(...personalYear.map(r => parseFloat(r.totalExpenses ?? "0")))) * 100) : 0;
              return (
                <div key={row.month} className="bg-surface rounded-2xl p-4 border border-border">
                  <div className="text-sm font-semibold text-foreground capitalize mb-3">{getMonthLabel(row.month)}</div>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="bg-surface-2 rounded-xl p-2.5 text-center">
                      <div className="text-xs text-muted mb-1">Receita</div>
                      <div className="text-sm font-bold" style={{ color: "#0a7ea4" }}>{formatCurrency(totalMonthlyIncome)}</div>
                    </div>
                    <div className="bg-surface-2 rounded-xl p-2.5 text-center">
                      <div className="text-xs text-muted mb-1">Gastos</div>
                      <div className="text-sm font-bold" style={{ color: "#F87171" }}>{formatCurrency(exp)}</div>
                    </div>
                    <div className="bg-surface-2 rounded-xl p-2.5 text-center">
                      <div className="text-xs text-muted mb-1">Saldo</div>
                      <div className="text-sm font-bold" style={{ color: bal >= 0 ? "#4ADE80" : "#F87171" }}>{formatCurrency(bal)}</div>
                    </div>
                  </div>
                  <div className="h-1.5 bg-surface-2 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: "#0a7ea4" }} />
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        uberYear.length === 0 ? (
          <div className="py-16 text-center text-muted text-sm">Nenhum dado Uber em {year}</div>
        ) : (
          <div className="space-y-3">
            {uberYear.map((row) => {
              const earn = parseFloat(row.totalEarnings ?? "0");
              const exp = parseFloat(row.totalExpenses ?? "0");
              const profit = earn - exp;
              const maxEarn = Math.max(...uberYear.map(r => parseFloat(r.totalEarnings ?? "0")), 1);
              const pct = Math.round((earn / maxEarn) * 100);
              return (
                <div key={row.month} className="bg-surface rounded-2xl p-4 border border-border">
                  <div className="text-sm font-semibold text-foreground capitalize mb-3">{getMonthLabel(row.month)}</div>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="bg-surface-2 rounded-xl p-2.5 text-center">
                      <div className="text-xs text-muted mb-1">Ganhos</div>
                      <div className="text-sm font-bold" style={{ color: "#4ADE80" }}>{formatCurrency(earn)}</div>
                    </div>
                    <div className="bg-surface-2 rounded-xl p-2.5 text-center">
                      <div className="text-xs text-muted mb-1">Gastos</div>
                      <div className="text-sm font-bold" style={{ color: "#F87171" }}>{formatCurrency(exp)}</div>
                    </div>
                    <div className="bg-surface-2 rounded-xl p-2.5 text-center">
                      <div className="text-xs text-muted mb-1">Lucro</div>
                      <div className="text-sm font-bold" style={{ color: profit >= 0 ? "#4ADE80" : "#F87171" }}>{formatCurrency(profit)}</div>
                    </div>
                  </div>
                  <div className="h-1.5 bg-surface-2 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: "#059669" }} />
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}
