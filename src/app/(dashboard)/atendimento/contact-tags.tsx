"use client";

import { useState, useTransition } from "react";
import { alternarEtiquetaContatoAction } from "@/lib/actions/whatsapp-actions";

type Etiqueta = { id: string; nome: string; cor: string };

export function ContactTags({
  contatoId,
  etiquetasContato,
  todasEtiquetas,
}: {
  contatoId: string;
  etiquetasContato: Etiqueta[];
  todasEtiquetas: Etiqueta[];
}) {
  const [aberto, setAberto] = useState(false);
  const [isPending, startTransition] = useTransition();
  const idsAtuais = new Set(etiquetasContato.map((e) => e.id));

  function alternar(etiquetaId: string, adicionar: boolean) {
    startTransition(async () => {
      await alternarEtiquetaContatoAction(contatoId, etiquetaId, adicionar);
    });
  }

  return (
    <div className="relative mt-1 flex flex-wrap items-center gap-1">
      {etiquetasContato.map((etiqueta) => (
        <span
          key={etiqueta.id}
          className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
          style={{ backgroundColor: etiqueta.cor }}
        >
          {etiqueta.nome}
        </span>
      ))}

      {todasEtiquetas.length > 0 && (
        <button
          type="button"
          onClick={() => setAberto((a) => !a)}
          className="rounded-full border border-dashed border-slate-300 px-2 py-0.5 text-[10px] text-slate-500 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          + etiqueta
        </button>
      )}

      {aberto && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setAberto(false)} />
          <div className="absolute left-0 top-full z-20 mt-1 w-56 rounded-lg border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-700 dark:bg-[#233138]">
            {todasEtiquetas.map((etiqueta) => {
              const marcada = idsAtuais.has(etiqueta.id);
              return (
                <label
                  key={etiqueta.id}
                  className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-slate-50 dark:hover:bg-[#182229]"
                >
                  <input
                    type="checkbox"
                    checked={marcada}
                    disabled={isPending}
                    onChange={(e) => alternar(etiqueta.id, e.target.checked)}
                  />
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: etiqueta.cor }}
                  />
                  <span className="text-slate-700 dark:text-slate-200">
                    {etiqueta.nome}
                  </span>
                </label>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
