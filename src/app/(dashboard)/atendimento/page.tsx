import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDateTimeBR } from "@/lib/format-date";
import { getWorkerStatus } from "@/lib/whatsapp-worker";
import { StatusRefresh } from "./status-refresh";
import { ThreadPanel, type MensagemThread } from "./thread-panel";
import { QrImage } from "./qr-image";

function Avatar({
  fotoUrl,
  nome,
  tamanho = 40,
}: {
  fotoUrl: string | null | undefined;
  nome: string;
  tamanho?: number;
}) {
  if (fotoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={fotoUrl}
        alt={nome}
        width={tamanho}
        height={tamanho}
        className="shrink-0 rounded-full object-cover"
        style={{ width: tamanho, height: tamanho }}
      />
    );
  }
  const inicial = nome.trim().charAt(0).toUpperCase() || "?";
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full bg-slate-200 font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-300"
      style={{ width: tamanho, height: tamanho, fontSize: tamanho / 2.2 }}
    >
      {inicial}
    </div>
  );
}

// Sempre reflete o estado atual das conversas e da conexão com o WhatsApp.
export const dynamic = "force-dynamic";

const STATUS_INFO: Record<
  string,
  { label: string; color: string }
> = {
  conectado: { label: "WhatsApp conectado", color: "bg-green-500" },
  aguardando_qr: { label: "Aguardando pareamento", color: "bg-amber-500" },
  conectando: { label: "Conectando...", color: "bg-amber-500" },
  desconectado: { label: "WhatsApp desconectado", color: "bg-red-500" },
  nao_configurado: { label: "WhatsApp não configurado", color: "bg-slate-400" },
};

export default async function AtendimentoPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const selectedContatoId =
    typeof params.contato === "string" ? params.contato : null;

  const status = await getWorkerStatus();
  const statusInfo = STATUS_INFO[status] ?? STATUS_INFO.desconectado;

  const contatos = await prisma.whatsappContato.findMany({
    orderBy: { ultimaMensagemEm: "desc" },
    take: 100,
  });

  let selectedContato = selectedContatoId
    ? contatos.find((c) => c.id === selectedContatoId) ?? null
    : null;
  if (!selectedContato && selectedContatoId) {
    selectedContato = await prisma.whatsappContato.findUnique({
      where: { id: selectedContatoId },
    });
  }

  let mensagens: MensagemThread[] = [];
  if (selectedContato) {
    if (selectedContato.naoLida) {
      await prisma.whatsappContato.update({
        where: { id: selectedContato.id },
        data: { naoLida: false },
      });
    }
    const mensagensDb = await prisma.whatsappMensagem.findMany({
      where: { contatoId: selectedContato.id },
      orderBy: { createdAt: "asc" },
      take: 300,
      include: { respondendoA: true },
    });
    mensagens = mensagensDb.map((mensagem) => ({
      id: mensagem.id,
      direcao: mensagem.direcao,
      tipo: mensagem.tipo,
      texto: mensagem.texto,
      midiaUrl: mensagem.midiaUrl,
      midiaMimetype: mensagem.midiaMimetype,
      midiaNomeArquivo: mensagem.midiaNomeArquivo,
      automatica: mensagem.automatica,
      enviadoPor: mensagem.enviadoPor,
      erro: mensagem.erro,
      createdAtFormatado: formatDateTimeBR(mensagem.createdAt),
      respondendoA: mensagem.respondendoA
        ? {
            id: mensagem.respondendoA.id,
            texto: mensagem.respondendoA.texto,
            tipo: mensagem.respondendoA.tipo,
            direcao: mensagem.respondendoA.direcao,
          }
        : null,
    }));
  }

  return (
    <div className="flex h-screen flex-col">
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
            Atendimento WhatsApp
          </h1>
          <div className="mt-1 flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${statusInfo.color}`} />
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {statusInfo.label}
            </p>
          </div>
        </div>
        <Link
          href="/atendimento/regras"
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          Respostas automáticas
        </Link>
      </div>

      {status === "nao_configurado" && (
        <div className="mx-6 mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          O serviço de WhatsApp ainda não foi configurado neste painel. Peça
          ajuda para configurar as variáveis <code>WHATSAPP_WORKER_URL</code>{" "}
          e <code>WHATSAPP_WORKER_SECRET</code>.
        </div>
      )}

      {(status === "aguardando_qr" ||
        status === "conectando" ||
        status === "desconectado") && <StatusRefresh intervalMs={4000} />}

      {status === "aguardando_qr" ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Escaneie o QR code com o WhatsApp Business do celular
          </p>
          <p className="max-w-md text-xs text-slate-500 dark:text-slate-400">
            No celular: abra o WhatsApp Business → Configurações → Aparelhos
            conectados → Conectar um aparelho, e aponte a câmera para o código
            abaixo.
          </p>
          <QrImage />
          <p className="text-xs text-slate-400">
            O código atualiza automaticamente. Essa página também se atualiza
            sozinha.
          </p>
        </div>
      ) : status === "conectando" || status === "desconectado" ? (
        <div className="flex flex-1 items-center justify-center px-6 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {status === "conectando"
              ? "Conectando ao WhatsApp, aguarde..."
              : "WhatsApp desconectado. Tentando reconectar automaticamente..."}
          </p>
        </div>
      ) : status === "conectado" ? (
        <div className="flex flex-1 overflow-hidden">
          <aside className="w-80 shrink-0 overflow-y-auto border-r border-slate-200 dark:border-slate-800">
            {contatos.length === 0 ? (
              <p className="p-4 text-sm text-slate-500 dark:text-slate-400">
                Nenhuma conversa ainda.
              </p>
            ) : (
              contatos.map((contato) => {
                const ativo = contato.id === selectedContato?.id;
                return (
                  <Link
                    key={contato.id}
                    href={`/atendimento?contato=${contato.id}`}
                    className={`block border-b border-slate-100 px-4 py-3 transition dark:border-slate-800 ${
                      ativo
                        ? "bg-yellow-50 dark:bg-slate-800"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800/60"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar
                        fotoUrl={contato.fotoUrl}
                        nome={contato.nome ?? contato.telefone}
                        tamanho={36}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                            {contato.nome ?? contato.telefone}
                          </p>
                          {contato.naoLida && (
                            <span className="h-2 w-2 shrink-0 rounded-full bg-yellow-500" />
                          )}
                        </div>
                        <div className="mt-0.5 flex items-center gap-2">
                          {contato.setor && (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                              {contato.setor}
                            </span>
                          )}
                          {contato.ultimaMensagemEm && (
                            <span className="text-xs text-slate-400">
                              {formatDateTimeBR(contato.ultimaMensagemEm)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </aside>

          <section className="flex flex-1 flex-col overflow-hidden">
            {selectedContato ? (
              <>
                <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-3 dark:border-slate-800">
                  <Avatar
                    fotoUrl={selectedContato.fotoUrl}
                    nome={selectedContato.nome ?? selectedContato.telefone}
                  />
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      {selectedContato.nome ?? selectedContato.telefone}
                    </p>
                    <p className="text-xs text-slate-400">
                      {selectedContato.telefone}
                      {selectedContato.setor && <> · {selectedContato.setor}</>}
                    </p>
                  </div>
                </div>

                <ThreadPanel contatoId={selectedContato.id} mensagens={mensagens} />
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Selecione uma conversa à esquerda.
                </p>
              </div>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}
