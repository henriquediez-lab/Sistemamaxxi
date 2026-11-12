import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  criarEtiquetaAction,
  excluirEtiquetaAction,
} from "@/lib/actions/whatsapp-actions";

// Sempre reflete as etiquetas cadastradas no banco.
export const dynamic = "force-dynamic";

const CORES_SUGERIDAS = [
  "#25D366",
  "#F59E0B",
  "#EF4444",
  "#3B82F6",
  "#A855F7",
  "#EC4899",
  "#6B7280",
];

export default async function EtiquetasPage() {
  const etiquetas = await prisma.whatsappEtiqueta.findMany({
    orderBy: { nome: "asc" },
    include: { _count: { select: { contatos: true } } },
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
        Etiquetas
      </h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Use etiquetas pra organizar as conversas por assunto (ex: Urgente,
        Aguardando pagamento, Reclamação). Uma conversa pode ter várias.
      </p>

      <form
        action={criarEtiquetaAction}
        className="mt-6 flex items-end gap-2 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="flex-1">
          <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Nome
          </label>
          <input
            type="text"
            name="nome"
            required
            placeholder="ex: Urgente"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#25d366] focus:ring-2 focus:ring-[#25d366]/30 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Cor
          </label>
          <select
            name="cor"
            defaultValue={CORES_SUGERIDAS[0]}
            className="mt-1 rounded-lg border border-slate-300 px-2 py-2 text-sm outline-none focus:border-[#25d366] focus:ring-2 focus:ring-[#25d366]/30 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          >
            {CORES_SUGERIDAS.map((cor) => (
              <option key={cor} value={cor}>
                {cor}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="rounded-lg bg-[#00a884] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#06cf9c]"
        >
          Adicionar
        </button>
      </form>

      <div className="mt-6 space-y-2">
        {etiquetas.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
            Nenhuma etiqueta cadastrada ainda.
          </div>
        ) : (
          etiquetas.map((etiqueta) => (
            <div
              key={etiqueta.id}
              className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-center gap-2">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: etiqueta.cor }}
                />
                <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                  {etiqueta.nome}
                </p>
                <span className="text-xs text-slate-400">
                  {etiqueta._count.contatos} conversa(s)
                </span>
              </div>
              <form action={excluirEtiquetaAction.bind(null, etiqueta.id)}>
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
