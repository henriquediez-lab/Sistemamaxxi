import { Boom } from "@hapi/boom";
import makeWASocket, {
  DisconnectReason,
  downloadMediaMessage,
  useMultiFileAuthState,
  type WAMessage,
  type WASocket,
} from "baileys";
import pino from "pino";
import {
  atualizarSetorContato,
  buscarMensagemParaCitar,
  buscarMensagemPorWaId,
  registrarMensagem,
  upsertContato,
  type Contato,
  type TipoMensagem,
} from "./db.js";
import { encontrarRegraCorrespondente } from "./automacao.js";
import { subirMidia } from "./media.js";

const AUTH_DIR = process.env.AUTH_DIR ?? "./auth_info_baileys";
const logger = pino({ level: process.env.LOG_LEVEL ?? "warn" });

export type StatusConexao =
  | "aguardando_qr"
  | "conectando"
  | "conectado"
  | "desconectado";

let socket: WASocket | null = null;
let statusAtual: StatusConexao = "conectando";
let ultimoQrCode: string | null = null;

export function getStatus() {
  return { status: statusAtual, qr: statusAtual === "aguardando_qr" ? ultimoQrCode : null };
}

// Normaliza o JID removendo o sufixo de dispositivo (ex: ":12"), mas
// preservando o domínio (@s.whatsapp.net ou @lid). O WhatsApp vem migrando
// contas para um identificador novo (LID) em vez do número de telefone
// puro; tratar tudo como "número de telefone" faz o envio de volta falhar
// silenciosamente (mensagem fica presa em "PENDING" para sempre).
function normalizarJid(jid: string): string {
  const [usuario, dominio] = jid.split("@");
  return `${usuario.split(":")[0]}@${dominio}`;
}

// Monta o JID usado para enviar, a partir do identificador salvo no banco.
// Identificadores antigos (salvos antes dessa correção) são só dígitos, sem
// "@" — nesse caso assume o domínio clássico por compatibilidade.
function construirJidEnvio(identificador: string): string {
  return identificador.includes("@")
    ? identificador
    : `${identificador}@s.whatsapp.net`;
}

/** Busca a foto de perfil do contato, se ainda não tivermos uma salva. */
async function atualizarFotoSeNecessario(contato: Contato, jid: string) {
  if (contato.fotoUrl || !socket) return;
  try {
    const url = await socket.profilePictureUrl(jid, "image");
    if (url) {
      await upsertContato(contato.telefone, null, url);
    }
  } catch {
    // Contato sem foto, ou sem permissão pra ver — não é um erro de verdade.
  }
}

type ConteudoMensagem = {
  texto: string | null;
  tipo: TipoMensagem;
  mimetype?: string | null;
  nomeArquivo?: string | null;
  stanzaIdCitada?: string | null;
};

// O WhatsApp às vezes embrulha a mensagem de verdade dentro de camadas como
// "mensagem efêmera" ou "visualização única" (fotos/vídeos que somem depois
// de abrir). Sem desembrulhar isso, a mensagem real fica invisível pro
// código — ela chega, mas nenhum dos campos esperados (imageMessage,
// videoMessage etc.) é encontrado no nível errado.
function desembrulhar(
  mensagem: NonNullable<WAMessage["message"]>
): NonNullable<WAMessage["message"]> {
  let atual = mensagem;
  for (let i = 0; i < 3; i++) {
    const interna =
      atual.ephemeralMessage?.message ??
      atual.viewOnceMessage?.message ??
      atual.viewOnceMessageV2?.message ??
      atual.viewOnceMessageV2Extension?.message ??
      null;
    if (!interna) break;
    atual = interna;
  }
  return atual;
}

/** Extrai texto/legenda, tipo de mídia e contexto de citação de uma mensagem recebida. */
function extrairConteudo(msg: WAMessage): ConteudoMensagem | null {
  const m = msg.message ? desembrulhar(msg.message) : null;
  if (!m) return null;

  if (m.conversation) {
    return { texto: m.conversation, tipo: "texto" };
  }
  if (m.extendedTextMessage) {
    return {
      texto: m.extendedTextMessage.text ?? null,
      tipo: "texto",
      stanzaIdCitada: m.extendedTextMessage.contextInfo?.stanzaId ?? null,
    };
  }
  if (m.imageMessage) {
    return {
      texto: m.imageMessage.caption ?? null,
      tipo: "imagem",
      mimetype: m.imageMessage.mimetype,
      stanzaIdCitada: m.imageMessage.contextInfo?.stanzaId ?? null,
    };
  }
  if (m.videoMessage) {
    return {
      texto: m.videoMessage.caption ?? null,
      tipo: "video",
      mimetype: m.videoMessage.mimetype,
      stanzaIdCitada: m.videoMessage.contextInfo?.stanzaId ?? null,
    };
  }
  if (m.audioMessage) {
    return {
      texto: null,
      tipo: "audio",
      mimetype: m.audioMessage.mimetype,
      stanzaIdCitada: m.audioMessage.contextInfo?.stanzaId ?? null,
    };
  }
  if (m.documentMessage) {
    return {
      texto: m.documentMessage.caption ?? null,
      tipo: "documento",
      mimetype: m.documentMessage.mimetype,
      nomeArquivo: m.documentMessage.fileName ?? null,
      stanzaIdCitada: m.documentMessage.contextInfo?.stanzaId ?? null,
    };
  }

  return null; // figurinha, localização, contato, enquete, etc. — não suportado por enquanto.
}

