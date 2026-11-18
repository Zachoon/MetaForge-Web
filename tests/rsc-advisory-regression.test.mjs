// Regression guard for GHSA-xqc2-xf4c-x3h3 (critical RSC remote code execution)
// and GHSA-wx67-qw84-cm4g (server-function DoS). Both live in
// react-server-dom-webpack, which the production Worker bundles from
// node_modules. These tests fail if a dependency change, a lockfile
// regeneration or a bundler fallback puts a vulnerable copy back into the
// Worker. They prove which code ships; they do not prove the app is secure.
//
// Requires a build first (`npm run build`), like the other dist/ tests.
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readJson = (relative) => JSON.parse(readFileSync(new URL(relative, root), "utf8"));
const REACT_PACKAGES = ["react", "react-dom", "react-server-dom-webpack"];

// First patched release on each 19.x line, per the advisory.
const FIRST_PATCHED = { 0: 9, 1: 10, 2: 9, 3: 1 };
function isPatched(version) {
  const match = /^19\.(\d+)\.(\d+)$/.exec(version);
  if (!match) return false;
  const minor = Number(match[1]);
  const patch = Number(match[2]);
  if (minor in FIRST_PATCHED) return patch >= FIRST_PATCHED[minor];
  return minor > 3;
}

test("isPatched matches the advisory's affected ranges", () => {
  for (const v of ["19.0.8", "19.1.9", "19.2.6", "19.2.8", "19.3.0"]) assert.equal(isPatched(v), false, v);
  for (const v of ["19.0.9", "19.1.10", "19.2.9", "19.3.1", "19.4.0"]) assert.equal(isPatched(v), true, v);
  assert.equal(isPatched("^19.2.9"), false, "ranges are not pins");
});

test("React packages are pinned exactly to a patched release and move together", () => {
  const pkg = readJson("package.json");
  const pins = REACT_PACKAGES.map((name) => pkg.dependencies?.[name] ?? pkg.devDependencies?.[name]);
  for (const [i, pin] of pins.entries()) {
    assert.ok(isPatched(pin), `${REACT_PACKAGES[i]} must be an exact patched pin, got ${pin}`);
  }
  assert.equal(new Set(pins).size, 1, `react, react-dom and react-server-dom-webpack must share one version: ${pins}`);
});

test("installed React packages match the pins (lockfile and node_modules agree)", () => {
  const pkg = readJson("package.json");
  const lock = readJson("package-lock.json");
  for (const name of REACT_PACKAGES) {
    const pin = pkg.dependencies?.[name] ?? pkg.devDependencies?.[name];
    assert.equal(lock.packages[`node_modules/${name}`].version, pin, `package-lock ${name}`);
    assert.equal(readJson(`node_modules/${name}/package.json`).version, pin, `installed ${name}`);
  }
});

test("pnpm-lock.yaml resolves no vulnerable React server package", () => {
  const pnpmLock = readFileSync(new URL("pnpm-lock.yaml", root), "utf8");
  const resolved = [...pnpmLock.matchAll(/(?<![\w/@-])(react|react-dom|react-server-dom-webpack)@(19\.\d+\.\d+)/g)];
  assert.ok(resolved.length > 0, "expected React entries in pnpm-lock.yaml");
  for (const [, name, version] of resolved) assert.ok(isPatched(version), `pnpm-lock resolves ${name}@${version}`);
});

