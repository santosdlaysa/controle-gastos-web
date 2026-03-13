import { router, protectedProcedure } from "./_core/trpc";
import { getMonthlyHistory } from "./expense-db";

export const historyRouter = router({
  getMonthly: protectedProcedure.query(async ({ ctx }) => getMonthlyHistory(ctx.user.id)),
});
