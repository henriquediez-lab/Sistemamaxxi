-- CreateTable
CREATE TABLE "WhatsappContato" (
    "id" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "nome" TEXT,
    "setor" TEXT,
    "naoLida" BOOLEAN NOT NULL DEFAULT false,
    "ultimaMensagemEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsappContato_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsappMensagem" (
    "id" TEXT NOT NULL,
    "contatoId" TEXT NOT NULL,
    "direcao" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "automatica" BOOLEAN NOT NULL DEFAULT false,
    "enviadoPor" TEXT,
    "erro" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsappMensagem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsappRegraAutomatica" (
    "id" TEXT NOT NULL,
    "palavraChave" TEXT NOT NULL,
    "resposta" TEXT NOT NULL,
    "setor" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsappRegraAutomatica_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WhatsappContato_telefone_key" ON "WhatsappContato"("telefone");

-- CreateIndex
CREATE INDEX "WhatsappContato_ultimaMensagemEm_idx" ON "WhatsappContato"("ultimaMensagemEm");

-- CreateIndex
CREATE INDEX "WhatsappMensagem_contatoId_createdAt_idx" ON "WhatsappMensagem"("contatoId", "createdAt");

-- AddForeignKey
ALTER TABLE "WhatsappMensagem" ADD CONSTRAINT "WhatsappMensagem_contatoId_fkey" FOREIGN KEY ("contatoId") REFERENCES "WhatsappContato"("id") ON DELETE CASCADE ON UPDATE CASCADE;
