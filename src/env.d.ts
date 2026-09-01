/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

// Minimal type for the Workers runtime module. @astrojs/cloudflare provides
// the real binding at runtime; we only read GRAYCUP_ORDERS_DB (a D1 database).
declare module 'cloudflare:workers' {
  export const env: Record<string, unknown> | undefined;
}
