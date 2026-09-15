"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getValidAccessToken } from "@/lib/ml-account";
import {
  fetchAllItemIds,
  fetchItemsDetails,
  fetchAllOrders,
} from "@/lib/mercadolivre";

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

export async function syncPedidosAction(
  mlAccountId: string
): Promise<SyncResult> {
  const account = await prisma.mlAccount.findUnique({
    where: { id: mlAccountId },
  });

  if (!account) {
    return { ok: false, error: "Conta do Mercado Livre não encontrada." };
  }

  const syncLog = await prisma.syncLog.create({
    data: { mlAccountId: account.id, type: "pedidos", status: "em_andamento" },
  });

  try {
    const accessToken = await getValidAccessToken(account);
    const orders = await fetchAllOrders(account.sellerId, accessToken);

    for (const order of orders) {
      const orderId = String(order.id);
      await prisma.$transaction([
        prisma.pedido.upsert({
          where: { id: orderId },
          create: {
            id: orderId,
            mlAccountId: account.id,
            status: order.status,
            statusDetail: order.status_detail,
            totalAmount: order.total_amount,
            paidAmount: order.paid_amount,
            currencyId: order.currency_id,
            buyerNickname: order.buyer?.nickname,
            mlDateCreated: new Date(order.date_created),
            mlDateClosed: order.date_closed ? new Date(order.date_closed) : null,
          },
          update: {
            status: order.status,
            statusDetail: order.status_detail,
            totalAmount: order.total_amount,
            paidAmount: order.paid_amount,
            currencyId: order.currency_id,
            buyerNickname: order.buyer?.nickname,
            mlDateClosed: order.date_closed ? new Date(order.date_closed) : null,
            lastSyncedAt: new Date(),
          },
        }),
        prisma.pedidoItem.deleteMany({ where: { pedidoId: orderId } }),
        prisma.pedidoItem.createMany({
          data: order.order_items.map((orderItem) => ({
            pedidoId: orderId,
            itemId: orderItem.item?.id,
            title: orderItem.item?.title ?? "Item removido",
            quantity: orderItem.quantity,
            unitPrice: orderItem.unit_price,
          })),
        }),
      ]);
    }

    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: {
        status: "concluido",
        itemsSynced: orders.length,
        itemsTotal: orders.length,
        finishedAt: new Date(),
      },
    });

    revalidatePath("/pedidos");

    return { ok: true, itemsSynced: orders.length };
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
  revalidatePath("/");
  revalidatePath("/pedidos");
}
