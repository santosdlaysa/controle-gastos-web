import { router, publicProcedure } from "./_core/trpc";
import { expenseRouter } from "./expense-router";
import { incomeRouter } from "./income-router";
import { budgetRouter } from "./budget-router";
import { historyRouter } from "./history-router";
import { uberEarningsRouter } from "./uber-earnings-router";

export const appRouter = router({
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
  }),
  expense: expenseRouter,
  income: incomeRouter,
  budget: budgetRouter,
  history: historyRouter,
  uberEarnings: uberEarningsRouter,
});

export type AppRouter = typeof appRouter;
