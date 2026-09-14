import express, { type Express, type ErrorRequestHandler } from "express";
import cors from "cors";
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
app.use(cors());

// Stripe's webhook signature check needs the exact raw request body, so it
// must be mounted before express.json() consumes the stream for everyone else.
app.use("/api", billingWebhookRouter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
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
  logger.error({ event: "unhandled_error", err }, "Unhandled request error");
  res.status(500).json({ error: "Erro interno do servidor." });
};
app.use(errorHandler);

export default app;
