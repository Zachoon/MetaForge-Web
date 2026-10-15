// The signed anonymous guest session shared by guest-generate
// (guest-forge.ts) and the guided build (guided-identity.ts): an HMAC-signed
// random id in the mf_guest cookie, plus the Turnstile check that gates
// minting one. Moved here unchanged from guest-forge.ts so both can use it.
export const GUEST_COOKIE = "mf_guest";
const COOKIE = GUEST_COOKIE;
const enc = new TextEncoder();

function bytesToHex(bytes: ArrayBuffer): string {
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function hmac(secret: string, value: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return bytesToHex(await crypto.subtle.sign("HMAC", key, enc.encode(value)));
}

/** Constant-time comparison for hex signatures. */
export function safeEqual(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function cookieValue(request: Request): string | null {
  const raw = request.headers.get("cookie") || "";
  const match = raw.match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export async function sessionFromRequest(request: Request, secret: string): Promise<{ id: string; value: string }> {
  const existing = cookieValue(request);
  if (existing) {
    const [id, signature] = existing.split(".");
    if (id && signature && safeEqual(signature, await hmac(secret, id))) return { id, value: existing };
  }
  const id = crypto.randomUUID();
  return { id, value: `${id}.${await hmac(secret, id)}` };
}

export async function validateTurnstile(request: Request, secret: string, token: unknown): Promise<boolean> {
  if (typeof token !== "string" || token.length < 10 || token.length > 2048) return false;
  const form = new FormData();
  form.set("secret", secret);
  form.set("response", token);
  const remoteIp = request.headers.get("CF-Connecting-IP");
  if (remoteIp) form.set("remoteip", remoteIp);
  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: form });
  if (!response.ok) return false;
  const result = (await response.json()) as { success?: boolean };
  return result.success === true;
}
