"use client";

import { trpc } from "@/lib/trpc";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatMonthLabel(monthStr: string) {
  const [year, month] = monthStr.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

export default function HistoricoPage() {
  const { data, isLoading } = trpc.history.getMonthly.useQuery();

  const sorted = [...(data ?? [])].sort((a, b) => b.month.localeCompare(a.month));
  const maxVal = Math.max(...sorted.map((r) => parseFloat(r.totalExpenses ?? "0")), 1);

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-xl font-bold text-foreground mb-6">Histórico Mensal</h1>

      {isLoading ? (
        <div className="text-muted text-center py-12">Carregando...</div>
      ) : sorted.length === 0 ? (
        <div className="text-muted text-center py-12">Nenhum histórico disponível</div>
      ) : (
        <div className="space-y-3">
          {sorted.map((row) => {
            const val = parseFloat(row.totalExpenses ?? "0");
            const pct = Math.round((val / maxVal) * 100);
            return (
              <div key={row.month} className="bg-surface rounded-xl p-4 border border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground capitalize">{formatMonthLabel(row.month)}</span>
                  <span className="text-sm font-bold text-foreground">{formatCurrency(val)}</span>
                </div>
                <div className="h-2 bg-surface-2 rounded-full overflow-hidden">
                  <div className="h-full bg-brand rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
