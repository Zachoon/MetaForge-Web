// Vite's metaforge-build-id plugin replaces this placeholder with `git rev-parse HEAD`
// while bundling the Worker and the client. Source checks and `tsc` keep the
// placeholder, which is reported as "unknown" until a real bundle is produced.
const RAW_BUILD_ID = "%%METAFORGE_BUILD_ID%%";

export function metaforgeBuildId(): string {
  return /^[0-9a-f]{7,64}$/i.test(RAW_BUILD_ID) ? RAW_BUILD_ID.toLowerCase() : "unknown";
}
