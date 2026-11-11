import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  alternarRegraAction,
  criarRegraAction,
  excluirRegraAction,
} from "@/lib/actions/whatsapp-actions";

// Sempre reflete as regras cadastradas no banco.
export const dynamic = "force-dynamic";

export default async function RegrasAutomaticasPage() {
  const regras = await prisma.whatsappRegraAutomatica.findMany({
    orderBy: [{ ordem: "asc" }, { createdAt: "asc" }],
  });

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <Link
        href="/atendimento"
        className="text-sm text-slate-500 hover:underline dark:text-slate-400"
      >
        ← Voltar para o Atendimento
      </Link>

      <h1 className="mt-3 text-xl font-semibold text-slate-900 dark:text-white">
        Respostas automáticas do WhatsApp
      </h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Quando uma mensagem recebida contiver a palavra-chave, o sistema
        responde automaticamente e, se um setor for informado, marca a
        conversa com esse setor.
      </p>

      <form
        action={criarRegraAction}
        className="mt-6 space-y-3 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
      >
        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Palavra-chave
          </label>
          <input
            type="text"
            name="palavraChave"
            required
            placeholder="ex: horario, boleto, troca"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Resposta automática
          </label>
          <textarea
            name="resposta"
            required
            rows={3}
            placeholder="Mensagem que será enviada automaticamente"
            className="mt-1 w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Setor (opcional)
          </label>
          <input
            type="text"
            name="setor"
            placeholder="ex: financeiro, suporte, vendas"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          />
        </div>
        <button
          type="submit"
          className="rounded-lg bg-yellow-400 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-yellow-300"
        >
          Adicionar regra
        </button>
      </form>

      <div className="mt-8 space-y-3">
        {regras.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
            Nenhuma regra cadastrada ainda.
          </div>
        ) : (
          regras.map((regra) => (
            <div
              key={regra.id}
              className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    &quot;{regra.palavraChave}&quot;
                  </p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    {regra.resposta}
                  </p>
                  {regra.setor && (
                    <span className="mt-2 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                      Setor: {regra.setor}
                    </span>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <form
                    action={alternarRegraAction.bind(null, regra.id, !regra.ativo)}
                  >
                    <button
                      type="submit"
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                        regra.ativo
                          ? "bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-950 dark:text-green-300"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                      }`}
                    >
                      {regra.ativo ? "Ativa" : "Inativa"}
                    </button>
                  </form>
                  <form action={excluirRegraAction.bind(null, regra.id)}>
                    <button
                      type="submit"
                      className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
                    >
                      Excluir
                    </button>
                  </form>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
