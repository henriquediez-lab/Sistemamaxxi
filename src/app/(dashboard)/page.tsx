import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { SyncButton } from "./sync-button";
import { StatusBadge } from "./status-badge";

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

export default async function AnunciosPage({
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
          anúncios aqui.
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

  const allAnuncios = await prisma.anuncio.findMany({
    where: { mlAccountId: account.id },
    select: { price: true, availableQuantity: true, status: true },
  });

  const totalAnuncios = allAnuncios.length;
  const ativos = allAnuncios.filter((a) => a.status === "active").length;
  const pausados = allAnuncios.filter((a) => a.status === "paused").length;
  const semEstoque = allAnuncios.filter(
    (a) => a.status === "active" && a.availableQuantity === 0
  ).length;
  const valorEmEstoque = allAnuncios
    .filter((a) => a.status === "active")
    .reduce((sum, a) => sum + a.price * a.availableQuantity, 0);

  const lastSync = await prisma.syncLog.findFirst({
    where: { mlAccountId: account.id, status: "concluido" },
    orderBy: { finishedAt: "desc" },
  });

  const anuncios = await prisma.anuncio.findMany({
    where: {
      mlAccountId: account.id,
      ...(statusFilter !== "todos" ? { status: statusFilter } : {}),
      ...(q ? { title: { contains: q } } : {}),
    },
    orderBy: { mlLastUpdated: "desc" },
    take: 200,
  });

  const statusOptions = [
    { value: "todos", label: "Todos os status" },
    { value: "active", label: "Ativos" },
    { value: "paused", label: "Pausados" },
    { value: "closed", label: "Encerrados" },
  ];

  return (
    <div className="px-6 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
            Anúncios
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Conta: {account.nickname ?? account.sellerId}
            {lastSync?.finishedAt && (
              <> · Última sincronização: {formatDateTime(lastSync.finishedAt)}</>
            )}
          </p>
        </div>
        <SyncButton mlAccountId={account.id} />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <SummaryCard label="Total de anúncios" value={String(totalAnuncios)} />
        <SummaryCard label="Ativos" value={String(ativos)} />
        <SummaryCard label="Pausados" value={String(pausados)} />
        <SummaryCard
          label="Ativos sem estoque"
          value={String(semEstoque)}
          hint={semEstoque > 0 ? "Precisam de reposição" : undefined}
        />
      </div>

      <div className="mt-4">
        <SummaryCard
          label="Valor em estoque (anúncios ativos)"
          value={formatMoney(valorEmEstoque, "BRL")}
          hint="Preço de venda × quantidade disponível"
        />
      </div>

      {totalAnuncios === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
          Nenhum anúncio sincronizado ainda. Clique em &quot;Sincronizar
          agora&quot; para importar seus anúncios do Mercado Livre.
        </div>
      ) : (
        <div className="mt-8">
          <form className="flex flex-wrap gap-3" method="get">
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Buscar por título..."
              className="w-64 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
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
                    Anúncio
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-slate-500 dark:text-slate-400">
                    Preço
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-slate-500 dark:text-slate-400">
                    Estoque
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-slate-500 dark:text-slate-400">
                    Vendidos
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {anuncios.map((anuncio) => (
                  <tr
                    key={anuncio.id}
                    className="bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800/60"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {anuncio.thumbnail && (
                          <Image
                            src={anuncio.thumbnail}
                            alt=""
                            width={40}
                            height={40}
                            unoptimized
                            className="h-10 w-10 rounded-lg object-cover"
                          />
                        )}
                        <div>
                          {anuncio.permalink ? (
                            <a
                              href={anuncio.permalink}
                              target="_blank"
                              rel="noreferrer"
                              className="line-clamp-1 max-w-xs font-medium text-slate-900 hover:underline dark:text-white"
                            >
                              {anuncio.title}
                            </a>
                          ) : (
                            <span className="line-clamp-1 max-w-xs font-medium text-slate-900 dark:text-white">
                              {anuncio.title}
                            </span>
                          )}
                          <p className="text-xs text-slate-400">{anuncio.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300">
                      {formatMoney(anuncio.price, anuncio.currencyId)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300">
                      {anuncio.availableQuantity}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300">
                      {anuncio.soldQuantity}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={anuncio.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {anuncios.length === 200 && (
            <p className="mt-3 text-xs text-slate-400">
              Mostrando os 200 anúncios mais recentes. Use a busca para
              encontrar outros.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
