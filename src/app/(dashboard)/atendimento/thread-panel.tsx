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
    <div className="mb-1.5 rounded border-l-2 border-slate-400/60 bg-black/5 px-2 py-1 text-xs text-slate-600 dark:bg-white/10 dark:text-slate-300">
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
}: {
  contatoId: string;
  mensagens: MensagemThread[];
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
                  className="shrink-0 rounded px-1.5 py-1 text-xs text-slate-400 opacity-0 transition hover:bg-slate-100 group-hover:opacity-100 dark:hover:bg-slate-800"
                >
                  ↩
                </button>
              )}
              <div
                className={`max-w-md rounded-2xl px-4 py-2 text-sm ${
                  minha
                    ? "bg-yellow-400 text-slate-900"
                    : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100"
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
                  className={`mt-1 text-[10px] ${
                    minha ? "text-slate-700" : "text-slate-400"
                  }`}
                >
                  {mensagem.createdAtFormatado}
                  {mensagem.automatica && " · automática"}
                  {mensagem.enviadoPor &&
                    mensagem.enviadoPor !== "celular" &&
                    ` · ${mensagem.enviadoPor}`}
                  {mensagem.erro && " · falhou ao enviar"}
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
                  className="shrink-0 rounded px-1.5 py-1 text-xs text-slate-400 opacity-0 transition hover:bg-slate-100 group-hover:opacity-100 dark:hover:bg-slate-800"
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
      />
    </>
  );
}
