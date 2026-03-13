import { router, protectedProcedure } from "./_core/trpc";
import { getBanks } from "./expense-db";

export const bankRouter = router({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    return getBanks(ctx.user.id);
  }),
});
