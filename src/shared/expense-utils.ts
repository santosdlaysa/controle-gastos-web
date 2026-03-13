export function parseQuantity(quantity: string | null | undefined): {
  installmentCurrent: number;
  installmentTotal: number;
} | null {
  if (!quantity) return null;
  const match = quantity.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (!match) return null;
  const current = parseInt(match[1], 10);
  const total = parseInt(match[2], 10);
  if (isNaN(current) || isNaN(total)) return null;
  return { installmentCurrent: current, installmentTotal: total };
}

export function getNextMonth(monthStr: string): string {
  const [year, month] = monthStr.split("-").map((v) => parseInt(v, 10));
  const date = new Date(year, month - 1 + 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function formatMonth(monthStr: string): string {
  const [year, month] = monthStr.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

export function getPrevMonth(monthStr: string): string {
  const [year, month] = monthStr.split("-").map((v) => parseInt(v, 10));
  const date = new Date(year, month - 2);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}
