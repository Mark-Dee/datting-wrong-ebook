/**
 * Long-running server for local development and self-hosting (`npm run dev` / `npm start`).
 * On Vercel the same API runs as a serverless function via api/index.js (see server/vercelEntry.ts).
 */
import express from 'express';
import path from 'node:path';
import { createApp } from './server/app.ts';
import { getFirebaseRuntime } from './server/firebaseAdmin.ts';
import { firebaseTokenVerifier } from './server/auth.ts';

async function startServer() {
  const rt = getFirebaseRuntime();
  const app = createApp({ verifyIdToken: firebaseTokenVerifier(rt.auth) });
  const PORT = Number(process.env.PORT) || 3000;

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Dating Wrong running on http://0.0.0.0:${PORT}  (storage: ${rt.mode})`);
  });
}

startServer();
