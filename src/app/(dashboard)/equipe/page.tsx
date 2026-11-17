import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { formatDateTimeBR } from "@/lib/format-date";
import { NovoAtendenteForm } from "./novo-atendente-form";
import { UsuarioRow } from "./usuario-row";

// Sempre reflete a lista atual de contas (ativar/desativar precisa valer na hora).
export const dynamic = "force-dynamic";

export default async function EquipePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/");

  const usuarios = await prisma.user.findMany({
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
  });

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
        Equipe
      </h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Cada pessoa com login próprio aparece separada no histórico de
        atendimento (quem respondeu o quê). Administradores podem gerenciar a
        equipe; atendentes só usam o painel no dia a dia.
      </p>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          Adicionar pessoa
        </h2>
        <NovoAtendenteForm />
      </div>

      <div className="mt-6 space-y-3">
        {usuarios.map((usuario) => (
          <UsuarioRow
            key={usuario.id}
            usuario={{
              id: usuario.id,
              name: usuario.name,
              email: usuario.email,
              role: usuario.role,
              ativo: usuario.ativo,
              criadoEm: formatDateTimeBR(usuario.createdAt),
            }}
            souEu={usuario.id === user.userId}
          />
        ))}
      </div>
    </div>
  );
}
