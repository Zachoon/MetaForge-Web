// Cryptographic verification of the caller's Cloudflare Access identity.
//
// Cloudflare Access sits in front of this entire Worker and, for a real
// authenticated session, forwards two things: the `CF-Access-Jwt-Assertion`
// header (a signed JWT it already validated at the edge) and a convenience
// `Cf-Access-Authenticated-User-Email` header derived from that same JWT.
// Trusting the email header alone means trusting that nothing between the
// edge and this Worker can forge it — true today, but not something
// account identity should depend on silently. This module verifies the
// JWT itself (signature via Access's published JWKS, issuer, audience,
// expiration) and derives identity only from its verified `email` claim.
//
// Team domain and Application Audience (AUD) tag are not secrets — they're
// the public parameters any verifier needs, the same way an OAuth client_id
// or issuer URL is public. They're read from env vars (ACCESS_TEAM_DOMAIN,
// ACCESS_AUD) rather than hardcoded so the same code works if the Access
// application is ever recreated with a new AUD. ACCESS_AUD may contain a
// comma-separated list during a safe hostname/application transition; jose
// still requires the token to match at least one explicitly configured value.
import { createRemoteJWKSet, jwtVerify } from "jose";

export interface AccessEnv {
  ACCESS_TEAM_DOMAIN?: string;
  ACCESS_AUD?: string;
  // Local-development-only escape hatch. Set exclusively via a git-ignored
  // .dev.vars file, which `wrangler deploy` never uploads — there is no
  // path for this var to exist in the deployed Worker's env unless someone
  // manually adds it to wrangler.jsonc or `wrangler secret put`s it, which
  // this codebase's convention (and this comment) explicitly says not to
  // do. Even then, activating it also requires the caller to send a
  // distinct dev-only header — flipping the var alone does nothing.
  ALLOW_DEV_AUTH_BYPASS?: string;
}

export interface VerifiedIdentity {
  email: string;
}

// Module-level JWKS resolver: jose caches keys internally and only
// refetches when it sees a `kid` it doesn't recognize (or its cache
// expires), so this does not mean "fetch Access's certs on every request."
// Keyed by team domain since createRemoteJWKSet binds to one JWKS URL.
const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

function jwksFor(teamDomain: string) {
  let jwks = jwksCache.get(teamDomain);
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(`https://${teamDomain}/cdn-cgi/access/certs`));
    jwksCache.set(teamDomain, jwks);
  }
  return jwks;
}

function normalizedEmail(value: unknown): string | null {
  const email = typeof value === "string" ? value.trim().toLowerCase() : "";
  return email && email.includes("@") ? email : null;
}

async function devBypassIdentity(request: Request, env: AccessEnv): Promise<VerifiedIdentity | null> {
  if (env.ALLOW_DEV_AUTH_BYPASS !== "true") return null;
  // Fail closed whenever production Access verification is configured —
  // the bypass must never be able to substitute for real verification
  // even if this flag were ever set alongside it (e.g. an accidental
  // wrangler.jsonc edit). Flipping ALLOW_DEV_AUTH_BYPASS alone is
  // therefore not sufficient on its own; the deployed environment's
  // shape (no ACCESS_TEAM_DOMAIN/ACCESS_AUD) has to also look like a
  // real local-dev environment, not a production one.
  if (env.ACCESS_TEAM_DOMAIN || env.ACCESS_AUD) return null;
  const email = normalizedEmail(request.headers.get("x-dev-user-email"));
  return email ? { email } : null;
}

export async function verifyAccessIdentity(request: Request, env: AccessEnv): Promise<VerifiedIdentity | null> {
  const token = request.headers.get("Cf-Access-Jwt-Assertion");
  if (!token) return devBypassIdentity(request, env);

  const teamDomain = env.ACCESS_TEAM_DOMAIN;
  const audiences = (env.ACCESS_AUD || "").split(",").map((value) => value.trim()).filter(Boolean);
  if (!teamDomain || audiences.length === 0) {
    // Misconfiguration, not a caller error — fail closed rather than
    // silently skipping verification.
    console.error("Access verification is not configured (ACCESS_TEAM_DOMAIN/ACCESS_AUD missing)");
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, jwksFor(teamDomain), {
      issuer: `https://${teamDomain}`,
      audience: audiences,
    });
    return normalizedEmail(payload.email) ? { email: normalizedEmail(payload.email)! } : null;
  } catch {
    // Any verification failure (bad signature, wrong issuer/audience,
    // expired/not-yet-valid token, malformed JWT) is treated identically —
    // never distinguish the reason in the response, only in server logs.
    return null;
  }
}
