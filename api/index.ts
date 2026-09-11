// Vercel serverless entrypoint. Wraps the same Express app used by the
// Replit deployment (artifacts/api-server/src/app.ts) — no route or
// business logic lives here. Requests to /api/* are rewritten to this
// function (see vercel.json); everything else is served as static files
// from the Vite build output.
import app from "../artifacts/api-server/src/app";

export default app;
