import express, { type Express, type ErrorRequestHandler } from "express";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import router from "./routes";
import { billingWebhookRouter } from "./routes/billing";
import { attachUser } from "./lib/auth";
import { logger } from "./lib/logger";

const app: Express = express();

// Replit runs the app behind a reverse proxy; trust it so req.ip reflects
// the real client (used by the chat rate limiter).
app.set("trust proxy", true);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.disable("x-powered-by");
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});

// Stripe's webhook signature check needs the exact raw request body, so it
// must be mounted before express.json() consumes the stream for everyone else.
app.use("/api", billingWebhookRouter);

app.use(express.json({ limit: "128kb" }));
app.use(express.urlencoded({ extended: false, limit: "128kb" }));
// Same-origin cookie API. Stripe is mounted above and authenticates by signature.
app.use("/api", (req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    const origin = req.get("origin");
    const allowed = process.env.APP_URL ? new URL(process.env.APP_URL).origin : null;
    if (req.get("sec-fetch-site") === "cross-site" || (origin && origin !== allowed)) {
      res.status(403).json({ error: "Origem não autorizada." });
      return;
    }
  }
  next();
});
app.use(cookieParser(process.env.SESSION_SECRET));
app.use(attachUser);

app.use("/api", router);

// In production, this same server serves the built frontend so the app and
// the API share one origin (no CORS, no separate deploy). In development
// each workspace package runs its own dev server instead — see README.
if (process.env.NODE_ENV === "production") {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const clientDist = path.resolve(__dirname, "../../domus/dist/public");

  app.use(express.static(clientDist));

  // SPA fallback for client-side routing. Must run after /api and static
  // assets so it never intercepts an API call or a real file.
  app.get(/^\/(?!api\/).*/, (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

// /api 404s (unknown routes under /api)
app.use("/api", (_req, res) => {
  res.status(404).json({ error: "Rota não encontrada." });
});

// Final error handler — never leak stack traces or internal details to the client.
const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  logger.error({ event: "unhandled_error", errorType: err?.name }, "Unhandled request error");
  const status = err?.type === "entity.too.large" ? 413 : err instanceof SyntaxError ? 400 : 500;
  res.status(status).json({ error: status === 500 ? "Erro interno do servidor." : "Requisição inválida ou muito grande." });
};
app.use(errorHandler);

export default app;
