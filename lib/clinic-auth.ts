import { env } from "cloudflare:workers";
import { cookies } from "next/headers";
import { getD1 } from "@/db";

type AuthResult =
  | { ok: true; email: string; displayName: string }
  | { ok: false; status: 401 | 503; message: string };

export const CLINIC_SESSION_COOKIE = "simple_vet_admin";
const SESSION_SECONDS = 60 * 60 * 12;

function runtimeValue(key: string) {
  const runtimeEnv = env as unknown as Record<string, unknown>;
  const value = runtimeEnv[key];
  return typeof value === "string" ? value : "";
}

function toHex(input: ArrayBuffer) {
  return Array.from(new Uint8Array(input), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(left: string, right: string) {
  const length = Math.max(left.length, right.length);
  let mismatch = left.length ^ right.length;
  for (let index = 0; index < length; index += 1) {
    mismatch |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }
  return mismatch === 0;
}

async function sha256(value: string) {
  return toHex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
}

async function passwordHash(password: string, salt: string) {
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: new TextEncoder().encode(salt), iterations: 120_000 }, material, 256);
  return toHex(bits);
}

async function storedPassword() {
  try {
    const rows = await getD1().prepare("SELECT key, value FROM clinic_settings WHERE key IN ('adminPasswordHash','adminPasswordSalt')").all<{ key: string; value: string }>();
    const values = Object.fromEntries((rows.results ?? []).map((row) => [row.key, row.value]));
    return { hash: values.adminPasswordHash || "", salt: values.adminPasswordSalt || "" };
  } catch { return { hash: "", salt: "" }; }
}

async function signature(payload: string) {
  const secret = runtimeValue("CLINIC_SESSION_SECRET");
  if (!secret) return "";
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return toHex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload)));
}

export async function verifyClinicPassword(password: string) {
  const stored = await storedPassword();
  if (stored.hash && stored.salt) return constantTimeEqual(await passwordHash(password, stored.salt), stored.hash);
  const configured = runtimeValue("CLINIC_ADMIN_PASSWORD");
  if (!configured) return false;
  const [givenHash, configuredHash] = await Promise.all([sha256(password), sha256(configured)]);
  return constantTimeEqual(givenHash, configuredHash);
}

export async function changeClinicPassword(currentPassword: string, newPassword: string) {
  if (!(await verifyClinicPassword(currentPassword))) throw new Error("كلمة السر الحالية غير صحيحة.");
  const salt = crypto.randomUUID();
  const hash = await passwordHash(newPassword, salt);
  const db = getD1();
  await db.batch([
    db.prepare("INSERT INTO clinic_settings (key,value,updated_at) VALUES ('adminPasswordSalt',?,CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=CURRENT_TIMESTAMP").bind(salt),
    db.prepare("INSERT INTO clinic_settings (key,value,updated_at) VALUES ('adminPasswordHash',?,CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=CURRENT_TIMESTAMP").bind(hash),
  ]);
}

export async function createClinicSessionToken() {
  const expiresAt = Date.now() + SESSION_SECONDS * 1000;
  const payload = String(expiresAt);
  const signed = await signature(payload);
  if (!signed) throw new Error("حماية لوحة الإدارة غير مهيأة.");
  return `${payload}.${signed}`;
}

export const clinicSessionCookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "strict" as const,
  path: "/",
  maxAge: SESSION_SECONDS,
};

export async function hasValidClinicSession() {
  const token = (await cookies()).get(CLINIC_SESSION_COOKIE)?.value ?? "";
  const [payload, suppliedSignature] = token.split(".");
  if (!payload || !suppliedSignature || !/^\d+$/.test(payload) || Number(payload) <= Date.now()) return false;
  const expectedSignature = await signature(payload);
  return Boolean(expectedSignature) && constantTimeEqual(suppliedSignature, expectedSignature);
}

export async function authorizeClinicRequest(): Promise<AuthResult> {
  const stored = await storedPassword();
  if ((!runtimeValue("CLINIC_ADMIN_PASSWORD") && !stored.hash) || !runtimeValue("CLINIC_SESSION_SECRET")) {
    return { ok: false, status: 503, message: "حماية لوحة العيادة غير مهيأة بعد." };
  }
  if (!(await hasValidClinicSession())) {
    return { ok: false, status: 401, message: "أدخل كلمة سر المدير للوصول إلى لوحة العيادة." };
  }
  return { ok: true, email: "admin@simplevet.local", displayName: "مدير Simple Vet Clinic" };
}
