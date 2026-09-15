import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { syncPedidosAction } from "@/lib/actions/ml-actions";
import { SyncButton } from "../sync-button";
import { PedidoStatusBadge } from "./pedido-status-badge";

// Sempre reflete o estado atual do banco (pedidos recém-sincronizados).
export const dynamic = "force-dynamic";
// Dá mais tempo para o botão "Sincronizar agora" (pode envolver muitas
// páginas da API do Mercado Livre). 60s é o máximo do plano gratuito da Vercel.
export const maxDuration = 60;

function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: currency || "BRL",
  }).format(value);
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(date);
}

function SummaryCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
        {value}
      </p>
      {hint && (
        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
          {hint}
        </p>
      )}
    </div>
  );
}

const AGUARDANDO_STATUSES = [
  "payment_required",
  "payment_in_process",
  "partially_paid",
];

export default async function PedidosPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const statusFilter =
    typeof params.status === "string" ? params.status : "todos";

  const account = await prisma.mlAccount.findFirst({
    orderBy: { connectedAt: "asc" },
  });

  if (!account) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center px-6 py-24 text-center">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
          Nenhuma conta conectada
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Conecte a sua conta do Mercado Livre para ver e sincronizar seus
          pedidos aqui.
        </p>
        <Link
          href="/contas"
          className="mt-6 rounded-lg bg-yellow-400 px-5 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-yellow-300"
        >
          Conectar conta
        </Link>
      </div>
    );
  }

  const allPedidos = await prisma.pedido.findMany({
    where: { mlAccountId: account.id },
    select: { status: true, totalAmount: true },
  });

  const totalPedidos = allPedidos.length;
  const pagos = allPedidos.filter((p) => p.status === "paid");
  const aguardando = allPedidos.filter((p) =>
    AGUARDANDO_STATUSES.includes(p.status)
  );
  const cancelados = allPedidos.filter((p) => p.status === "cancelled");
  const faturamento = pagos.reduce((sum, p) => sum + p.totalAmount, 0);
  const ticketMedio = pagos.length > 0 ? faturamento / pagos.length : 0;

  const lastSync = await prisma.syncLog.findFirst({
    where: { mlAccountId: account.id, type: "pedidos", status: "concluido" },
    orderBy: { finishedAt: "desc" },
  });

  const periodo = await prisma.pedido.aggregate({
    where: { mlAccountId: account.id },
    _min: { mlDateCreated: true },
    _max: { mlDateCreated: true },
  });

  const pedidos = await prisma.pedido.findMany({
    where: {
      mlAccountId: account.id,
      ...(statusFilter !== "todos" ? { status: statusFilter } : {}),
      ...(q
        ? {
            OR: [
              { buyerNickname: { contains: q } },
              { id: { contains: q } },
            ],
          }
        : {}),
    },
    include: { itens: true },
    orderBy: { mlDateCreated: "desc" },
    take: 200,
  });

  const statusOptions = [
    { value: "todos", label: "Todos os status" },
    { value: "paid", label: "Pagos" },
    { value: "confirmed", label: "Confirmados" },
    { value: "payment_required", label: "Aguardando pagamento" },
    { value: "cancelled", label: "Cancelados" },
  ];

  return (
    <div className="px-6 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
            Vendas e Pedidos
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Conta: {account.nickname ?? account.sellerId}
            {lastSync?.finishedAt && (
              <> · Última sincronização: {formatDateTime(lastSync.finishedAt)}</>
            )}
          </p>
          {periodo._min.mlDateCreated && periodo._max.mlDateCreated && (
            <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
              Pedidos sincronizados de {formatDate(periodo._min.mlDateCreated)}{" "}
              até {formatDate(periodo._max.mlDateCreated)}
            </p>
          )}
        </div>
        <SyncButton
          mlAccountId={account.id}
          action={syncPedidosAction}
          unitLabel="pedido(s)"
        />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <SummaryCard label="Total de pedidos" value={String(totalPedidos)} />
        <SummaryCard label="Pagos" value={String(pagos.length)} />
        <SummaryCard
          label="Aguardando pagamento"
          value={String(aguardando.length)}
        />
        <SummaryCard label="Cancelados" value={String(cancelados.length)} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SummaryCard
          label="Faturamento (pedidos pagos)"
          value={formatMoney(faturamento, "BRL")}
        />
        <SummaryCard
          label="Ticket médio"
          value={formatMoney(ticketMedio, "BRL")}
          hint="Faturamento ÷ número de pedidos pagos"
        />
      </div>

      {totalPedidos === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
          Nenhum pedido sincronizado ainda. Clique em &quot;Sincronizar
          agora&quot; para importar suas vendas do Mercado Livre.
        </div>
      ) : (
        <div className="mt-8">
          <form className="flex flex-wrap gap-3" method="get">
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Buscar por comprador ou nº do pedido..."
              className="w-72 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            />
            <select
              name="status"
              defaultValue={statusFilter}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Filtrar
            </button>
          </form>

          <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
            <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
              <thead className="bg-slate-50 dark:bg-slate-900">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400">
                    Pedido
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400">
                    Comprador
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400">
                    Itens
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-slate-500 dark:text-slate-400">
                    Valor
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {pedidos.map((pedido) => {
                  const primeiroItem = pedido.itens[0];
                  const outrosItens = pedido.itens.length - 1;
                  return (
                    <tr
                      key={pedido.id}
                      className="bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800/60"
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900 dark:text-white">
                          #{pedido.id}
                        </p>
                        <p className="text-xs text-slate-400">
                          {formatDateTime(pedido.mlDateCreated)}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                        {pedido.buyerNickname ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                        {primeiroItem ? (
                          <>
                            <span className="line-clamp-1 inline-block max-w-xs align-bottom">
                              {primeiroItem.quantity}× {primeiroItem.title}
                            </span>
                            {outrosItens > 0 && (
                              <span className="text-xs text-slate-400">
                                {" "}
                                + {outrosItens} outro(s)
                              </span>
                            )}
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300">
                        {formatMoney(pedido.totalAmount, pedido.currencyId)}
                      </td>
                      <td className="px-4 py-3">
                        <PedidoStatusBadge status={pedido.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {pedidos.length === 200 && (
            <p className="mt-3 text-xs text-slate-400">
              Mostrando os 200 pedidos mais recentes. Use a busca para
              encontrar outros.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
