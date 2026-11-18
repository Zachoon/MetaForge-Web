# MF-SECURITY-002 — Advisory matrix

Sources:
- GitHub Advisory Database records via `gh api advisories/<id>` (2026-11-17)
- `npm audit --json` before and after the patch
- inspection of the built Worker bundle

No live exploit testing was done.

## 1. The advisory this hotfix targets

| Field | Value |
|---|---|
| ID | **GHSA-xqc2-xf4c-x3h3** / CVE-2026-126187 |
| Title | React: Unauthenticated Remote Code Execution in React Server Components |
| Severity | Critical. CVSS 4.0 9.5 (`AV:N/AC:L/AT:P/PR:N/UI:N/VC:H/VI:H/VA:H/SC:H/SI:H/SA:N`), CWE-502 |
| Published | 2026-11-10 |
| Affected | `react-server-dom-webpack`, `-parcel` and `-turbopack` 19.0.0–19.0.8, 19.1.0–19.1.9, **19.2.0–19.2.8**, 19.3.0 |
| Patched | 19.0.9, 19.1.10, **19.2.9**, 19.3.1 |
| Related upgrades | `react-server-dom-webpack@19.2.9` requires `react` and `react-dom` `^19.2.9` |
| Advisory's own scope note | Exploitation "only affects extremely rare cases where responses transport multiple typed arrays and an attacker-controlled value". The `AT:P` in the vector means attack preconditions are required. |

Also fixed by the same upgrade: **GHSA-wx67-qw84-cm4g** / CVE-2026-44907. High, CVSS 3.1 7.5:
denial of service in server functions via crafted requests. Affects 19.2.0–19.2.7; fixed in
19.2.8.

## 2. Applicability to MetaForge

| Question | Answer | Confidence |
|---|---|---|
| Is an affected version installed? | Yes, 19.2.6 (local `main` and production `main`) | High (lockfiles, `node_modules`) |
| Is the vulnerable code in the production bundle? | Yes. The Worker bundles `node_modules/react-server-dom-webpack` server and client edge builds. | High (bundle source regions) |
| Does production run it? | Very likely. The live client framework chunk reports React 19.2.6. The production commit `01f03a3` pins all three packages at 19.2.6, and `react-server-dom-webpack` cannot be 19.2.9 alongside React 19.2.6 (peer range). | High. The server bundle itself was not observed. |
| Can unauthenticated input reach the vulnerable decoder? | Yes. A `multipart/form-data` POST with no action header reaches `decodeAction` → the Flight reply decoder before any action lookup. A missing `Origin` header passes the CSRF check. | High (bundle code plus local in-process requests) |
| Is the specific RCE condition met? | **Probably not.** The app has no server functions. A search of `app/` found typed arrays only in client code (`forge-resume-brief.ts`, imported by client components). vinext internals were not audited. | Medium |
| Is MetaForge exploitable? | **Unknown, not shown.** No exploit was attempted, by design. | — |
| Does the 19.2.9 code change the shipped Worker? | Yes. The patched bundle contains the new detached-buffer guard (`Cannot transport a detached buffer`) and the new reply backing-store handling (`getBackingBlob`, `referencedEntries`); the baseline bundle has none of them. | High |

**Assessment:**
- A critical-rated vulnerable package ships in production.
- An unauthenticated path reaches its decoder.
- The advisory's stated precondition does not appear to hold for MetaForge's own code.
- Patching is warranted:
  - The upstream advice is "update immediately".
  - The change is three exact version pins.
  - The DoS advisory fixed alongside it plausibly applies to the reachable form-action path.

## 3. Remaining advisories after the patch (`npm audit`)

| | Critical | High | Moderate | Total |
|---|---|---|---|---|
| Before (19.2.6) | 2 | 28 | 14 | 44 |
| After (19.2.9) | **1** | 28 | 14 | 43 |
| After, `--omit=dev` view | 1 | 4 | 1 | 6 |

Only `react-server-dom-webpack` was resolved.

The remaining entries, by runtime exposure:

| Package | Severity | In the production Worker? | Exposure | Recommendation |
|---|---|---|---|---|
| `next` 16.2.6 | Critical (21 advisories, 5 critical: image optimizer, `use cache`, `next/og`, Windows hosting, App Router server actions, middleware) | **No.** No `node_modules/next/` code is bundled. vinext implements the runtime; `/_vinext/image` is vinext's passthrough; `next/og` is unused. | Not runtime-exposed as far as the bundle shows | Separate upgrade to `next@16.4.6` as hygiene (types and imports); not part of this hotfix |
| `postcss` (under `next`) | High | No | Build only | With `next` |
| `sharp` | High | No (no regions; Workers can't load native modules) | Build/dev only | With the Cloudflare toolchain upgrade |
| `nanoid`, `source-map-js`, `baseline-browser-mapping` | High / moderate | No server regions | Build or dev | Routine update |
| `vinext` 0.0.50 | High (via `@vercel/og`, `image-size`, `vite-plugin-commonjs`) | vinext's own code is bundled; the flagged dependencies are not | Indirect | Plan the major upgrade (1.4.x) separately: big framework jump, needs its own test cycle |
| `@cloudflare/vite-plugin`, `wrangler`, `miniflare`, `undici`, `ws` | High | No (toolchain) | Developer machine and CI | Toolchain upgrade separately |
| `vite`, ESLint chain, `brace-expansion`, `picomatch`, `js-yaml`, `zod`, … | High / moderate | No | Dev/build | Routine |

One gap: GitHub advisories were not checked for vinext's own source. `npm audit` lists vinext
only through its dependencies.
