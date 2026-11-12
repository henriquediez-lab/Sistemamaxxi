"use client";

import { useRef, useState, useTransition } from "react";
import { enviarMensagemWhatsappAction } from "@/lib/actions/whatsapp-actions";
import { EmojiPicker } from "./emoji-picker";

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

type RespostaRapida = { atalho: string; texto: string };

export function ReplyForm({
  contatoId,
  mensagemCitada,
  onCancelarCitacao,
  respostasRapidas,
}: {
  contatoId: string;
  mensagemCitada: MensagemCitavel | null;
  onCancelarCitacao: () => void;
  respostasRapidas: RespostaRapida[];
}) {
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [nomeArquivo, setNomeArquivo] = useState<string | null>(null);
  const [sugestoes, setSugestoes] = useState<RespostaRapida[] | null>(null);
  const [sugestaoIndex, setSugestaoIndex] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const arquivoRef = useRef<HTMLInputElement>(null);
  const comandoRef = useRef<{ inicio: number; fim: number } | null>(null);

  function selecionarSugestao(resposta: RespostaRapida) {
    const textarea = textareaRef.current;
    if (!textarea || !comandoRef.current) return;
    const { inicio, fim } = comandoRef.current;
    textarea.value =
      textarea.value.slice(0, inicio) + resposta.texto + textarea.value.slice(fim);
    const novaPosicao = inicio + resposta.texto.length;
    textarea.focus();
    textarea.setSelectionRange(novaPosicao, novaPosicao);
    setSugestoes(null);
    comandoRef.current = null;
  }

  function handleInput(e: React.FormEvent<HTMLTextAreaElement>) {
    if (respostasRapidas.length === 0) return;
    const textarea = e.currentTarget;
    const posicaoCursor = textarea.selectionStart;
    const antesDoCursor = textarea.value.slice(0, posicaoCursor);
    const match = antesDoCursor.match(/(?:^|\s)\/(\w*)$/);
    if (!match) {
      setSugestoes(null);
      comandoRef.current = null;
      return;
    }
    const fragmento = match[1].toLowerCase();
    const inicio = posicaoCursor - 1 - match[1].length;
    const filtradas = respostasRapidas.filter((r) =>
      r.atalho.toLowerCase().startsWith(fragmento)
    );
    if (filtradas.length === 0) {
      setSugestoes(null);
      comandoRef.current = null;
      return;
    }
    comandoRef.current = { inicio, fim: posicaoCursor };
    setSugestoes(filtradas);
    setSugestaoIndex(0);
  }

  function inserirEmoji(emoji: string) {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const inicio = textarea.selectionStart ?? textarea.value.length;
    const fim = textarea.selectionEnd ?? textarea.value.length;
    textarea.value = textarea.value.slice(0, inicio) + emoji + textarea.value.slice(fim);
    const novaPosicao = inicio + emoji.length;
    textarea.focus();
    textarea.setSelectionRange(novaPosicao, novaPosicao);
  }

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
        setSugestoes(null);
        comandoRef.current = null;
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
      className="border-t border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-[#111b21]"
    >
      {mensagemCitada && (
        <div className="mb-2 flex items-start justify-between gap-2 rounded-lg border-l-4 border-[#06cf9c] bg-[#f0f2f5] px-3 py-2 text-xs dark:bg-[#202c33]">
          <div className="min-w-0">
            <p className="font-medium text-[#008069] dark:text-[#06cf9c]">
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
      {sugestoes && (
        <div className="mb-2 max-h-40 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-[#233138]">
          {sugestoes.map((sugestao, i) => (
            <button
              key={sugestao.atalho}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                selecionarSugestao(sugestao);
              }}
              className={`block w-full px-3 py-2 text-left text-xs ${
                i === sugestaoIndex
                  ? "bg-[#f0f2f5] dark:bg-[#182229]"
                  : "hover:bg-[#f5f6f6] dark:hover:bg-[#182229]"
              }`}
            >
              <span className="font-semibold text-[#008069] dark:text-[#06cf9c]">
                /{sugestao.atalho}
              </span>{" "}
              <span className="text-slate-500 dark:text-slate-400">
                {sugestao.texto}
              </span>
            </button>
          ))}
        </div>
      )}
      {nomeArquivo && (
        <div className="mb-2 flex items-center justify-between gap-2 rounded-lg bg-[#f0f2f5] px-3 py-1.5 text-xs text-slate-600 dark:bg-[#202c33] dark:text-slate-300">
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
        <EmojiPicker onSelecionar={inserirEmoji} />
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
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xl text-slate-500 transition hover:bg-[#f0f2f5] disabled:cursor-not-allowed disabled:opacity-60 dark:text-slate-300 dark:hover:bg-[#202c33]"
        >
          📎
        </button>
        <textarea
          ref={textareaRef}
          name="texto"
          rows={1}
          placeholder="Digite uma mensagem"
          disabled={isPending}
          onInput={handleInput}
          onKeyDown={(e) => {
            if (sugestoes && sugestoes.length > 0) {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setSugestaoIndex((i) => (i + 1) % sugestoes.length);
                return;
              }
              if (e.key === "ArrowUp") {
                e.preventDefault();
                setSugestaoIndex((i) => (i - 1 + sugestoes.length) % sugestoes.length);
                return;
              }
              if (e.key === "Enter" || e.key === "Tab") {
                e.preventDefault();
                selecionarSugestao(sugestoes[sugestaoIndex]);
                return;
              }
              if (e.key === "Escape") {
                setSugestoes(null);
                comandoRef.current = null;
                return;
              }
            }
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
          className="max-h-32 flex-1 resize-none rounded-lg bg-[#f0f2f5] px-4 py-2.5 text-sm outline-none placeholder:text-slate-500 focus:ring-2 focus:ring-[#25d366]/40 dark:bg-[#202c33] dark:text-white dark:placeholder:text-slate-400"
        />
        <button
          type="submit"
          disabled={isPending}
          title="Enviar"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#00a884] text-white transition hover:bg-[#06cf9c] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? (
            <span className="text-xs">...</span>
          ) : (
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M2.01 21 23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          )}
        </button>
      </div>
    </form>
  );
}
