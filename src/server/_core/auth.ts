import { SignJWT, jwtVerify } from "jose";
import { ENV } from "./env";
import { ONE_YEAR_MS } from "@/shared/const";

export type SessionPayload = {
  openId: string;
  appId: string;
  name: string;
};

function getSecret() {
  return new TextEncoder().encode(ENV.cookieSecret);
}

export async function signSession(
  payload: SessionPayload,
  options: { expiresInMs?: number } = {},
): Promise<string> {
  const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
  const expirationSeconds = Math.floor((Date.now() + expiresInMs) / 1000);
  return new SignJWT({ openId: payload.openId, appId: payload.appId, name: payload.name })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(expirationSeconds)
    .sign(getSecret());
}

export async function verifySession(
  token: string | undefined | null,
): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret(), { algorithms: ["HS256"] });
    const { openId, appId, name } = payload as Record<string, unknown>;
    if (typeof openId !== "string" || typeof appId !== "string") return null;
    return { openId, appId, name: typeof name === "string" ? name : "" };
  } catch {
    return null;
  }
}
