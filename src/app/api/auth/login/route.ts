import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { scrypt, timingSafeEqual } from "crypto";
import { users } from "@/drizzle/schema";
import { getDb } from "@/server/db";
import { signSession } from "@/server/_core/auth";
import { COOKIE_NAME, ONE_YEAR_MS } from "@/shared/const";
import { ENV } from "@/server/_core/env";

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, (err, derived) => {
      if (err) reject(err);
      else {
        try { resolve(timingSafeEqual(derived, Buffer.from(hash, "hex"))); }
        catch { resolve(false); }
      }
    });
  });
}

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  if (!email || !password) return NextResponse.json({ error: "Email e senha são obrigatórios." }, { status: 400 });

  const db = await getDb();
  if (!db) return NextResponse.json({ error: "Banco de dados não disponível." }, { status: 500 });

  const normalizedEmail = email.toLowerCase().trim();
  const [user] = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);
  if (!user || !user.passwordHash) return NextResponse.json({ error: "Email ou senha incorretos." }, { status: 401 });

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return NextResponse.json({ error: "Email ou senha incorretos." }, { status: 401 });

  await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.openId, user.openId));

  const token = await signSession({ openId: user.openId, appId: ENV.appId, name: user.name ?? "" }, { expiresInMs: ONE_YEAR_MS });

  const res = NextResponse.json({ token, user: { id: user.id, openId: user.openId, name: user.name, email: user.email } });
  res.cookies.set(COOKIE_NAME, token, { httpOnly: true, secure: ENV.isProduction, maxAge: ONE_YEAR_MS / 1000, sameSite: "lax", path: "/" });
  return res;
}
