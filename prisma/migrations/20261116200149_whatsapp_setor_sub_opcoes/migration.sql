-- AlterTable
ALTER TABLE "WhatsappContato" ADD COLUMN     "aguardandoEscolhaSubSetor" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "subSetor" TEXT,
ADD COLUMN     "subSetorPaiId" TEXT;

-- AlterTable
ALTER TABLE "WhatsappSetorOpcao" ADD COLUMN     "mensagemSubmenu" TEXT;

-- CreateTable
CREATE TABLE "WhatsappSetorSubOpcao" (
    "id" TEXT NOT NULL,
    "setorOpcaoId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "mensagemConfirmacao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsappSetorSubOpcao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WhatsappSetorSubOpcao_setorOpcaoId_numero_key" ON "WhatsappSetorSubOpcao"("setorOpcaoId", "numero");

-- AddForeignKey
ALTER TABLE "WhatsappSetorSubOpcao" ADD CONSTRAINT "WhatsappSetorSubOpcao_setorOpcaoId_fkey" FOREIGN KEY ("setorOpcaoId") REFERENCES "WhatsappSetorOpcao"("id") ON DELETE CASCADE ON UPDATE CASCADE;