export async function iniciarConexao() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

  socket = makeWASocket({
    auth: state,
    logger,
    printQRInTerminal: false,
  });

  socket.ev.on("creds.update", saveCreds);

  socket.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      ultimoQrCode = qr;
      statusAtual = "aguardando_qr";
      console.log("Novo QR code disponível para pareamento.");
    }

    if (connection === "open") {
      statusAtual = "conectado";
      ultimoQrCode = null;
      console.log("Conectado ao WhatsApp.");
    } else if (connection === "close") {
      statusAtual = "desconectado";
      const motivo = (lastDisconnect?.error as Boom)?.output?.statusCode;
      const deslogado = motivo === DisconnectReason.loggedOut;

      if (deslogado) {
        console.log(
          "Sessão desconectada no celular. Será preciso escanear um novo QR code."
        );
        ultimoQrCode = null;
        statusAtual = "aguardando_qr";
        iniciarConexao();
      } else {
        console.log("Conexão perdida, tentando reconectar em 5s...");
        setTimeout(() => {
          iniciarConexao();
        }, 5000);
      }
    }
  });

  socket.ev.on("messages.upsert", async (upsert) => {
    if (upsert.type !== "notify") return;

    for (const msg of upsert.messages) {
      try {
        await processarMensagem(msg);
      } catch (erro) {
        console.error("Erro ao processar mensagem recebida:", erro);
      }
    }
  });

  return socket;
}

async function baixarMidia(
  msg: WAMessage,
  conteudo: ConteudoMensagem
): Promise<string | null> {
  if (!socket) return null;
  try {
    const buffer = await downloadMediaMessage(
      msg,
      "buffer",
      {},
      { logger, reuploadRequest: socket.updateMediaMessage }
    );
    return await subirMidia(buffer, {
      pasta: `whatsapp/entrada/${conteudo.tipo}`,
      mimetype: conteudo.mimetype,
      nomeArquivo: conteudo.nomeArquivo,
    });
  } catch (erro) {
    console.error("Erro ao baixar/subir mídia recebida:", erro);
    return null;
  }
}

async function processarMensagem(msg: WAMessage) {
  const remoteJid = msg.key.remoteJid;
  if (!remoteJid) return;
  if (remoteJid.endsWith("@g.us")) return; // ignora grupos
  if (remoteJid === "status@broadcast") return;

  const conteudo = extrairConteudo(msg);
  if (!conteudo) return; // figurinha/localização/etc, ainda não suportado
  if (!conteudo.texto && conteudo.tipo === "texto") return; // mensagem de texto vazia

  const telefone = normalizarJid(remoteJid);
  const contato = await upsertContato(telefone, msg.pushName ?? null);
  await atualizarFotoSeNecessario(contato, telefone);

  const respondendoA = conteudo.stanzaIdCitada
    ? await buscarMensagemPorWaId(contato.id, conteudo.stanzaIdCitada)
    : null;

  const midiaUrl =
    conteudo.tipo !== "texto" ? await baixarMidia(msg, conteudo) : null;

  if (msg.key.fromMe) {
    // Resposta enviada direto pelo celular (fora do painel) — registra para o histórico ficar completo.
    await registrarMensagem({
      contatoId: contato.id,
      direcao: "saida",
      waMessageId: msg.key.id,
      tipo: conteudo.tipo,
      texto: conteudo.texto,
      midiaUrl,
      midiaMimetype: conteudo.mimetype,
      midiaNomeArquivo: conteudo.nomeArquivo,
      respondendoAId: respondendoA?.id,
      enviadoPor: "celular",
      marcarNaoLida: false,
    });
    return;
  }

  await registrarMensagem({
    contatoId: contato.id,
    direcao: "entrada",
    waMessageId: msg.key.id,
    tipo: conteudo.tipo,
    texto: conteudo.texto,
    midiaUrl,
    midiaMimetype: conteudo.mimetype,
    midiaNomeArquivo: conteudo.nomeArquivo,
    respondendoAId: respondendoA?.id,
  });

  if (conteudo.texto) {
    const regra = await encontrarRegraCorrespondente(conteudo.texto);
    if (regra) {
      if (regra.setor) {
        await atualizarSetorContato(contato.id, regra.setor);
      }
      await enviarMensagem(telefone, regra.resposta, { automatica: true });
    }
  }
}

