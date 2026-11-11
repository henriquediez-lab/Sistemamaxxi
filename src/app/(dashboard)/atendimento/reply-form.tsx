"use client";

import { useRef, useState, useTransition } from "react";
import { enviarMensagemWhatsappAction } from "@/lib/actions/whatsapp-actions";

export function ReplyForm({ contatoId }: { contatoId: string }) {
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const texto = textareaRef.current?.value.trim() ?? "";
    if (!texto) return;

    setErro(null);
    startTransition(async () => {
      const resultado = await enviarMensagemWhatsappAction(contatoId, texto);
      if (resultado.ok) {
        if (textareaRef.current) textareaRef.current.value = "";
      } else {
        setErro(resultado.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="border-t border-slate-200 p-4 dark:border-slate-800">
      {erro && (
        <p className="mb-2 text-xs text-red-600 dark:text-red-400">{erro}</p>
      )}
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          rows={2}
          placeholder="Digite sua resposta..."
          disabled={isPending}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
          className="flex-1 resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
        />
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-yellow-400 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Enviando..." : "Enviar"}
        </button>
      </div>
    </form>
  );
}
