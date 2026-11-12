-- AlterTable
ALTER TABLE "WhatsappMensagem" ADD COLUMN     "waMessageId" TEXT;

-- CreateIndex
CREATE INDEX "WhatsappMensagem_waMessageId_idx" ON "WhatsappMensagem"("waMessageId");