function construirConteudoEnvio(
  texto: string | undefined,
  midia?: {
    url: string;
    tipo: TipoMensagem;
    mimetype?: string | null;
    nomeArquivo?: string | null;
  }
) {
  if (!midia || midia.tipo === "texto") {
    return { text: texto ?? "" };
  }

  switch (midia.tipo) {
    case "imagem":
      return {
        image: { url: midia.url },
        ...(texto ? { caption: texto } : {}),
        mimetype: midia.mimetype ?? undefined,
      };
    case "video":
      return {
        video: { url: midia.url },
        ...(texto ? { caption: texto } : {}),
        mimetype: midia.mimetype ?? undefined,
      };
    case "audio":
      return {
        audio: { url: midia.url },
        mimetype: midia.mimetype ?? "audio/ogg; codecs=opus",
      };
    case "documento":
      return {
        document: { url: midia.url },
        mimetype: midia.mimetype ?? "application/octet-stream",
        fileName: midia.nomeArquivo ?? "arquivo",
        ...(texto ? { caption: texto } : {}),
      };
  }
}

export async function enviarMensagem(
  telefone: string,
  texto: string | undefined,
  opts?: {
    automatica?: boolean;
    enviadoPor?: string;
    midia?: {
      url: string;
      tipo: TipoMensagem;
      mimetype?: string | null;
      nomeArquivo?: string | null;
    };
    respondendoAId?: string;
  }
) {
  if (!socket) throw new Error("WhatsApp não está conectado.");

  let jid = construirJidEnvio(telefone);

  // Só faz sentido resolver por número de telefone (onWhatsApp) quando o
  // identificador salvo é mesmo um número puro (contato antigo, de antes
  // dessa correção). Quando já temos o JID completo (@s.whatsapp.net ou
  // @lid) vindo de uma mensagem real, ele é a fonte da verdade.
  if (!telefone.includes("@")) {
    try {
      const resultados = await socket.onWhatsApp(telefone);
      const resultado = resultados?.[0];
      if (resultado?.exists && resultado.jid) {
        jid = resultado.jid;
      } else {
        console.warn(`onWhatsApp não encontrou o número ${telefone}; usando JID construído manualmente.`);
      }
    } catch (erroResolucao) {
      console.warn(`Falha ao resolver JID para ${telefone}:`, erroResolucao);
    }
  }

  const contato = await upsertContato(telefone, null);

  let quoted: WAMessage | undefined;
  if (opts?.respondendoAId) {
    const original = await buscarMensagemParaCitar(opts.respondendoAId);
    if (original?.waMessageId) {
      quoted = {
        key: {
          remoteJid: jid,
          fromMe: original.direcao === "saida",
          id: original.waMessageId,
        },
        message: { conversation: original.texto ?? "" },
      };
    }
  }

  const conteudoEnvio = construirConteudoEnvio(texto, opts?.midia);
  const tipoRegistrado: TipoMensagem = opts?.midia?.tipo ?? "texto";

  try {
    console.log(`Enviando mensagem (${tipoRegistrado}) para ${jid}...`);
    const resultadoEnvio = await socket.sendMessage(
      jid,
      conteudoEnvio,
      quoted ? { quoted } : undefined
    );
    console.log(`Resultado do envio para ${jid}:`, JSON.stringify(resultadoEnvio));
    await registrarMensagem({
      contatoId: contato.id,
      direcao: "saida",
      waMessageId: resultadoEnvio?.key?.id,
      tipo: tipoRegistrado,
      texto: texto ?? null,
      midiaUrl: opts?.midia?.url,
      midiaMimetype: opts?.midia?.mimetype,
      midiaNomeArquivo: opts?.midia?.nomeArquivo,
      respondendoAId: opts?.respondendoAId,
      automatica: opts?.automatica ?? false,
      enviadoPor: opts?.enviadoPor ?? null,
      marcarNaoLida: false,
    });
  } catch (erro) {
    console.error(`Erro ao enviar mensagem para ${jid}:`, erro);
    await registrarMensagem({
      contatoId: contato.id,
      direcao: "saida",
      tipo: tipoRegistrado,
      texto: texto ?? null,
      midiaUrl: opts?.midia?.url,
      midiaMimetype: opts?.midia?.mimetype,
      midiaNomeArquivo: opts?.midia?.nomeArquivo,
      respondendoAId: opts?.respondendoAId,
      automatica: opts?.automatica ?? false,
      enviadoPor: opts?.enviadoPor ?? null,
      erro: erro instanceof Error ? erro.message : "Erro desconhecido",
      marcarNaoLida: false,
    });
    throw erro;
  }
}
