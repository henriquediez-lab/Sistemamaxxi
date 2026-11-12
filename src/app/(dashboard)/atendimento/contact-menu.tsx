"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  arquivarContatoAction,
  excluirContatoAction,
} from "@/lib/actions/whatsapp-actions";

export function ContactMenu({
  contatoId,
  arquivada,
}: {
  contatoId: string;
  arquivada: boolean;
}) {
  const [aberto, setAberto] = useState(false);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function fechar() {
    setAberto(false);
    setConfirmandoExclusao(false);
  }

  function arquivar() {
    startTransition(async () => {
      await arquivarContatoAction(contatoId, !arquivada);
      fechar();
      router.push("/atendimento");
    });
  }

  function excluir() {
    startTransition(async () => {
      await excluirContatoAction(contatoId);
      fechar();
      router.push("/atendimento");
    });
  }

  return (
    <div className="relative ml-auto">
      <button
        type="button"
        onClick={() => setAberto((a) => !a)}
        title="Mais opções"
        className="flex h-9 w-9 items-center justify-center rounded-full text-xl text-slate-500 transition hover:bg-[#f0f2f5] dark:text-slate-300 dark:hover:bg-[#202c33]"
      >
        ⋮
      </button>

      {aberto && (
        <>
          <div className="fixed inset-0 z-10" onClick={fechar} />
          <div className="absolute right-0 top-full z-20 mt-1 w-56 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 text-sm shadow-lg dark:border-slate-700 dark:bg-[#233138]">
            {!confirmandoExclusao ? (
              <>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={arquivar}
                  className="block w-full px-4 py-2 text-left text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:text-slate-200 dark:hover:bg-[#182229]"
                >
                  {arquivada ? "Desarquivar conversa" : "Arquivar conversa"}
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => setConfirmandoExclusao(true)}
                  className="block w-full px-4 py-2 text-left text-red-600 hover:bg-red-50 disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-950"
                >
                  Excluir conversa
                </button>
              </>
            ) : (
              <div className="px-4 py-3">
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Apagar essa conversa inteira? Não dá pra desfazer (o
                  WhatsApp de verdade não é afetado).
                </p>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={excluir}
                    className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                  >
                    {isPending ? "Excluindo..." : "Sim, excluir"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmandoExclusao(false)}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
