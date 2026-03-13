import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME } from "@/shared/const";
import { verifySession } from "@/server/_core/auth";
import { getUserByOpenId } from "@/server/db";

export async function GET(req: NextRequest) {
  const token =
    req.cookies.get(COOKIE_NAME)?.value ??
    req.headers.get("authorization")?.replace("Bearer ", "");

  if (!token) return NextResponse.json({ user: null }, { status: 401 });

  const session = await verifySession(token);
  if (!session) return NextResponse.json({ user: null }, { status: 401 });

  const user = await getUserByOpenId(session.openId);
  if (!user) return NextResponse.json({ user: null }, { status: 401 });

  return NextResponse.json({ user: { id: user.id, openId: user.openId, name: user.name, email: user.email, role: user.role } });
}
