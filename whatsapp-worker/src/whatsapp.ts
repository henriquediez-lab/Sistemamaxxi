import { Boom } from "@hapi/boom";
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  type WAMessage,
  type WASocket,
} from "baileys";
import pino from "pino";
import {
  atualizarSetorContato,
  registrarMensagem,
  upsertContato,
} from "./db.js";
import { encontrarRegraCorrespondente } from "./automacao.js";

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

function extrairTelefone(jid: string): string {
  return jid.split("@")[0].split(":")[0];
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

async function processarMensagem(msg: WAMessage) {
  const remoteJid = msg.key.remoteJid;
  if (!remoteJid) return;
  if (remoteJid.endsWith("@g.us")) return; // ignora grupos
  if (remoteJid === "status@broadcast") return;

  const texto =
    (msg.message?.conversation as string | undefined) ??
    (msg.message as { extendedTextMessage?: { text?: string } } | undefined)
      ?.extendedTextMessage?.text ??
    null;

  if (!texto) return; // ignora mídia/áudio/figurinha por enquanto

  const telefone = extrairTelefone(remoteJid);
  const contato = await upsertContato(telefone, msg.pushName ?? null);

  if (msg.key.fromMe) {
    // Resposta enviada direto pelo celular (fora do painel) — registra para o histórico ficar completo.
    await registrarMensagem({
      contatoId: contato.id,
      direcao: "saida",
      texto,
      enviadoPor: "celular",
      marcarNaoLida: false,
    });
    return;
  }

  await registrarMensagem({
    contatoId: contato.id,
    direcao: "entrada",
    texto,
  });

  const regra = await encontrarRegraCorrespondente(texto);
  if (regra) {
    if (regra.setor) {
      await atualizarSetorContato(contato.id, regra.setor);
    }
    await enviarMensagem(telefone, regra.resposta, { automatica: true });
  }
}

export async function enviarMensagem(
  telefone: string,
  texto: string,
  opts?: { automatica?: boolean; enviadoPor?: string }
) {
  if (!socket) throw new Error("WhatsApp não está conectado.");

  let jid = `${telefone}@s.whatsapp.net`;
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

  const contato = await upsertContato(telefone, null);

  try {
    console.log(`Enviando mensagem para ${jid}...`);
    const resultadoEnvio = await socket.sendMessage(jid, { text: texto });
    console.log(`Resultado do envio para ${jid}:`, JSON.stringify(resultadoEnvio));
    await registrarMensagem({
      contatoId: contato.id,
      direcao: "saida",
      texto,
      automatica: opts?.automatica ?? false,
      enviadoPor: opts?.enviadoPor ?? null,
      marcarNaoLida: false,
    });
  } catch (erro) {
    console.error(`Erro ao enviar mensagem para ${jid}:`, erro);
    await registrarMensagem({
      contatoId: contato.id,
      direcao: "saida",
      texto,
      automatica: opts?.automatica ?? false,
      enviadoPor: opts?.enviadoPor ?? null,
      erro: erro instanceof Error ? erro.message : "Erro desconhecido",
      marcarNaoLida: false,
    });
    throw erro;
  }
}
