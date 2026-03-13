import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import { createConnectToken, getAccounts, getTransactions } from "./pluggy";
import { bulkCreateExpenses } from "./expense-db";

type ExpenseCategory = "transporte" | "alimentacao" | "moradia" | "saude" | "educacao" | "lazer" | "outro";

const CATEGORY_MAP: Record<string, ExpenseCategory> = {
  "food and groceries": "alimentacao", food: "alimentacao", groceries: "alimentacao",
  restaurants: "alimentacao", "eating out": "alimentacao",
  transportation: "transporte", transport: "transporte", travel: "transporte", gas: "transporte",
  health: "saude", "health and fitness": "saude", pharmacy: "saude",
  education: "educacao",
  entertainment: "lazer", recreation: "lazer", streaming: "lazer",
  housing: "moradia", rent: "moradia", utilities: "moradia", home: "moradia",
  "alimentação": "alimentacao", supermercado: "alimentacao", restaurante: "alimentacao",
  transporte: "transporte", "saúde": "saude", "educação": "educacao", lazer: "lazer", moradia: "moradia",
};

function mapCategory(cat: string | null): ExpenseCategory {
  if (!cat) return "outro";
  const lower = cat.toLowerCase().trim();
  if (CATEGORY_MAP[lower]) return CATEGORY_MAP[lower];
  for (const [key, val] of Object.entries(CATEGORY_MAP)) {
    if (lower.includes(key)) return val;
  }
  return "outro";
}

export const pluggyRouter = router({
  createConnectToken: protectedProcedure
    .input(z.object({ itemId: z.string().optional() }))
    .mutation(async ({ input }) => {
      const accessToken = await createConnectToken(input.itemId);
      return { accessToken };
    }),

  syncAndSave: protectedProcedure
    .input(z.object({ itemId: z.string(), connectorName: z.string(), from: z.string(), to: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const accounts = await getAccounts(input.itemId);
      const toInsert: Parameters<typeof bulkCreateExpenses>[0] = [];

      for (const account of accounts) {
        const transactions = await getTransactions(account.id, input.from, input.to);
        for (const t of transactions) {
          if (t.type !== "DEBIT" || t.amount <= 0) continue;
          const date = new Date(t.date);
          const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
          toInsert.push({
            userId: ctx.user.id,
            clientId: `pluggy_${t.id}`,
            name: t.merchant?.name || t.description,
            category: mapCategory(t.category),
            value: Math.abs(t.amount).toFixed(2),
            date: t.date.split("T")[0],
            month,
            quantity: null,
            paid: false,
            source: "pluggy",
          });
        }
      }

      await bulkCreateExpenses(toInsert);
      return { added: toInsert.length, connectorName: input.connectorName };
    }),
});
