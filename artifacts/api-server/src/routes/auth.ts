import crypto from "node:crypto";
import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { GetCurrentUserResponse, LogoutResponse } from "@workspace/api-zod";
import {
  buildGoogleAuthUrl,
  exchangeGoogleCode,
  MissingGoogleConfigError,
} from "../lib/google-oauth";
import {
  clearSessionCookie,
  createSession,
  destroySession,
  getSessionToken,
  setSessionCookie,
} from "../lib/auth";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const STATE_COOKIE = "domus_oauth_state";

router.get("/auth/google", (_req, res): void => {
  const state = crypto.randomBytes(16).toString("hex");

  let authUrl: string;
  try {
    authUrl = buildGoogleAuthUrl(state);
  } catch (err) {
    if (err instanceof MissingGoogleConfigError) {
      res.status(503).json({
        error: "O login com Google ainda não está configurado neste ambiente.",
      });
      return;
    }
    throw err;
  }

  res.cookie(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    signed: true,
    maxAge: 10 * 60 * 1000, // 10 minutes
  });

  res.redirect(authUrl);
});

router.get("/auth/google/callback", async (req, res): Promise<void> => {
  const code = typeof req.query.code === "string" ? req.query.code : undefined;
  const state = typeof req.query.state === "string" ? req.query.state : undefined;
  const signedCookies = req.signedCookies as Record<string, string> | undefined;
  const expectedState = signedCookies?.[STATE_COOKIE];

  res.clearCookie(STATE_COOKIE);

  if (!code || !state || !expectedState || state !== expectedState) {
    res.status(400).send("Falha na validação do login com Google. Tente novamente.");
    return;
  }

  try {
    const profile = await exchangeGoogleCode(code);

    const [user] = await db
      .insert(usersTable)
      .values({
        googleId: profile.googleId,
        email: profile.email,
        name: profile.name,
        pictureUrl: profile.pictureUrl,
      })
      .onConflictDoUpdate({
        target: usersTable.googleId,
        set: { name: profile.name, pictureUrl: profile.pictureUrl, email: profile.email },
      })
      .returning();

    const { token, expiresAt } = await createSession(user.id);
    setSessionCookie(res, token, expiresAt);

    res.redirect("/");
  } catch (err) {
    logger.error({ event: "google_oauth_callback_failed" }, "Google OAuth callback failed");
    res.status(502).send("Não foi possível concluir o login com Google. Tente novamente.");
  }
});

router.get("/auth/me", (req, res): void => {
  if (!req.user) {
    res.status(401).json({ error: "Não autenticado." });
    return;
  }

  res.json(
    GetCurrentUserResponse.parse({
      id: req.user.id,
      email: req.user.email,
      name: req.user.name,
      pictureUrl: req.user.pictureUrl,
      plan: req.user.plan,
    }),
  );
});

router.post("/auth/logout", async (req, res): Promise<void> => {
  const token = getSessionToken(req);
  if (token) {
    await destroySession(token);
  }
  clearSessionCookie(res);
  res.json(LogoutResponse.parse({ success: true }));
});

export default router;
