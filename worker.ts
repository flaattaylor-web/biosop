/**
 * Cloudflare Workers entry point.
 *
 *   /api/*          → the Hono API (src/server/app.ts) backed by D1
 *   everything else → static assets built by Vite (dist), SPA fallback
 *
 * Config lives in wrangler.jsonc. Secrets (GEMINI_API_KEY etc.) are Worker
 * secrets and reach the code through setRuntimeEnv → getEnv.
 */
import type { Context } from 'hono';
import { createApp, AppEnv } from './server/app';
import { createD1Store, ProtocolStore, D1Like } from './server/db';
import { setRuntimeEnv } from './server/env';

interface WorkerEnv {
  DB?: D1Like;
  ASSETS: { fetch(request: Request): Promise<Response> };
  [key: string]: unknown;
}

// One store per isolate; D1 binding objects are stable across requests.
const stores = new WeakMap<object, ProtocolStore>();
function storeFor(db: D1Like): ProtocolStore {
  let s = stores.get(db as object);
  if (!s) { s = createD1Store(db); stores.set(db as object, s); }
  return s;
}

const api = createApp({
  // Server-side storage is OPTIONAL. Without a D1 binding the app is stateless
  // and every user's protocols stay in their own browser (the default mode).
  resolveStore: (c: Context<AppEnv>) => {
    const env = c.env as unknown as WorkerEnv;
    return env?.DB ? storeFor(env.DB) : null;
  },
});

export default {
  async fetch(request: Request, env: WorkerEnv, ctx: unknown): Promise<Response> {
    setRuntimeEnv({ ...env, BIOSOP_RUNTIME: 'cloudflare-workers' });
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) {
      return api.fetch(request, env, ctx as never);
    }
    return env.ASSETS.fetch(request);
  },
};
