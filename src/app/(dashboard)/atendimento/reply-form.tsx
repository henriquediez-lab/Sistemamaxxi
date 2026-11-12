"use client";

import { useRef, useState, useTransition } from "react";
import { enviarMensagemWhatsappAction } from "@/lib/actions/whatsapp-actions";

export type MensagemCitavel = {
  id: string;
  texto: string | null;
  tipo: string;
  direcao: string;
};

const RESUMO_TIPO: Record<string, string> = {
  imagem: "📷 Foto",
  video: "🎥 Vídeo",
  audio: "🎵 Áudio",
  documento: "📄 Documento",
};

function resumoMensagem(msg: MensagemCitavel): string {
  if (msg.texto) return msg.texto;
  return RESUMO_TIPO[msg.tipo] ?? "Mensagem";
}

export function ReplyForm({
  contatoId,
  mensagemCitada,
  onCancelarCitacao,
}: {
  contatoId: string;
  mensagemCitada: MensagemCitavel | null;
  onCancelarCitacao: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [nomeArquivo, setNomeArquivo] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const arquivoRef = useRef<HTMLInputElement>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const texto = textareaRef.current?.value.trim() ?? "";
    const temArquivo = (arquivoRef.current?.files?.length ?? 0) > 0;
    if (!texto && !temArquivo) return;

    const formData = new FormData(e.currentTarget);
    formData.set("contatoId", contatoId);
    if (mensagemCitada) formData.set("respondendoAId", mensagemCitada.id);

    setErro(null);
    startTransition(async () => {
      const resultado = await enviarMensagemWhatsappAction(formData);
      if (resultado.ok) {
        formRef.current?.reset();
        setNomeArquivo(null);
        onCancelarCitacao();
      } else {
        setErro(resultado.error);
      }
    });
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="border-t border-slate-200 p-4 dark:border-slate-800"
    >
      {mensagemCitada && (
        <div className="mb-2 flex items-start justify-between gap-2 rounded-lg border-l-4 border-yellow-400 bg-slate-50 px-3 py-2 text-xs dark:bg-slate-800">
          <div className="min-w-0">
            <p className="font-medium text-slate-500 dark:text-slate-400">
              Respondendo
            </p>
            <p className="truncate text-slate-700 dark:text-slate-300">
              {resumoMensagem(mensagemCitada)}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancelarCitacao}
            className="shrink-0 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            ✕
          </button>
        </div>
      )}

      {erro && (
        <p className="mb-2 text-xs text-red-600 dark:text-red-400">{erro}</p>
      )}
      {nomeArquivo && (
        <div className="mb-2 flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-1.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          <span className="truncate">📎 {nomeArquivo}</span>
          <button
            type="button"
            onClick={() => {
              if (arquivoRef.current) arquivoRef.current.value = "";
              setNomeArquivo(null);
            }}
            className="shrink-0 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            ✕
          </button>
        </div>
      )}

      <div className="flex items-end gap-2">
        <input
          ref={arquivoRef}
          type="file"
          name="arquivo"
          className="hidden"
          onChange={(e) => setNomeArquivo(e.target.files?.[0]?.name ?? null)}
        />
        <button
          type="button"
          title="Anexar arquivo"
          disabled={isPending}
          onClick={() => arquivoRef.current?.click()}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          📎
        </button>
        <textarea
          ref={textareaRef}
          name="texto"
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
