import 'dotenv/config';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { getRequestListener } from '@hono/node-server';
import { createApp } from './src/server/app';
import { createSqliteStore } from './src/server/db-sqlite';
import { defaultModel, getAiClient } from './src/server/gemini';
import { getEnv } from './src/server/env';

/**
 * Node entry point (local development and self-hosting).
 * The API itself lives in src/server/app.ts and is shared with the
 * Cloudflare Worker (src/worker.ts); this file only wires Node specifics:
 * the SQLite file store, Vite dev middleware, and static serving.
 */
async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Server-side storage is optional. Default on for the Node server (local dev
  // convenience); set BIOSOP_SERVER_STORAGE=off to run stateless.
  const store = process.env.BIOSOP_SERVER_STORAGE === 'off' ? null : createSqliteStore(process.env.BIOSOP_DB_PATH || './data/biosop.db');
  const api = createApp({ resolveStore: () => store });

  // Hono handles /api/* (including body parsing and SSE streaming).
  const apiListener = getRequestListener(api.fetch);
  app.use((req, res, next) => {
    if (req.url.startsWith('/api/')) return void apiListener(req, res);
    next();
  });

  // Vite Development / Production Middleware setup
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`BioSOP Server running on http://0.0.0.0:${PORT}`);
    console.log(`Gemini model: ${defaultModel()} (override with GEMINI_MODEL)`);
    if (getEnv('GEMINI_API_KEY')) {
      (async () => {
        try {
          const ai = getAiClient();
          const pager = await ai.models.list({ config: { pageSize: 100 } });
          const names: string[] = [];
          for await (const m of pager) names.push(String(m.name || '').replace(/^models\//, ''));
          if (names.length && !names.includes(defaultModel())) {
            console.warn(`[startup] WARNING: model "${defaultModel()}" is not available to this key. Available flash/pro models: ${names.filter((n) => /flash|pro/.test(n)).slice(0, 8).join(', ')}`);
          } else if (names.length) {
            console.log(`[startup] Model "${defaultModel()}" confirmed available.`);
          }
        } catch (e) {
          console.warn('[startup] Could not list Gemini models:', e instanceof Error ? e.message : e);
        }
      })();
    } else {
      console.warn('[startup] GEMINI_API_KEY is not set — AI endpoints will return 503.');
    }
  });
}

startServer();
