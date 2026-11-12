import express from "express";
import QRCode from "qrcode";
import { enviarMensagem, getStatus } from "./whatsapp.js";
import type { TipoMensagem } from "./db.js";

const TIPOS_MIDIA_VALIDOS: TipoMensagem[] = ["imagem", "video", "audio", "documento"];

const SECRET = process.env.WORKER_SECRET;
const PROCESSO_INICIADO_EM = new Date().toISOString();
const VERSAO_CODIGO = "jid-fix-2026-11-12";

export function criarServidor() {
  const app = express();
  app.use(express.json());

  // Usado pelo Railway para checar se o serviço está de pé. Também serve
  // para conferir, de fora, se o código rodando é o mais recente
  // (processoIniciadoEm e versao ajudam a diagnosticar deploys presos).
  app.get("/health", (_req, res) => {
    res.json({ ok: true, processoIniciadoEm: PROCESSO_INICIADO_EM, versao: VERSAO_CODIGO });
  });

  app.use((req, res, next) => {
    if (req.path === "/health") return next();
    const recebido = req.header("x-worker-secret");
    if (!SECRET || recebido !== SECRET) {
      res.status(401).json({ error: "Não autorizado." });
      return;
    }
    next();
  });

  app.get("/status", (_req, res) => {
    const { status } = getStatus();
    res.json({ status });
  });

  app.get("/qr", async (_req, res) => {
    const { status, qr } = getStatus();
    if (status !== "aguardando_qr" || !qr) {
      res.status(404).json({ error: "Nenhum QR code disponível no momento." });
      return;
    }
    const png = await QRCode.toBuffer(qr, { width: 320, margin: 2 });
    res.setHeader("Content-Type", "image/png");
    res.send(png);
  });

  app.post("/send", async (req, res) => {
    const {
      telefone,
      texto,
      enviadoPor,
      midiaUrl,
      midiaTipo,
      midiaMimetype,
      midiaNomeArquivo,
      respondendoAId,
    } = req.body ?? {};

    if (typeof telefone !== "string") {
      res.status(400).json({ error: "Informe o telefone." });
      return;
    }
    const temMidia = typeof midiaUrl === "string" && midiaUrl.length > 0;
    if (!temMidia && typeof texto !== "string") {
      res.status(400).json({ error: "Informe texto ou uma mídia." });
      return;
    }
    if (temMidia && !TIPOS_MIDIA_VALIDOS.includes(midiaTipo)) {
      res.status(400).json({ error: "midiaTipo inválido." });
      return;
    }

    console.log(`POST /send recebido para telefone ${telefone}`);
    try {
      await enviarMensagem(telefone, typeof texto === "string" ? texto : undefined, {
        enviadoPor,
        respondendoAId:
          typeof respondendoAId === "string" ? respondendoAId : undefined,
        midia: temMidia
          ? {
              url: midiaUrl,
              tipo: midiaTipo as TipoMensagem,
              mimetype: typeof midiaMimetype === "string" ? midiaMimetype : undefined,
              nomeArquivo:
                typeof midiaNomeArquivo === "string" ? midiaNomeArquivo : undefined,
            }
          : undefined,
      });
      res.json({ ok: true });
    } catch (erro) {
      console.error("Erro no handler /send:", erro);
      res.status(502).json({
        error: erro instanceof Error ? erro.message : "Erro ao enviar mensagem.",
      });
    }
  });

  return app;
}
