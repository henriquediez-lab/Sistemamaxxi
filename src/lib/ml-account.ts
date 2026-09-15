import "server-only";
import { prisma } from "@/lib/prisma";
import { refreshAccessToken } from "@/lib/mercadolivre";
import type { MlAccount } from "@/generated/prisma/client";

const EXPIRY_SAFETY_MARGIN_MS = 2 * 60 * 1000; // renova 2 min antes de expirar

/** Retorna um access_token válido para a conta, renovando automaticamente se necessário. */
export async function getValidAccessToken(
  account: MlAccount
): Promise<string> {
  const willExpireSoon =
    account.expiresAt.getTime() - EXPIRY_SAFETY_MARGIN_MS < Date.now();

  if (!willExpireSoon) {
    return account.accessToken;
  }

  const tokenResponse = await refreshAccessToken(account.refreshToken);

  const updated = await prisma.mlAccount.update({
    where: { id: account.id },
    data: {
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      tokenType: tokenResponse.token_type,
      scope: tokenResponse.scope,
      expiresAt: new Date(Date.now() + tokenResponse.expires_in * 1000),
    },
  });

  return updated.accessToken;
}

export async function getPrimaryMlAccount() {
  return prisma.mlAccount.findFirst({ orderBy: { connectedAt: "asc" } });
}
