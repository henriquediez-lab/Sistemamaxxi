import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDateTimeBR } from "@/lib/format-date";
import { MergeContactsClient } from "./merge-client";

// Sempre reflete os contatos atuais do banco.
export const dynamic = "force-dynamic";

export default async function ContatosPage() {
  const contatosDb = await prisma.whatsappContato.findMany({
    orderBy: { ultimaMensagemEm: "desc" },
    include: { _count: { select: { mensagens: true } } },
  });

  const contatos = contatosDb.map((contato) => ({
    id: contato.id,
    telefone: contato.telefone,
    nome: contato.nome,
    setor: contato.setor,
    totalMensagens: contato._count.mensagens,
    ultimaMensagemEmFormatado: contato.ultimaMensagemEm
      ? formatDateTimeBR(contato.ultimaMensagemEm)
      : null,
  }));

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <Link
        href="/atendimento"
        className="text-sm text-slate-500 hover:underline dark:text-slate-400"
      >
        ← Voltar para o Atendimento
      </Link>

      <h1 className="mt-3 text-xl font-semibold text-slate-900 dark:text-white">
        Contatos do WhatsApp
      </h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Às vezes o WhatsApp identifica o mesmo cliente de duas formas
        diferentes e cria duas conversas separadas. Marque os dois contatos
        que na verdade são a mesma pessoa pra juntar as conversas.
      </p>

      <div className="mt-6">
        <MergeContactsClient contatos={contatos} />
      </div>
    </div>
  );
}
