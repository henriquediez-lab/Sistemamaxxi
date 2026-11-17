import { put } from "@vercel/blob";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";

const EXTENSAO_POR_SUBTIPO: Record<string, string> = {
  jpeg: "jpg",
  "3gpp": "3gp",
};

function extensaoPorMimetype(mimetype?: string | null): string {
  if (!mimetype) return "bin";
  const subtipo = mimetype.split("/")[1]?.split(";")[0]?.trim() ?? "";
  if (EXTENSAO_POR_SUBTIPO[subtipo]) return EXTENSAO_POR_SUBTIPO[subtipo];
  const limpo = subtipo.replace(/[^a-z0-9]/gi, "");
  return limpo || "bin";
}

/** Sobe um arquivo de mídia pro Vercel Blob e retorna a URL pública. */
export async function subirMidia(
  buffer: Buffer,
  opts: { pasta: string; mimetype?: string | null; nomeArquivo?: string | null }
): Promise<string> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    throw new Error("BLOB_READ_WRITE_TOKEN não configurado.");
  }

  const extensaoDoNome = opts.nomeArquivo?.includes(".")
    ? opts.nomeArquivo.split(".").pop()
    : null;
  const extensao = extensaoDoNome || extensaoPorMimetype(opts.mimetype);
  const caminho = `${opts.pasta}/${randomUUID()}.${extensao}`;

  const resultado = await put(caminho, buffer, {
    access: "public",
    contentType: opts.mimetype ?? undefined,
    token,
  });

  return resultado.url;
}

/** Baixa um arquivo público (ex: do Vercel Blob) e devolve o conteúdo em memória. */
export async function baixarArquivoUrl(url: string): Promise<Buffer> {
  const resposta = await fetch(url);
  if (!resposta.ok) {
    throw new Error(`Falha ao baixar arquivo (HTTP ${resposta.status}).`);
  }
  return Buffer.from(await resposta.arrayBuffer());
}

/**
 * Converte qualquer áudio (ex: webm gravado no navegador) para ogg/opus —
 * o formato que o WhatsApp exige para mostrar como mensagem de voz (nota de
 * áudio tocável com "ptt", em vez de arquivo de áudio comum).
 */
export async function transcodarParaOggOpus(buffer: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn("ffmpeg", [
      "-i", "pipe:0",
      "-f", "ogg",
      "-c:a", "libopus",
      "-ar", "48000",
      "-ac", "1",
      "pipe:1",
    ]);

    const pedacos: Buffer[] = [];
    let erroSaida = "";

    ffmpeg.stdout.on("data", (pedaco) => pedacos.push(pedaco));
    ffmpeg.stderr.on("data", (pedaco) => {
      erroSaida += pedaco.toString();
    });
    ffmpeg.on("error", (erro) => {
      reject(new Error(`Não foi possível executar o ffmpeg: ${erro.message}`));
    });
    ffmpeg.on("close", (codigo) => {
      if (codigo === 0) {
        resolve(Buffer.concat(pedacos));
      } else {
        reject(new Error(`ffmpeg falhou (código ${codigo}): ${erroSaida.slice(-500)}`));
      }
    });

    ffmpeg.stdin.on("error", () => {
      // EPIPE etc. — já tratado pelo listener "close"/"error" do processo.
    });
    ffmpeg.stdin.write(buffer);
    ffmpeg.stdin.end();
  });
}
