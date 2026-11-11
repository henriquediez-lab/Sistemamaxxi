import "server-only";

function getWorkerConfig() {
  const url = process.env.WHATSAPP_WORKER_URL;
  const secret = process.env.WHATSAPP_WORKER_SECRET;
  if (!url || !secret) return null;
  return { url: url.replace(/\/$/, ""), secret };
}

export type WhatsappWorkerStatus =
  | "aguardando_qr"
  | "conectando"
  | "conectado"
  | "desconectado"
  | "nao_configurado";

export async function getWorkerStatus(): Promise<WhatsappWorkerStatus> {
  const config = getWorkerConfig();
  if (!config) return "nao_configurado";

  try {
    const response = await fetch(`${config.url}/status`, {
      headers: { "x-worker-secret": config.secret },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return "desconectado";
    const data = (await response.json()) as { status: WhatsappWorkerStatus };
    return data.status;
  } catch {
    return "desconectado";
  }
}

export async function fetchWorkerQrImage(): Promise<Response | null> {
  const config = getWorkerConfig();
  if (!config) return null;

  try {
    const response = await fetch(`${config.url}/qr`, {
      headers: { "x-worker-secret": config.secret },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return null;
    return response;
  } catch {
    return null;
  }
}

export async function enviarMensagemWhatsapp(
  telefone: string,
  texto: string,
  enviadoPor?: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const config = getWorkerConfig();
  if (!config) {
    return { ok: false, error: "O serviço de WhatsApp ainda não foi configurado." };
  }

  try {
    const response = await fetch(`${config.url}/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-worker-secret": config.secret,
      },
      body: JSON.stringify({ telefone, texto, enviadoPor }),
      signal: AbortSignal.timeout(20000),
    });
    const data = (await response.json().catch(() => null)) as
      | { ok?: boolean; error?: string }
      | null;
    if (!response.ok) {
      return {
        ok: false,
        error: data?.error ?? `Falha ao enviar (HTTP ${response.status}).`,
      };
    }
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Não foi possível falar com o serviço de WhatsApp.",
    };
  }
}
