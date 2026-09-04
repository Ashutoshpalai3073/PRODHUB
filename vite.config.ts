// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.


import fs from 'fs';
import path from 'path';
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { loadEnv } from 'vite';

const env = loadEnv('development', process.cwd(), '');

// The SSR/worker runtime does not inherit the Node process environment, so
// `import 'dotenv/config'` inside src/server.ts never populates process.env
// there. Every server-side secret has to be forwarded explicitly — previously
// only GROQ_API_KEY was, which is why Google OAuth, Supabase writes, JWT auth
// and transactional email all silently fell back to their empty/default values.
//
// Anything read via `process.env.X` in src/server.ts belongs in this list.
const SERVER_ENV_KEYS = [
  'GROQ_API_KEY',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'JWT_SECRET',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'FRONTEND_URL',
  'RESEND_API_KEY',
] as const;

for (const key of SERVER_ENV_KEYS) {
  if (env[key]) process.env[key] = env[key];
}

// Assigning to process.env above is not enough on its own: the SSR bundle runs
// in an isolated runtime that does not share the Vite parent process's
// environment. So we also statically replace each `process.env.X` reference at
// build time. `process.env` is referenced ONLY in src/server.ts (verified), so
// these values are inlined into the server bundle and never reach the browser.
const serverEnvDefine = Object.fromEntries(
  SERVER_ENV_KEYS.map((key) => [`process.env.${key}`, JSON.stringify(env[key] ?? '')]),
);
// Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
// @cloudflare/vite-plugin builds from this — wrangler.jsonc main alone is insufficient.
export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    define: serverEnvDefine,
  },
  plugins: [
    {
      name: 'remove-wrangler-from-dist',
      closeBundle() {
        const wranglerInDist = path.resolve('dist/client/wrangler.json');
        if (fs.existsSync(wranglerInDist)) {
          fs.unlinkSync(wranglerInDist);
          console.log('Removed dist/client/wrangler.json');
        }
        const deployConfig = path.resolve('.wrangler/deploy/config.json');
        if (fs.existsSync(deployConfig)) {
          fs.unlinkSync(deployConfig);
          console.log('Removed .wrangler/deploy/config.json');
        }
      },
    },
  ],
});
