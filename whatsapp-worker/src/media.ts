import { put } from "@vercel/blob";
import { randomUUID } from "node:crypto";

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
