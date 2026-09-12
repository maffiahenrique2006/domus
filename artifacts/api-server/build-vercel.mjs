// Bundles this same Express app (used by the Replit deployment) into a
// single-file Vercel Node function at <repo root>/api/index.js. A single
// bundled file sidesteps Vercel's cross-package file tracing in this pnpm
// workspace, which otherwise fails to include this package's src/* at
// runtime when a thin entrypoint imports it by relative path.
//
// vercel.json rewrites every /api/<sub-path> request to this function
// (destination "/api"); Vercel preserves the original request's full path
// when invoking the function this way, which is what the Express app
// needs since it does `app.use("/api", router)` and expects to see the
// full "/api/<sub-path>" URL, not just "/api". (A "[...path]" catch-all
// filename was tried first but only matched a single path segment in
// practice — this plain rewrite is what actually works.)
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { rm, mkdir } from "node:fs/promises";

globalThis.require = createRequire(import.meta.url);

const packageDir = path.dirname(fileURLToPath(import.meta.url));
const apiDir = path.resolve(packageDir, "../../api");
const outfile = path.resolve(apiDir, "index.js");

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
