"use client";

import { useState } from "react";
import { ReplyForm, type MensagemCitavel } from "./reply-form";

export type MensagemThread = {
  id: string;
  direcao: string;
  tipo: string;
  texto: string | null;
  midiaUrl: string | null;
  midiaMimetype: string | null;
  midiaNomeArquivo: string | null;
  automatica: boolean;
  enviadoPor: string | null;
  erro: string | null;
  createdAtFormatado: string;
  respondendoA: MensagemCitavel | null;
};

const RESUMO_TIPO: Record<string, string> = {
  imagem: "📷 Foto",
  video: "🎥 Vídeo",
  audio: "🎵 Áudio",
  documento: "📄 Documento",
};

function QuotePreview({ mensagem }: { mensagem: MensagemCitavel }) {
  return (
    <div className="mb-1.5 rounded border-l-4 border-[#06cf9c] bg-black/5 px-2 py-1 text-xs text-slate-600 dark:bg-black/20 dark:text-slate-300">
      <p className="truncate">
        {mensagem.texto || RESUMO_TIPO[mensagem.tipo] || "Mensagem"}
      </p>
    </div>
  );
}

function MediaLightbox({
  url,
  nome,
  onFechar,
}: {
  url: string;
  nome?: string | null;
  onFechar: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6"
      onClick={onFechar}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={nome ?? "Imagem ampliada"}
        className="max-h-full max-w-full rounded-lg object-contain"
        onClick={(e) => e.stopPropagation()}
      />
      <div className="absolute right-6 top-6 flex gap-2">
        <a
          href={url}
          download={nome ?? undefined}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
          title="Baixar"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
        >
          ⬇
        </a>
        <button
          type="button"
          onClick={onFechar}
          title="Fechar"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

function ConteudoMensagem({
  mensagem,
  onAbrirImagem,
}: {
  mensagem: MensagemThread;
  onAbrirImagem: (url: string) => void;
}) {
  switch (mensagem.tipo) {
    case "imagem":
      return (
        <div>
          {mensagem.midiaUrl && (
            <button
              type="button"
              onClick={() => onAbrirImagem(mensagem.midiaUrl!)}
              className="block cursor-zoom-in"
              title="Clique para ampliar"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={mensagem.midiaUrl}
                alt="Imagem enviada"
                className="max-h-72 rounded-lg object-cover"
              />
            </button>
          )}
          {mensagem.texto && (
            <p className="mt-1 whitespace-pre-wrap">{mensagem.texto}</p>
          )}
        </div>
      );
    case "video":
      return (
        <div>
          {mensagem.midiaUrl && (
            <video
              src={mensagem.midiaUrl}
              controls
              className="max-h-72 rounded-lg"
            />
          )}
          {mensagem.texto && (
            <p className="mt-1 whitespace-pre-wrap">{mensagem.texto}</p>
          )}
          {mensagem.midiaUrl && (
            <a
              href={mensagem.midiaUrl}
              download
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-block text-xs underline opacity-70 hover:opacity-100"
            >
              ⬇ Baixar vídeo
            </a>
          )}
        </div>
      );
    case "audio":
      return mensagem.midiaUrl ? (
        <audio src={mensagem.midiaUrl} controls className="max-w-full" />
      ) : (
        <p className="italic text-slate-400">Áudio indisponível</p>
      );
    case "documento":
      return mensagem.midiaUrl ? (
        <a
          href={mensagem.midiaUrl}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 underline"
        >
          📄 {mensagem.midiaNomeArquivo ?? "Documento"}
        </a>
      ) : (
        <p className="italic text-slate-400">Documento indisponível</p>
      );
    default:
      return <p className="whitespace-pre-wrap">{mensagem.texto}</p>;
  }
}

export function ThreadPanel({
  contatoId,
  mensagens,
  respostasRapidas,
}: {
  contatoId: string;
  mensagens: MensagemThread[];
  respostasRapidas: { atalho: string; texto: string }[];
}) {
  const [mensagemCitada, setMensagemCitada] = useState<MensagemCitavel | null>(null);
  const [imagemAberta, setImagemAberta] = useState<string | null>(null);

  return (
    <>
      {imagemAberta && (
        <MediaLightbox url={imagemAberta} onFechar={() => setImagemAberta(null)} />
      )}
      <div className="flex-1 space-y-2 overflow-y-auto p-5">
        {mensagens.map((mensagem) => {
          const minha = mensagem.direcao === "saida";
          return (
            <div
              key={mensagem.id}
              className={`group flex items-center gap-1 ${minha ? "justify-end" : "justify-start"}`}
            >
              {!minha && (
                <button
                  type="button"
                  onClick={() =>
                    setMensagemCitada({
                      id: mensagem.id,
                      texto: mensagem.texto,
                      tipo: mensagem.tipo,
                      direcao: mensagem.direcao,
                    })
                  }
                  title="Responder citando"
                  className="shrink-0 rounded-full bg-white/70 px-1.5 py-1 text-xs text-slate-500 opacity-0 shadow-sm transition hover:bg-white group-hover:opacity-100 dark:bg-slate-800/70 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  ↩
                </button>
              )}
              <div
                className={`max-w-md rounded-lg px-3 py-2 text-sm shadow-sm ${
                  minha
                    ? "rounded-tr-none bg-[#d9fdd3] text-slate-900 dark:bg-[#005c4b] dark:text-slate-50"
                    : "rounded-tl-none bg-white text-slate-800 dark:bg-[#202c33] dark:text-slate-100"
                }`}
              >
                {mensagem.respondendoA && (
                  <QuotePreview mensagem={mensagem.respondendoA} />
                )}
                <ConteudoMensagem
                  mensagem={mensagem}
                  onAbrirImagem={setImagemAberta}
                />
                <p
                  className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${
                    mensagem.erro
                      ? "text-red-600 dark:text-red-400"
                      : minha
                        ? "text-slate-600 dark:text-slate-300"
                        : "text-slate-400"
                  }`}
                >
                  {mensagem.automatica && "automática · "}
                  {mensagem.enviadoPor &&
                    mensagem.enviadoPor !== "celular" &&
                    `${mensagem.enviadoPor} · `}
                  {mensagem.createdAtFormatado}
                  {mensagem.erro
                    ? " · falhou"
                    : minha && (
                        <span className="text-[#53bdeb]">✓✓</span>
                      )}
                </p>
              </div>
              {minha && (
                <button
                  type="button"
                  onClick={() =>
                    setMensagemCitada({
                      id: mensagem.id,
                      texto: mensagem.texto,
                      tipo: mensagem.tipo,
                      direcao: mensagem.direcao,
                    })
                  }
                  title="Responder citando"
                  className="shrink-0 rounded-full bg-white/70 px-1.5 py-1 text-xs text-slate-500 opacity-0 shadow-sm transition hover:bg-white group-hover:opacity-100 dark:bg-slate-800/70 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  ↩
                </button>
              )}
            </div>
          );
        })}
      </div>

      <ReplyForm
        contatoId={contatoId}
        mensagemCitada={mensagemCitada}
        onCancelarCitacao={() => setMensagemCitada(null)}
        respostasRapidas={respostasRapidas}
      />
    </>
  );
}
