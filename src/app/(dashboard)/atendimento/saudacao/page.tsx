import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  criarOpcaoSetorAction,
  excluirOpcaoSetorAction,
  salvarSaudacaoAction,
} from "@/lib/actions/whatsapp-actions";

// Sempre reflete a configuração atual do banco.
export const dynamic = "force-dynamic";

export default async function SaudacaoPage() {
  const [config, opcoes] = await Promise.all([
    prisma.whatsappSaudacaoConfig.findUnique({ where: { id: "default" } }),
    prisma.whatsappSetorOpcao.findMany({ orderBy: [{ ordem: "asc" }, { numero: "asc" }] }),
  ]);

  const proximoNumero =
    opcoes.length > 0 ? Math.max(...opcoes.map((o) => o.numero)) + 1 : 1;

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <Link
        href="/atendimento/configuracoes"
        className="text-sm text-slate-500 hover:underline dark:text-slate-400"
      >
        ← Voltar para Configurações
      </Link>

      <h1 className="mt-3 text-xl font-semibold text-slate-900 dark:text-white">
        Saudação automática
      </h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Quando um cliente manda mensagem depois de mais de 24h sem contato, o
        sistema responde com essa saudação e um menu numerado de setores.
        Quando ele escolhe um número, a conversa já fica marcada com o setor
        certo.
      </p>

      <form
        action={salvarSaudacaoAction}
        className="mt-6 space-y-3 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
      >
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
          <input
            type="checkbox"
            name="ativo"
            defaultChecked={config?.ativo ?? true}
            className="h-4 w-4 accent-[#25d366]"
          />
          Saudação automática ativada
        </label>
        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Mensagem de saudação
          </label>
          <textarea
            name="mensagem"
            required
            rows={3}
            defaultValue={
              config?.mensagem ??
              "Olá! 👋 Bem-vindo(a). Pra agilizar o atendimento, escolha uma opção:"
            }
            className="mt-1 w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#25d366] focus:ring-2 focus:ring-[#25d366]/30 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          />
          <p className="mt-1 text-xs text-slate-400">
            O menu de setores abaixo é adicionado automaticamente depois dessa
            mensagem.
          </p>
        </div>
        <button
          type="submit"
          className="rounded-lg bg-[#00a884] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#06cf9c]"
        >
          Salvar
        </button>
      </form>

      <h2 className="mt-8 text-sm font-semibold text-slate-700 dark:text-slate-200">
        Opções do menu
      </h2>

      <form
        action={criarOpcaoSetorAction}
        className="mt-3 flex items-end gap-2 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="w-20">
          <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Número
          </label>
          <input
            type="number"
            name="numero"
            required
            min={0}
            defaultValue={proximoNumero}
            className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm outline-none focus:border-[#25d366] focus:ring-2 focus:ring-[#25d366]/30 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          />
        </div>
        <div className="flex-1">
          <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Setor
          </label>
          <input
            type="text"
            name="nome"
            required
            placeholder="ex: Vendas"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#25d366] focus:ring-2 focus:ring-[#25d366]/30 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          />
        </div>
        <button
          type="submit"
          className="rounded-lg bg-[#00a884] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#06cf9c]"
        >
          Adicionar
        </button>
      </form>

      <div className="mt-3 space-y-2">
        {opcoes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
            Nenhuma opção cadastrada — sem opções, a saudação é enviada sem
            menu de setores.
          </div>
        ) : (
          opcoes.map((opcao) => (
            <div
              key={opcao.id}
              className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900"
            >
              <p className="text-sm text-slate-800 dark:text-slate-100">
                <span className="font-semibold">{opcao.numero}</span> —{" "}
                {opcao.nome}
              </p>
              <form action={excluirOpcaoSetorAction.bind(null, opcao.id)}>
                <button
                  type="submit"
                  className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
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
