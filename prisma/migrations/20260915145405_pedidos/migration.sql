-- AlterTable
ALTER TABLE "SyncLog" ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'anuncios';

-- CreateTable
CREATE TABLE "Pedido" (
    "id" TEXT NOT NULL,
    "mlAccountId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "statusDetail" TEXT,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "paidAmount" DOUBLE PRECISION,
    "currencyId" TEXT NOT NULL DEFAULT 'BRL',
    "buyerNickname" TEXT,
    "mlDateCreated" TIMESTAMP(3) NOT NULL,
    "mlDateClosed" TIMESTAMP(3),
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pedido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PedidoItem" (
    "id" TEXT NOT NULL,
    "pedidoId" TEXT NOT NULL,
    "itemId" TEXT,
    "title" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "PedidoItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Pedido_mlAccountId_idx" ON "Pedido"("mlAccountId");

-- CreateIndex
CREATE INDEX "Pedido_status_idx" ON "Pedido"("status");

-- CreateIndex
CREATE INDEX "Pedido_mlDateCreated_idx" ON "Pedido"("mlDateCreated");

-- CreateIndex
CREATE INDEX "PedidoItem_pedidoId_idx" ON "PedidoItem"("pedidoId");

-- CreateIndex
CREATE INDEX "SyncLog_mlAccountId_type_idx" ON "SyncLog"("mlAccountId", "type");

-- AddForeignKey
ALTER TABLE "Pedido" ADD CONSTRAINT "Pedido_mlAccountId_fkey" FOREIGN KEY ("mlAccountId") REFERENCES "MlAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PedidoItem" ADD CONSTRAINT "PedidoItem_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id") ON DELETE CASCADE ON UPDATE CASCADE;
