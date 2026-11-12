-- AlterTable
ALTER TABLE "WhatsappContato" ADD COLUMN     "fotoUrl" TEXT;

-- AlterTable
ALTER TABLE "WhatsappMensagem" ADD COLUMN     "midiaMimetype" TEXT,
ADD COLUMN     "midiaNomeArquivo" TEXT,
ADD COLUMN     "midiaUrl" TEXT,
ADD COLUMN     "respondendoAId" TEXT,
ADD COLUMN     "tipo" TEXT NOT NULL DEFAULT 'texto',
ALTER COLUMN "texto" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "WhatsappMensagem" ADD CONSTRAINT "WhatsappMensagem_respondendoAId_fkey" FOREIGN KEY ("respondendoAId") REFERENCES "WhatsappMensagem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
