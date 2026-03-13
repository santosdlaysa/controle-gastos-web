import type { NextRequest } from "next/server";
import type { User } from "@/drizzle/schema";
import { verifySession } from "./auth";
import { getUserByOpenId } from "../db";
import { COOKIE_NAME } from "@/shared/const";

export type TrpcContext = {
  user: User | null;
};

export async function createContext(req: NextRequest): Promise<TrpcContext> {
  const token =
    req.cookies.get(COOKIE_NAME)?.value ??
    req.headers.get("authorization")?.replace("Bearer ", "");

  if (!token) return { user: null };

  const session = await verifySession(token);
  if (!session) return { user: null };

  const user = await getUserByOpenId(session.openId);
  return { user: user ?? null };
}
