import {
  createHash,
  createHmac,
  timingSafeEqual,
} from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "ccs_admin_session";
const SESSION_TTL_SECONDS = 8 * 60 * 60;

function getPassword(): string | undefined {
  return process.env.ADMIN_PASSWORD?.trim() || undefined;
}

function getSecret(): string | undefined {
  return process.env.ADMIN_SESSION_SECRET?.trim() || undefined;
}

function digest(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}

function isPlaceholder(value: string): boolean {
  return /^(replace-with|change-me|example|your-)/i.test(value);
}

export function isAdminConfigured(): boolean {
  const password = getPassword();
  const secret = getSecret();
  return Boolean(
    password &&
      password.length >= 12 &&
      !isPlaceholder(password) &&
      secret &&
      secret.length >= 32 &&
      !isPlaceholder(secret),
  );
}

function sessionVersion(): string {
  const password = getPassword();
  const secret = getSecret();
  if (!password || !secret) return "";
  return createHash("sha256")
    .update(`${password}\0${secret}`, "utf8")
    .digest("base64url")
    .slice(0, 32);
}

export function verifyAdminPassword(candidate: string): boolean {
  const password = getPassword();
  if (!password || !isAdminConfigured()) return false;
  return timingSafeEqual(digest(candidate), digest(password));
}

function sign(payload: string): string {
  const secret = getSecret();
  if (!secret) throw new Error("ADMIN_SESSION_SECRET is not configured");
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

export function createAdminSessionToken(now = Date.now()): string {
  const issuedAt = Math.floor(now / 1000);
  const version = sessionVersion();
  const payload = `v2.${issuedAt}.${version}`;
  return `${payload}.${sign(payload)}`;
}

export function verifyAdminSessionToken(
  token: string | undefined,
  now = Date.now(),
): boolean {
  if (!token || !isAdminConfigured()) return false;
  const parts = token.split(".");
  if (parts.length !== 4 || parts[0] !== "v2") return false;

  const issuedAt = Number(parts[1]);
  if (!Number.isSafeInteger(issuedAt)) return false;
  const age = Math.floor(now / 1000) - issuedAt;
  if (age < -60 || age > SESSION_TTL_SECONDS) return false;
  if (!safeEqual(parts[2], sessionVersion())) return false;

  return safeEqual(parts[3], sign(`v2.${issuedAt}.${parts[2]}`));
}

export async function isAdmin(): Promise<boolean> {
  if (!isAdminConfigured()) return false;
  const cookieStore = await cookies();
  return verifyAdminSessionToken(cookieStore.get(COOKIE_NAME)?.value);
}

export async function setAdminSession(): Promise<void> {
  if (!isAdminConfigured()) {
    throw new Error("Admin authentication is not configured");
  }

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, createAdminSessionToken(), {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
