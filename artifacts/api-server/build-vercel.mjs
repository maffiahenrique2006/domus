// Bundles this same Express app (used by the Replit deployment) into a
// single-file Vercel Node function at <repo root>/api/[...path].js. A
// single bundled file sidesteps Vercel's cross-package file tracing in
// this pnpm workspace, which otherwise fails to include this package's
// src/* at runtime when a thin entrypoint imports it by relative path.
//
// The "[...path]" catch-all filename is Vercel's own convention for
// routing every /api/* request to one function while preserving the full
// original path on the request object — required here because the
// Express app itself does `app.use("/api", router)` and expects to see
// the full "/api/<sub-path>" URL, not a path Vercel already rewrote down
// to just "/api".
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { rm, mkdir } from "node:fs/promises";

globalThis.require = createRequire(import.meta.url);

const packageDir = path.dirname(fileURLToPath(import.meta.url));
const apiDir = path.resolve(packageDir, "../../api");
const outfile = path.resolve(apiDir, "[...path].js");

await mkdir(apiDir, { recursive: true });

await rm(outfile, { force: true });

await build({
  entryPoints: [path.resolve(packageDir, "src/app.ts")],
  platform: "node",
  bundle: true,
  format: "esm",
  outfile,
  logLevel: "info",
  // NODE_ENV=production at runtime means logger.ts never loads the
  // pino-pretty transport (see src/lib/logger.ts), so no worker-thread
  // pino plugin is needed here — only the usual native modules stay external.
  external: ["*.node", "pg-native", "fsevents"],
  banner: {
    js: `import { createRequire as __bannerCrReq } from 'node:module';
globalThis.require = __bannerCrReq(import.meta.url);
`,
  },
});
