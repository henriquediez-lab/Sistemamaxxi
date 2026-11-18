-- AlterTable
ALTER TABLE "WhatsappContato" ADD COLUMN     "ehGrupo" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "WhatsappMensagem" ADD COLUMN     "remetenteJid" TEXT,
ADD COLUMN     "remetenteNome" TEXT;
