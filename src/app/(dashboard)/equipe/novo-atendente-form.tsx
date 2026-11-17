"use client";

import { useRef, useState, useTransition } from "react";
import { criarAtendenteAction } from "@/lib/actions/equipe-actions";

export function NovoAtendenteForm() {
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setErro(null);
    startTransition(async () => {
      const resultado = await criarAtendenteAction(formData);
      if (resultado.ok) {
        formRef.current?.reset();
      } else {
        setErro(resultado.error);
      }
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="mt-3 space-y-3">
      {erro && (
        <p className="text-xs text-red-600 dark:text-red-400">{erro}</p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Nome
          </label>
          <input
            type="text"
            name="name"
            required
            placeholder="ex: Maria Silva"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-200 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
            E-mail de login
          </label>
          <input
            type="email"
            name="email"
            required
            placeholder="maria@maxxitacos.com.br"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-200 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Senha inicial
          </label>
          <input
            type="password"
            name="password"
            required
            minLength={8}
            placeholder="mínimo 8 caracteres"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-200 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Acesso
          </label>
          <select
            name="role"
            defaultValue="atendente"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-200 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          >
            <option value="atendente">Atendente</option>
            <option value="admin">Administrador</option>
          </select>
        </div>
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-yellow-400 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Criando..." : "Criar conta"}
      </button>
    </form>
  );
}
