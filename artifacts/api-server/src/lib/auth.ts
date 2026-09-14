import crypto from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db, sessionsTable, usersTable, type User } from "@workspace/db";

const SESSION_COOKIE = "domus_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export async function createSession(userId: number): Promise<{ token: string; expiresAt: Date }> {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await db.insert(sessionsTable).values({ token, userId, expiresAt });

  return { token, expiresAt };
}

export async function destroySession(token: string): Promise<void> {
  await db.delete(sessionsTable).where(eq(sessionsTable.token, token));
}

export function setSessionCookie(res: Response, token: string, expiresAt: Date): void {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    signed: true,
    expires: expiresAt,
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE);
}

export function getSessionToken(req: Request): string | undefined {
  const signedCookies = req.signedCookies as Record<string, string> | undefined;
  return signedCookies?.[SESSION_COOKIE];
}

async function loadUserFromSession(token: string): Promise<User | undefined> {
  const [session] = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.token, token));

  if (!session || session.expiresAt.getTime() < Date.now()) {
    return undefined;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId));
  return user;
}

/** Attaches req.user when a valid session cookie is present. Never rejects — use requireAuth for that. */
export async function attachUser(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const token = getSessionToken(req);
  if (token) {
    req.user = await loadUserFromSession(token);
  }
  next();
}

/** Rejects with 401 when there's no authenticated user. Mount after attachUser. */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: "É necessário estar autenticado." });
    return;
  }
  next();
}
