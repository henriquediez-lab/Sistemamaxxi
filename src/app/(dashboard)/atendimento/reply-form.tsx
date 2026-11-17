"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { enviarMensagemWhatsappAction } from "@/lib/actions/whatsapp-actions";
import { EmojiPicker } from "./emoji-picker";

function formatarTempo(segundos: number): string {
  const min = Math.floor(segundos / 60);
  const seg = segundos % 60;
  return `${min}:${seg.toString().padStart(2, "0")}`;
}

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
  const [gravando, setGravando] = useState(false);
  const [tempoGravacao, setTempoGravacao] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const arquivoRef = useRef<HTMLInputElement>(null);
  const comandoRef = useRef<{ inicio: number; fim: number } | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function pararMidiaGravacao() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    mediaRecorderRef.current = null;
    streamRef.current = null;
    chunksRef.current = [];
  }

  // Se o atendente trocar de conversa (ou saír da tela) no meio de uma
  // gravação, cancela e libera o microfone em vez de deixar aberto.
  useEffect(() => {
    return () => {
      pararMidiaGravacao();
    };
  }, [contatoId]);

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

  function enviarDados(formData: FormData) {
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

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const texto = textareaRef.current?.value.trim() ?? "";
    const temArquivo = (arquivoRef.current?.files?.length ?? 0) > 0;
    if (!texto && !temArquivo) return;

    enviarDados(new FormData(e.currentTarget));
  }

  async function iniciarGravacao() {
    if (isPending || gravando) return;
    if (typeof MediaRecorder === "undefined") {
      setErro("Seu navegador não suporta gravação de áudio.");
      return;
    }
    setErro(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      streamRef.current = stream;
      mediaRecorderRef.current = recorder;
      recorder.start();
      setGravando(true);
      setTempoGravacao(0);
      timerRef.current = setInterval(() => setTempoGravacao((t) => t + 1), 1000);
    } catch {
      setErro("Não foi possível acessar o microfone. Verifique a permissão do navegador.");
    }
  }

  function cancelarGravacao() {
    pararMidiaGravacao();
    setGravando(false);
    setTempoGravacao(0);
  }

  function finalizarGravacao(): Promise<Blob> {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;
      const tipo = recorder?.mimeType || "audio/webm";
      if (!recorder) {
        resolve(new Blob());
        return;
      }
      recorder.onstop = () => {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        resolve(new Blob(chunksRef.current, { type: tipo }));
      };
      recorder.stop();
    });
  }

  async function pararEEnviarGravacao() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const blob = await finalizarGravacao();
    mediaRecorderRef.current = null;
    streamRef.current = null;
    chunksRef.current = [];
    setGravando(false);
    setTempoGravacao(0);
    if (blob.size === 0) return;

    const extensao = blob.type.includes("ogg") ? "ogg" : "webm";
    const arquivo = new File([blob], `audio-${Date.now()}.${extensao}`, {
      type: blob.type || "audio/webm",
    });
    const formData = new FormData();
    formData.append("arquivo", arquivo);
    formData.append("ptt", "1");
    enviarDados(formData);
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
        {gravando ? (
          <div className="flex h-10 flex-1 items-center gap-3 rounded-full bg-[#f0f2f5] px-4 dark:bg-[#202c33]">
            <button
              type="button"
              title="Cancelar gravação"
              onClick={cancelarGravacao}
              className="text-lg text-red-500 transition hover:text-red-700"
            >
              🗑️
            </button>
            <span className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
              {formatarTempo(tempoGravacao)}
            </span>
            <span className="flex-1 text-xs text-slate-400">Gravando áudio...</span>
            <button
              type="button"
              title="Enviar áudio"
              onClick={pararEEnviarGravacao}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#00a884] text-white transition hover:bg-[#06cf9c]"
            >
              ✓
            </button>
          </div>
        ) : (
          <>
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
              type="button"
              title="Gravar áudio"
              disabled={isPending}
              onClick={iniciarGravacao}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xl text-slate-500 transition hover:bg-[#f0f2f5] disabled:cursor-not-allowed disabled:opacity-60 dark:text-slate-300 dark:hover:bg-[#202c33]"
            >
              🎤
            </button>
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
          </>
        )}
      </div>
    </form>
  );
}
