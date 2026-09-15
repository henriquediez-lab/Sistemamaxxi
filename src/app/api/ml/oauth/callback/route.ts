import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { exchangeCodeForToken, fetchMe } from "@/lib/mercadolivre";
import { OAUTH_COOKIE_NAME } from "@/app/api/ml/oauth/start/route";

function redirectToContas(request: NextRequest, params: Record<string, string>) {
  const url = new URL("/contas", request.url);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const oauthError = searchParams.get("error");

  const cookieStore = await cookies();
  const rawFlow = cookieStore.get(OAUTH_COOKIE_NAME)?.value;
  cookieStore.delete(OAUTH_COOKIE_NAME);

  if (oauthError) {
    return redirectToContas(request, {
      erro: "A autorização foi cancelada no Mercado Livre.",
    });
  }

  if (!code || !state || !rawFlow) {
    return redirectToContas(request, {
      erro: "Sessão de autorização expirada. Tente conectar novamente.",
    });
  }

  let flow: { state: string; codeVerifier: string };
  try {
    flow = JSON.parse(rawFlow);
  } catch {
    return redirectToContas(request, {
      erro: "Sessão de autorização inválida. Tente conectar novamente.",
    });
  }

  if (flow.state !== state) {
    return redirectToContas(request, {
      erro: "Falha de segurança na autorização (state inválido). Tente novamente.",
    });
  }

  try {
    const tokenResponse = await exchangeCodeForToken(code, flow.codeVerifier);
    const me = await fetchMe(tokenResponse.access_token);

    await prisma.mlAccount.upsert({
      where: { sellerId: String(me.id) },
      create: {
        sellerId: String(me.id),
        nickname: me.nickname,
        siteId: me.site_id,
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token,
        tokenType: tokenResponse.token_type,
        scope: tokenResponse.scope,
        expiresAt: new Date(Date.now() + tokenResponse.expires_in * 1000),
      },
      update: {
        nickname: me.nickname,
        siteId: me.site_id,
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token,
        tokenType: tokenResponse.token_type,
        scope: tokenResponse.scope,
        expiresAt: new Date(Date.now() + tokenResponse.expires_in * 1000),
      },
    });

    return redirectToContas(request, { sucesso: "1" });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro desconhecido.";
    return redirectToContas(request, { erro: message });
  }
}
