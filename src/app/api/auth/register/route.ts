import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { randomBytes, scrypt } from "crypto";
import { users } from "@/drizzle/schema";
import { getDb } from "@/server/db";
import { signSession } from "@/server/_core/auth";
import { COOKIE_NAME, ONE_YEAR_MS } from "@/shared/const";
import { ENV } from "@/server/_core/env";

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, (err, derived) => {
      if (err) reject(err);
      else resolve(`${salt}:${derived.toString("hex")}`);
    });
  });
}

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  if (!email || !password) return NextResponse.json({ error: "Email e senha são obrigatórios." }, { status: 400 });
  if (typeof password !== "string" || password.length < 8) return NextResponse.json({ error: "Senha deve ter no mínimo 8 caracteres." }, { status: 400 });

  const db = await getDb();
  if (!db) return NextResponse.json({ error: "Banco de dados não disponível." }, { status: 500 });

  const normalizedEmail = email.toLowerCase().trim();
  const openId = `email:${normalizedEmail}`;

  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, normalizedEmail)).limit(1);
  if (existing.length > 0) return NextResponse.json({ error: "Este email já está cadastrado." }, { status: 409 });

  const passwordHash = await hashPassword(password);
  await db.insert(users).values({ openId, email: normalizedEmail, passwordHash, loginMethod: "email", lastSignedIn: new Date() });

  const [user] = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  const token = await signSession({ openId, appId: ENV.appId, name: user.name ?? "" }, { expiresInMs: ONE_YEAR_MS });

  const res = NextResponse.json({ token, user: { id: user.id, openId: user.openId, name: user.name, email: user.email } }, { status: 201 });
  res.cookies.set(COOKIE_NAME, token, { httpOnly: true, secure: ENV.isProduction, maxAge: ONE_YEAR_MS / 1000, sameSite: "lax", path: "/" });
  return res;
}
