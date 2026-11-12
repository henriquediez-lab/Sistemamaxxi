-- AlterTable
ALTER TABLE "WhatsappContato" ADD COLUMN     "aguardandoEscolhaSetor" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "WhatsappSaudacaoConfig" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "mensagem" TEXT NOT NULL DEFAULT 'Olá! 👋 Bem-vindo(a). Pra agilizar o atendimento, escolha uma opção:',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsappSaudacaoConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsappSetorOpcao" (
    "id" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsappSetorOpcao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsappEtiqueta" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cor" TEXT NOT NULL DEFAULT '#25D366',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsappEtiqueta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsappContatoEtiqueta" (
    "contatoId" TEXT NOT NULL,
    "etiquetaId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsappContatoEtiqueta_pkey" PRIMARY KEY ("contatoId","etiquetaId")
);

-- CreateTable
CREATE TABLE "WhatsappRespostaRapida" (
    "id" TEXT NOT NULL,
    "atalho" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsappRespostaRapida_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WhatsappSetorOpcao_numero_key" ON "WhatsappSetorOpcao"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsappEtiqueta_nome_key" ON "WhatsappEtiqueta"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsappRespostaRapida_atalho_key" ON "WhatsappRespostaRapida"("atalho");

-- AddForeignKey
ALTER TABLE "WhatsappContatoEtiqueta" ADD CONSTRAINT "WhatsappContatoEtiqueta_contatoId_fkey" FOREIGN KEY ("contatoId") REFERENCES "WhatsappContato"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsappContatoEtiqueta" ADD CONSTRAINT "WhatsappContatoEtiqueta_etiquetaId_fkey" FOREIGN KEY ("etiquetaId") REFERENCES "WhatsappEtiqueta"("id") ON DELETE CASCADE ON UPDATE CASCADE;
