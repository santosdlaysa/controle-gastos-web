import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import { updateUserName, deleteUserAccount } from "./db";

export const profileRouter = router({
  updateName: protectedProcedure
    .input(z.object({ name: z.string().min(1).max(100) }))
    .mutation(async ({ ctx, input }) => {
      await updateUserName(ctx.user.id, input.name);
    }),

  deleteAccount: protectedProcedure
    .mutation(async ({ ctx }) => {
      await deleteUserAccount(ctx.user.id);
    }),
});
