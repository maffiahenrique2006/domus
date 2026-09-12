// Bundles this same Express app (used by the Replit deployment) into a
// single-file Vercel Node function at <repo root>/api/index.js. A single
// bundled file sidesteps Vercel's cross-package file tracing in this pnpm
// workspace, which otherwise fails to include this package's src/* at
// runtime when api/index.ts imports it by relative path.
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { rm } from "node:fs/promises";

globalThis.require = createRequire(import.meta.url);

const packageDir = path.dirname(fileURLToPath(import.meta.url));
const outfile = path.resolve(packageDir, "../../api/index.js");

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
