import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDateTimeBR } from "@/lib/format-date";
import { getWorkerStatus } from "@/lib/whatsapp-worker";
import { StatusRefresh } from "./status-refresh";
import { ThreadPanel, type MensagemThread } from "./thread-panel";
import { QrImage } from "./qr-image";
import { ContactMenu } from "./contact-menu";

// Fundo sutil com textura de bolinhas, parecido com o papel de parede do
// WhatsApp, pra área de conversa não ficar uma chapa lisa. Um tom neutro
// funciona razoavelmente tanto no fundo claro quanto no escuro.
const PADRAO_FUNDO = "radial-gradient(rgba(128,128,128,0.12) 1px, transparent 1px)";

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
      className="flex shrink-0 items-center justify-center rounded-full bg-[#00a884] font-semibold text-white"
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
  conectado: { label: "WhatsApp conectado", color: "bg-[#25d366]" },
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
  const busca = typeof params.q === "string" ? params.q.trim() : "";
  const verArquivadas = params.arquivadas === "1";

  const status = await getWorkerStatus();
  const statusInfo = STATUS_INFO[status] ?? STATUS_INFO.desconectado;

  const filtroBusca = busca
    ? {
        OR: [
          { nome: { contains: busca, mode: "insensitive" as const } },
          { telefone: { contains: busca, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [contatos, totalArquivadas] = await Promise.all([
    prisma.whatsappContato.findMany({
      where: { arquivada: verArquivadas, ...filtroBusca },
      orderBy: { ultimaMensagemEm: "desc" },
      take: 100,
    }),
    prisma.whatsappContato.count({ where: { arquivada: true } }),
  ]);

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
    <div className="flex h-screen flex-col bg-[#f0f2f5] dark:bg-[#0b141a]">
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
          <aside className="flex w-[380px] shrink-0 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-[#111b21]">
            <div className="flex items-center justify-between gap-2 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${statusInfo.color}`} />
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {statusInfo.label}
                </p>
              </div>
              <div className="flex gap-3 text-xs">
                <Link
                  href="/atendimento/contatos"
                  className="font-medium text-[#008069] hover:underline dark:text-[#00a884]"
                >
                  Contatos
                </Link>
                <Link
                  href="/atendimento/regras"
                  className="font-medium text-[#008069] hover:underline dark:text-[#00a884]"
                >
                  Automático
                </Link>
              </div>
            </div>

            <form method="get" className="px-3 pb-2">
              {selectedContatoId && (
                <input type="hidden" name="contato" value={selectedContatoId} />
              )}
              {verArquivadas && <input type="hidden" name="arquivadas" value="1" />}
              <input
                type="text"
                name="q"
                defaultValue={busca}
                placeholder="Buscar conversa"
                className="w-full rounded-lg bg-[#f0f2f5] px-4 py-2 text-sm text-slate-700 outline-none placeholder:text-slate-500 focus:ring-2 focus:ring-[#25d366]/40 dark:bg-[#202c33] dark:text-slate-100 dark:placeholder:text-slate-400"
              />
            </form>

            {verArquivadas ? (
              <Link
                href="/atendimento"
                className="flex items-center gap-2 border-b border-slate-100 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-[#f5f6f6] dark:border-slate-800/60 dark:text-slate-200 dark:hover:bg-[#202c33]"
              >
                ← Conversas arquivadas
              </Link>
            ) : (
              totalArquivadas > 0 && (
                <Link
                  href="/atendimento?arquivadas=1"
                  className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 text-sm text-slate-600 hover:bg-[#f5f6f6] dark:border-slate-800/60 dark:text-slate-300 dark:hover:bg-[#202c33]"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-200 text-base dark:bg-slate-700">
                    📥
                  </span>
                  <span className="flex-1">Arquivadas</span>
                  <span className="text-xs text-slate-400">{totalArquivadas}</span>
                </Link>
              )
            )}

            <div className="flex-1 overflow-y-auto">
              {contatos.length === 0 ? (
                <p className="p-4 text-sm text-slate-500 dark:text-slate-400">
                  {busca
                    ? "Nenhuma conversa encontrada."
                    : verArquivadas
                      ? "Nenhuma conversa arquivada."
                      : "Nenhuma conversa ainda."}
                </p>
              ) : (
                contatos.map((contato) => {
                  const ativo = contato.id === selectedContato?.id;
                  return (
                    <Link
                      key={contato.id}
                      href={`/atendimento?contato=${contato.id}${busca ? `&q=${encodeURIComponent(busca)}` : ""}${verArquivadas ? "&arquivadas=1" : ""}`}
                      className={`block border-b border-slate-100 px-4 py-3 transition dark:border-slate-800/60 ${
                        ativo
                          ? "bg-[#f0f2f5] dark:bg-[#2a3942]"
                          : "hover:bg-[#f5f6f6] dark:hover:bg-[#202c33]"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar
                          fotoUrl={contato.fotoUrl}
                          nome={contato.nome ?? contato.telefone}
                          tamanho={44}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-[15px] font-medium text-slate-900 dark:text-white">
                              {contato.nome ?? contato.telefone}
                            </p>
                            {contato.ultimaMensagemEm && (
                              <span
                                className={`shrink-0 text-xs ${
                                  contato.naoLida
                                    ? "font-semibold text-[#25d366]"
                                    : "text-slate-400"
                                }`}
                              >
                                {formatDateTimeBR(contato.ultimaMensagemEm)}
                              </span>
                            )}
                          </div>
                          <div className="mt-0.5 flex items-center justify-between gap-2">
                            {contato.setor ? (
                              <span className="truncate rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                                {contato.setor}
                              </span>
                            ) : (
                              <span className="truncate text-xs text-slate-400">
                                {contato.telefone}
                              </span>
                            )}
                            {contato.naoLida && (
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#25d366] text-[10px] font-bold text-white">
                                •
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </aside>

          <section
            className="flex flex-1 flex-col overflow-hidden bg-[#efeae2] dark:bg-[#0b141a]"
            style={{ backgroundImage: PADRAO_FUNDO, backgroundSize: "18px 18px" }}
          >
            {selectedContato ? (
              <>
                <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-5 py-3 dark:border-slate-800 dark:bg-[#111b21]">
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
                  <ContactMenu
                    contatoId={selectedContato.id}
                    arquivada={selectedContato.arquivada}
                  />
                </div>

                <ThreadPanel contatoId={selectedContato.id} mensagens={mensagens} />
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center">
                <p className="rounded-full bg-white/80 px-4 py-2 text-sm text-slate-500 dark:bg-[#111b21]/80 dark:text-slate-400">
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
