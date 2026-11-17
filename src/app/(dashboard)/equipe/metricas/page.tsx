import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { formatDateTimeBR } from "@/lib/format-date";
import {
  calcularMetricasAtendimento,
  formatarDuracao,
  PERIODOS,
  resolverPeriodo,
} from "@/lib/metricas-atendimento";

// Os números precisam refletir mensagens que acabaram de chegar/ser enviadas.
export const dynamic = "force-dynamic";

export default async function MetricasAtendimentoPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/");

  const params = await searchParams;
  const periodoParam = typeof params.periodo === "string" ? params.periodo : undefined;
  const { periodo, inicio, fim } = resolverPeriodo(periodoParam);

  const [usuarios, metricas] = await Promise.all([
    prisma.user.findMany({ orderBy: [{ role: "asc" }, { name: "asc" }] }),
    calcularMetricasAtendimento(inicio, fim),
  ]);

  const metricaPorEmail = new Map(metricas.porAtendente.map((m) => [m.email, m]));
  const linhas = usuarios.map((usuario) => {
    const dados = metricaPorEmail.get(usuario.email);
    return {
      id: usuario.id,
      nome: usuario.name,
      email: usuario.email,
      ativo: usuario.ativo,
      mensagensEnviadas: dados?.mensagensEnviadas ?? 0,
      conversasAtendidas: dados?.conversasAtendidas ?? 0,
      tempoMedioRespostaSegundos: dados?.tempoMedioRespostaSegundos ?? null,
      ultimaAtividade: dados?.ultimaAtividade ?? null,
    };
  });

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <Link
        href="/equipe"
        className="text-sm text-slate-500 hover:underline dark:text-slate-400"
      >
        ← Voltar para Equipe
      </Link>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
            Métricas de atendimento
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Baseado nas mensagens respondidas manualmente pelo painel — não
            conta respostas automáticas.
          </p>
        </div>
        <div className="flex gap-1 rounded-lg border border-slate-200 p-1 dark:border-slate-700">
          {PERIODOS.map((p) => (
            <Link
              key={p.valor}
              href={`/equipe/metricas?periodo=${p.valor}`}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                p.valor === periodo
                  ? "bg-yellow-400 text-slate-900"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              {p.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Mensagens respondidas (painel)
          </p>
          <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">
            {metricas.totalMensagens}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Conversas atendidas
          </p>
          <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">
            {metricas.totalConversasAtendidas}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Tempo médio de resposta
          </p>
          <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">
            {formatarDuracao(metricas.tempoMedioRespostaSegundos)}
          </p>
        </div>
      </div>

      {metricas.mensagensForaDoPainel > 0 && (
        <p className="mt-3 text-xs text-slate-400">
          +{metricas.mensagensForaDoPainel}{" "}
          {metricas.mensagensForaDoPainel === 1
            ? "mensagem respondida"
            : "mensagens respondidas"}{" "}
          direto pelo celular (fora do painel), não contabilizada por
          atendente.
        </p>
      )}

      <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
            <tr>
              <th className="px-4 py-3 font-medium">Atendente</th>
              <th className="px-4 py-3 font-medium">Mensagens</th>
              <th className="px-4 py-3 font-medium">Conversas</th>
              <th className="px-4 py-3 font-medium">Tempo médio resposta</th>
              <th className="px-4 py-3 font-medium">Última atividade</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {linhas.map((linha) => (
              <tr key={linha.id} className="bg-white dark:bg-slate-900">
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-900 dark:text-white">
                    {linha.nome}
                    {!linha.ativo && (
                      <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-red-700 dark:bg-red-950 dark:text-red-300">
                        Desativado
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {linha.email}
                  </p>
                </td>
                <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                  {linha.mensagensEnviadas}
                </td>
                <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                  {linha.conversasAtendidas}
                </td>
                <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                  {formatarDuracao(linha.tempoMedioRespostaSegundos)}
                </td>
                <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                  {linha.ultimaAtividade
                    ? formatDateTimeBR(linha.ultimaAtividade)
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
