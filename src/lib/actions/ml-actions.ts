"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getValidAccessToken } from "@/lib/ml-account";
import {
  fetchAllItemIds,
  fetchItemsDetails,
  fetchAllOrders,
  type MlOrder,
} from "@/lib/mercadolivre";

export type SyncResult = {
  ok: boolean;
  itemsSynced?: number;
  error?: string;
  /** true quando a busca do histórico inicial não terminou nessa chamada
   * (ex: muitos pedidos para uma única sincronização) — clicar de novo
   * continua de onde parou. */
  parcial?: boolean;
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

const PEDIDOS_HISTORICO_INICIAL_DIAS = 365; // ~12 meses no primeiro sync

async function upsertPedido(order: MlOrder, mlAccountId: string) {
  const orderId = String(order.id);
  await prisma.$transaction([
    prisma.pedido.upsert({
      where: { id: orderId },
      create: {
        id: orderId,
        mlAccountId,
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

    // Busca ~12 meses de histórico enquanto essa marca não existir. Depois
    // que o histórico inicial estiver completo, cada sincronização busca só
    // a partir do pedido mais recente já salvo (com 1 dia de folga, para
    // pegar atualizações de status de pedidos recentes), o que deixa as
    // sincronizações bem mais rápidas no dia a dia.
    const historicoDesejadoDesde = new Date(
      Date.now() - PEDIDOS_HISTORICO_INICIAL_DIAS * 24 * 60 * 60 * 1000
    );
    const historicoCompleto = account.pedidosHistoricoCompletoEm !== null;
    let fromDate = historicoDesejadoDesde;
    if (historicoCompleto) {
      const { _max } = await prisma.pedido.aggregate({
        where: { mlAccountId: account.id },
        _max: { mlDateCreated: true },
      });
      if (_max.mlDateCreated) {
        fromDate = new Date(_max.mlDateCreated.getTime() - 24 * 60 * 60 * 1000);
      }
    }
    // Se a sincronização anterior do histórico inicial não deu tempo de
    // terminar, continua dali em vez de recomeçar do "agora".
    const initialCursorTo = historicoCompleto ? null : account.pedidosSyncCursor;

    let synced = 0;
    const resultado = await fetchAllOrders(
      account.sellerId,
      accessToken,
      fromDate,
      initialCursorTo,
      async (batch) => {
        for (const order of batch) {
          await upsertPedido(order, account.id);
        }
        synced += batch.length;
      },
      async (cursor) => {
        if (!historicoCompleto) {
          await prisma.mlAccount.update({
            where: { id: account.id },
            data: { pedidosSyncCursor: cursor },
          });
        }
      }
    );

    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: {
        status: "concluido",
        itemsSynced: synced,
        itemsTotal: resultado.total,
        finishedAt: new Date(),
      },
    });

    if (!historicoCompleto && resultado.completo) {
      await prisma.mlAccount.update({
        where: { id: account.id },
        data: { pedidosHistoricoCompletoEm: new Date(), pedidosSyncCursor: null },
      });
    }

    revalidatePath("/pedidos");

    return {
      ok: true,
      itemsSynced: synced,
      parcial: !historicoCompleto && !resultado.completo,
    };
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
