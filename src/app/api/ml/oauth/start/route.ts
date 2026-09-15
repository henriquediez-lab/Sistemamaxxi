import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { buildAuthorizationUrl } from "@/lib/mercadolivre";
import { generateCodeChallenge, generateRandomToken } from "@/lib/pkce";

export const OAUTH_COOKIE_NAME = "ml_oauth_flow";

export async function GET() {
  const state = generateRandomToken(16);
  const codeVerifier = generateRandomToken(32);
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  const authorizationUrl = buildAuthorizationUrl({ state, codeChallenge });

  const cookieStore = await cookies();
  cookieStore.set(
    OAUTH_COOKIE_NAME,
    JSON.stringify({ state, codeVerifier }),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api/ml/oauth",
      maxAge: 60 * 10,
    }
  );

  return NextResponse.redirect(authorizationUrl);
}
