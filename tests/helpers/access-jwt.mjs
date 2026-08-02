// Shared test helper for signing real Cloudflare-Access-shaped JWTs and
// mocking the JWKS endpoint worker/access-identity.ts fetches to verify
// them. Used by access-identity.test.mjs (the dedicated crypto-path
// coverage); other test files use the local dev bypass instead, since
// they exercise unrelated logic (see those files' own comments).
import { SignJWT, exportJWK, generateKeyPair } from "jose";

export const TEST_TEAM_DOMAIN = "test-team.cloudflareaccess.com";
export const TEST_AUD = "test-application-audience-tag";
const TEST_KID = "test-key-1";
const JWKS_URL = `https://${TEST_TEAM_DOMAIN}/cdn-cgi/access/certs`;

let keyPairPromise = null;
function keyPair() {
  if (!keyPairPromise) keyPairPromise = generateKeyPair("RS256");
  return keyPairPromise;
}

// A second, unrelated keypair — used to sign a JWT whose signature will
// not verify against the real (mocked) JWKS, i.e. a forged/tampered token.
let wrongKeyPairPromise = null;
function wrongKeyPair() {
  if (!wrongKeyPairPromise) wrongKeyPairPromise = generateKeyPair("RS256");
  return wrongKeyPairPromise;
}

// Patches globalThis.fetch to answer the JWKS URL with the test public
// key and pass every other request through untouched. Returns a restore
// function — call it in a `finally` so a failed assertion never leaves
// global fetch patched for later tests.
export async function mockAccessJwks() {
  const { publicKey } = await keyPair();
  const jwk = await exportJWK(publicKey);
  jwk.kid = TEST_KID;
  jwk.alg = "RS256";
  jwk.use = "sig";
  const original = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input?.url;
    if (url === JWKS_URL) {
      return new Response(JSON.stringify({ keys: [jwk] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    return original(input, init);
  };
  return () => {
    globalThis.fetch = original;
  };
}

// Signs a real, structurally valid Access-shaped JWT. Every claim is
// overridable so tests can build the specific invalid shapes (wrong
// audience, wrong issuer, expired) they need to verify are rejected.
export async function signAccessJwt({
  email = "one@example.com",
  audience = TEST_AUD,
  issuer = `https://${TEST_TEAM_DOMAIN}`,
  expiresInSeconds = 3600,
  issuedAtSecondsAgo = 0,
  useWrongKey = false,
} = {}) {
  const { privateKey } = useWrongKey ? await wrongKeyPair() : await keyPair();
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ email })
    .setProtectedHeader({ alg: "RS256", kid: TEST_KID })
    .setIssuedAt(now - issuedAtSecondsAgo)
    .setIssuer(issuer)
    .setAudience(audience)
    .setExpirationTime(now - issuedAtSecondsAgo + expiresInSeconds)
    .sign(privateKey);
}

export function accessJwtHeaders(token, extra = {}) {
  return { "Cf-Access-Jwt-Assertion": token, ...extra };
}
