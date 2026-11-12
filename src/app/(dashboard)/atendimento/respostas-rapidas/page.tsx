import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  criarRespostaRapidaAction,
  excluirRespostaRapidaAction,
} from "@/lib/actions/whatsapp-actions";

// Sempre reflete as respostas rápidas cadastradas no banco.
export const dynamic = "force-dynamic";

export default async function RespostasRapidasPage() {
  const respostas = await prisma.whatsappRespostaRapida.findMany({
    orderBy: { atalho: "asc" },
  });

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <Link
        href="/atendimento/configuracoes"
        className="text-sm text-slate-500 hover:underline dark:text-slate-400"
      >
        ← Voltar para Configurações
      </Link>

      <h1 className="mt-3 text-xl font-semibold text-slate-900 dark:text-white">
        Respostas rápidas
      </h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Cadastre mensagens prontas. Na caixa de texto do Atendimento, digite{" "}
        <code>/</code> seguido do atalho pra inserir a mensagem completa.
      </p>

      <form
        action={criarRespostaRapidaAction}
        className="mt-6 space-y-3 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
      >
        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Atalho
          </label>
          <div className="mt-1 flex items-center gap-1">
            <span className="text-slate-400">/</span>
            <input
              type="text"
              name="atalho"
              required
              placeholder="ex: horario"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#25d366] focus:ring-2 focus:ring-[#25d366]/30 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Mensagem completa
          </label>
          <textarea
            name="texto"
            required
            rows={3}
            placeholder="Mensagem que será inserida na caixa de texto"
            className="mt-1 w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#25d366] focus:ring-2 focus:ring-[#25d366]/30 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          />
        </div>
        <button
          type="submit"
          className="rounded-lg bg-[#00a884] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#06cf9c]"
        >
          Adicionar
        </button>
      </form>

      <div className="mt-6 space-y-2">
        {respostas.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
            Nenhuma resposta rápida cadastrada ainda.
          </div>
        ) : (
          respostas.map((resposta) => (
            <div
              key={resposta.id}
              className="flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
            >
              <div>
                <p className="text-sm font-semibold text-[#008069] dark:text-[#06cf9c]">
                  /{resposta.atalho}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">
                  {resposta.texto}
                </p>
              </div>
              <form action={excluirRespostaRapidaAction.bind(null, resposta.id)}>
                <button
                  type="submit"
                  className="shrink-0 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
                >
                  Excluir
                </button>
              </form>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
