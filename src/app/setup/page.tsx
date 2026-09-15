import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SetupForm } from "./setup-form";

// Esta página consulta o banco a cada acesso (para saber se o primeiro
// usuário já existe); nunca pode ser pré-gerada em tempo de build.
export const dynamic = "force-dynamic";

export default async function SetupPage() {
  const userCount = await prisma.user.count();
  if (userCount > 0) {
    redirect("/login");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-6 text-center">
          <h1 className="text-lg font-semibold text-slate-900 dark:text-white">
            Bem-vindo!
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Crie a primeira conta de acesso ao painel de gestão do Mercado
            Livre.
          </p>
        </div>
        <SetupForm />
      </div>
    </main>
  );
}
