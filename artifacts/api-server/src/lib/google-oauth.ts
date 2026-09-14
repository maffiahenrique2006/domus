import { OAuth2Client } from "google-auth-library";

export class MissingGoogleConfigError extends Error {
  constructor() {
    super("Google OAuth is not configured");
    this.name = "MissingGoogleConfigError";
  }
}

export interface GoogleProfile {
  googleId: string;
  email: string;
  name: string;
  pictureUrl: string | null;
}

function getRedirectUri(): string {
  const appUrl = process.env.APP_URL;
  if (!appUrl) {
    throw new MissingGoogleConfigError();
  }
  return `${appUrl.replace(/\/$/, "")}/api/auth/google/callback`;
}

function getClient(): OAuth2Client {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new MissingGoogleConfigError();
  }
  return new OAuth2Client(clientId, clientSecret, getRedirectUri());
}

export function buildGoogleAuthUrl(state: string): string {
  const client = getClient();
  return client.generateAuthUrl({
    access_type: "online",
    scope: ["openid", "email", "profile"],
    state,
    prompt: "select_account",
  });
}

export async function exchangeGoogleCode(code: string): Promise<GoogleProfile> {
  const client = getClient();
  const { tokens } = await client.getToken(code);

  if (!tokens.id_token) {
    throw new Error("Google did not return an id_token");
  }

  const ticket = await client.verifyIdToken({
    idToken: tokens.id_token,
    audience: process.env.GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();
  if (!payload?.sub || !payload.email) {
    throw new Error("Google id_token payload is missing required fields");
  }

  return {
    googleId: payload.sub,
    email: payload.email,
    name: payload.name ?? payload.email,
    pictureUrl: payload.picture ?? null,
  };
}
