import type { NextFunction, Request, Response } from "express";

interface Bucket {
  count: number;
  resetAt: number;
}

/**
 * Minimal in-memory fixed-window rate limiter. Good enough for a
 * single-instance academic MVP demo — not meant to survive multiple
 * server instances or restarts.
 */
export function rateLimit(options: { windowMs: number; max: number }) {
  const buckets = new Map<string, Bucket>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = req.ip ?? "unknown";
    const now = Date.now();
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + options.windowMs });
      next();
      return;
    }

    if (bucket.count >= options.max) {
      res.status(429).json({
        error: "Muitas mensagens em pouco tempo. Aguarde um instante e tente novamente.",
      });
      return;
    }

    bucket.count += 1;
    next();
  };
}
