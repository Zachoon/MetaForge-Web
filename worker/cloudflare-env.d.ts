// Minimal ambient declarations for the Cloudflare Workers APIs this project
// uses. The full @cloudflare/workers-types (or `wrangler types` runtime output)
// replaces DOM globals such as Response.json() for the whole program, which
// breaks the browser code under app/, so only the surface we call is declared.

interface D1Result<T = Record<string, unknown>> {
  results: T[];
  success: boolean;
  meta: Record<string, unknown> & { changes?: number; last_row_id?: number };
  error?: string;
}

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(column?: string): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  run<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  raw<T = unknown[]>(options?: { columnNames?: boolean }): Promise<T[]>;
}

interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = Record<string, unknown>>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
  exec(query: string): Promise<{ count: number; duration: number }>;
}

interface Fetcher {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

interface ScheduledController {
  readonly scheduledTime: number;
  readonly cron: string;
  noRetry(): void;
}

interface CacheStorage {
  readonly default: Cache;
}

declare module "cloudflare:workers" {
  export const env: { DB?: D1Database } & Record<string, unknown>;
}