test("built Worker bundles the installed, patched react-server-dom-webpack", () => {
  const worker = readFileSync(new URL("dist/server/index.js", root), "utf8");
  assert.match(
    worker,
    /^\/\/#region node_modules\/react-server-dom-webpack\/cjs\/react-server-dom-webpack-server\.edge\.production\.js$/m,
    "server Flight runtime must come from node_modules/react-server-dom-webpack",
  );
  // @vitejs/plugin-rsc ships its own vendored copy (19.2.6 in 0.5.26) and
  // falls back to it when react-server-dom-webpack is not detected.
  assert.doesNotMatch(worker, /^\/\/#region .*plugin-rsc\/dist\/vendor\/react-server-dom/m, "vendored fallback copy must not ship");
  // Code introduced by the 19.2.9 fix for typed-array transport.
  assert.ok(worker.includes("Cannot transport a detached buffer"), "patched serializer guard missing from Worker");
});

test("client framework chunk reports only patched React versions", () => {
  const assetsDir = new URL("dist/client/assets/", root);
  const framework = readdirSync(assetsDir).filter((name) => /^framework-.*\.js$/.test(name));
  assert.equal(framework.length, 1, `expected one framework chunk, found ${framework}`);
  const source = readFileSync(new URL(framework[0], assetsDir), "utf8");
  const versions = new Set([...source.matchAll(/[`"'](19\.\d+\.\d+)[`"']/g)].map((m) => m[1]));
  assert.ok(versions.size > 0, "expected a React version string in the framework chunk");
  for (const v of versions) assert.ok(isPatched(v), `framework chunk contains React ${v}`);
});

// Behaviour of the built Worker on server-action-shaped requests. Local only:
// in-memory env, example.test host, nothing leaves the process.
async function loadWorker() {
  const url = new URL("dist/server/index.js", root);
  url.searchParams.set("rsc-advisory-test", `${process.pid}-${Date.now()}`);
  return (await import(url.href)).default;
}

const env = {
  ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
  METAFORGE_BOOTSTRAP_LOCK: "unlocked",
};
const ctx = { waitUntil() {}, passThroughOnException() {} };

async function quietly(fn) {
  const { error, warn } = console;
  console.error = () => {};
  console.warn = () => {};
  try {
    return await fn();
  } finally {
    console.error = error;
    console.warn = warn;
  }
}

test("app pages still render through the patched React", async () => {
  const worker = await loadWorker();
  const res = await worker.fetch(new Request("https://example.test/"), env, ctx);
  assert.equal(res.status, 200);
  assert.match(res.headers.get("content-type") ?? "", /text\/html/);
  assert.match(await res.text(), /^<!DOCTYPE html>/i);
});

test("unknown server-action ids never succeed and never leak internals", async () => {
  const worker = await loadWorker();
  for (const header of ["x-rsc-action", "next-action"]) {
    const res = await quietly(() =>
      worker.fetch(
        new Request("https://example.test/", {
          method: "POST",
          headers: { [header]: "0000000000000000#doesNotExist", "content-type": "text/plain" },
          body: "[]",
        }),
        env,
        ctx,
      ),
    );
    assert.ok(res.status >= 400, `${header}: expected a failure status, got ${res.status}`);
    const body = await res.text();
    assert.doesNotMatch(body, /\n\s+at |node_modules|server reference/i, `${header}: response leaked internals`);
  }
});

test("progressive (form) action payloads with unknown references are rejected", async () => {
  const worker = await loadWorker();
  const form = new FormData();
  form.append("$ACTION_REF_1", "");
  form.append("$ACTION_1:0", '{"id":"0000000000000000#doesNotExist","bound":"$@1"}');
  form.append("$ACTION_1:1", "[]");
  const res = await quietly(() =>
    worker.fetch(new Request("https://example.test/", { method: "POST", body: form }), env, ctx),
  );
  assert.ok(res.status >= 400, `expected a failure status, got ${res.status}`);
  assert.doesNotMatch(await res.text(), /\n\s+at |node_modules/i);
});

test("cross-origin form posts are refused before any action decoding", async () => {
  const worker = await loadWorker();
  const form = new FormData();
  form.append("$ACTION_ID_0000000000000000", "");
  const res = await quietly(() =>
    worker.fetch(
      new Request("https://example.test/", { method: "POST", headers: { origin: "https://attacker.example" }, body: form }),
      env,
      ctx,
    ),
  );
  assert.equal(res.status, 403);
});
