"use client";

import { useState, useTransition } from "react";
import { limparTodasConversasAction } from "@/lib/actions/whatsapp-actions";

export function ClearAllButton({ totalContatos }: { totalContatos: number }) {
  const [confirmando, setConfirmando] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (totalContatos === 0) return null;

  if (!confirmando) {
    return (
      <button
        type="button"
        onClick={() => setConfirmando(true)}
        className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
      >
        Limpar todas as conversas
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs dark:border-red-900 dark:bg-red-950">
      <span className="text-red-700 dark:text-red-300">
        Apagar os {totalContatos} contatos e todas as mensagens? Não dá pra
        desfazer (o WhatsApp de verdade não é afetado).
      </span>
      <button
        type="button"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            await limparTodasConversasAction();
            setConfirmando(false);
          })
        }
        className="shrink-0 rounded-lg bg-red-600 px-3 py-1.5 font-semibold text-white hover:bg-red-700 disabled:opacity-60"
      >
        {isPending ? "Apagando..." : "Sim, apagar tudo"}
      </button>
      <button
        type="button"
        onClick={() => setConfirmando(false)}
        className="shrink-0 rounded-lg border border-slate-300 px-3 py-1.5 text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        Cancelar
      </button>
    </div>
  );
}
