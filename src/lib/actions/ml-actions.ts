"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getValidAccessToken } from "@/lib/ml-account";
import { fetchAllItemIds, fetchItemsDetails } from "@/lib/mercadolivre";

export type SyncResult = {
  ok: boolean;
  itemsSynced?: number;
  error?: string;
};

export async function syncAnunciosAction(
  mlAccountId: string
): Promise<SyncResult> {
  const account = await prisma.mlAccount.findUnique({
    where: { id: mlAccountId },
  });

  if (!account) {
    return { ok: false, error: "Conta do Mercado Livre não encontrada." };
  }

  const syncLog = await prisma.syncLog.create({
    data: { mlAccountId: account.id, status: "em_andamento" },
  });

  try {
    const accessToken = await getValidAccessToken(account);
    const ids = await fetchAllItemIds(account.sellerId, accessToken);
    const items = await fetchItemsDetails(ids, accessToken);

    for (const item of items) {
      await prisma.anuncio.upsert({
        where: { id: item.id },
        create: {
          id: item.id,
          mlAccountId: account.id,
          title: item.title,
          permalink: item.permalink,
          thumbnail: item.thumbnail,
          price: item.price,
          currencyId: item.currency_id,
          availableQuantity: item.available_quantity,
          soldQuantity: item.sold_quantity,
          status: item.status,
          condition: item.condition,
          listingTypeId: item.listing_type_id,
          categoryId: item.category_id,
          catalogListing: Boolean(item.catalog_listing),
          mlDateCreated: item.date_created ? new Date(item.date_created) : null,
          mlLastUpdated: item.last_updated ? new Date(item.last_updated) : null,
        },
        update: {
          title: item.title,
          permalink: item.permalink,
          thumbnail: item.thumbnail,
          price: item.price,
          currencyId: item.currency_id,
          availableQuantity: item.available_quantity,
          soldQuantity: item.sold_quantity,
          status: item.status,
          condition: item.condition,
          listingTypeId: item.listing_type_id,
          categoryId: item.category_id,
          catalogListing: Boolean(item.catalog_listing),
          mlDateCreated: item.date_created ? new Date(item.date_created) : null,
          mlLastUpdated: item.last_updated ? new Date(item.last_updated) : null,
          lastSyncedAt: new Date(),
        },
      });
    }

    // Remove do painel anúncios que não existem mais na conta do Mercado Livre
    const currentIds = items.map((item) => item.id);
    await prisma.anuncio.deleteMany({
      where: {
        mlAccountId: account.id,
        id: currentIds.length > 0 ? { notIn: currentIds } : undefined,
      },
    });

    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: {
        status: "concluido",
        itemsSynced: items.length,
        itemsTotal: ids.length,
        finishedAt: new Date(),
      },
    });

    revalidatePath("/anuncios");
    revalidatePath("/");

    return { ok: true, itemsSynced: items.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido.";
    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: { status: "erro", errorMessage: message, finishedAt: new Date() },
    });
    return { ok: false, error: message };
  }
}

export async function disconnectMlAccountAction(mlAccountId: string) {
  await prisma.mlAccount.delete({ where: { id: mlAccountId } });
  revalidatePath("/contas");
  revalidatePath("/anuncios");
}
