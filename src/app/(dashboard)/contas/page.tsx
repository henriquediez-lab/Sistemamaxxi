import { prisma } from "@/lib/prisma";
import { disconnectMlAccountAction } from "@/lib/actions/ml-actions";

// Sempre reflete o estado atual da conexão com o Mercado Livre.
export const dynamic = "force-dynamic";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export default async function ContasPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const erro = typeof params.erro === "string" ? params.erro : null;
  const sucesso = params.sucesso === "1";

  const account = await prisma.mlAccount.findFirst({
    orderBy: { connectedAt: "asc" },
  });

  const missingCredentials =
    !process.env.ML_CLIENT_ID || !process.env.ML_CLIENT_SECRET;

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
        Conta Mercado Livre
      </h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Conecte a conta do Mercado Livre para começar a sincronizar seus
        anúncios.
      </p>

      {erro && (
        <div className="mt-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {erro}
        </div>
      )}
      {sucesso && (
        <div className="mt-6 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
          Conta conectada com sucesso!
        </div>
      )}

      {missingCredentials && (
        <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          As credenciais do aplicativo do Mercado Livre (ML_CLIENT_ID e
          ML_CLIENT_SECRET) ainda não foram configuradas no arquivo{" "}
          <code>.env</code>. Veja o README para o passo a passo.
        </div>
      )}

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        {account ? (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Conta conectada
              </p>
              <p className="text-lg font-semibold text-slate-900 dark:text-white">
                {account.nickname ?? account.sellerId}
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                ID do vendedor: {account.sellerId} · Site: {account.siteId}
              </p>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Conectada em {formatDate(account.connectedAt)}
            </p>
            <form action={disconnectMlAccountAction.bind(null, account.id)}>
              <button
                type="submit"
                className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
              >
                Desconectar conta
              </button>
            </form>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Nenhuma conta conectada ainda.
            </p>
            <a
              href="/api/ml/oauth/start"
              aria-disabled={missingCredentials}
              className="mt-4 inline-block rounded-lg bg-yellow-400 px-5 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-yellow-300 aria-disabled:pointer-events-none aria-disabled:opacity-50"
            >
              Conectar conta do Mercado Livre
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
