import express from "express";
import QRCode from "qrcode";
import { enviarMensagem, getStatus } from "./whatsapp.js";

const SECRET = process.env.WORKER_SECRET;

export function criarServidor() {
  const app = express();
  app.use(express.json());

  // Usado pelo Railway para checar se o serviço está de pé.
  app.get("/health", (_req, res) => {
    res.json({ ok: true });
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
    const { telefone, texto, enviadoPor } = req.body ?? {};
    if (typeof telefone !== "string" || typeof texto !== "string") {
      res.status(400).json({ error: "Informe telefone e texto." });
      return;
    }
    try {
      await enviarMensagem(telefone, texto, { enviadoPor });
      res.json({ ok: true });
    } catch (erro) {
      res.status(502).json({
        error: erro instanceof Error ? erro.message : "Erro ao enviar mensagem.",
      });
    }
  });

  return app;
}
