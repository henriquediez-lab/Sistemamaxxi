import { listarRegrasAtivas, type RegraAutomatica } from "./db.js";

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // remove acentos
    .toLowerCase()
    .trim();
}

/** Procura a primeira regra ativa cuja palavra-chave aparece na mensagem recebida. */
export async function encontrarRegraCorrespondente(
  textoRecebido: string
): Promise<RegraAutomatica | null> {
  const regras = await listarRegrasAtivas();
  const textoNormalizado = normalizar(textoRecebido);

  for (const regra of regras) {
    const palavraChave = normalizar(regra.palavraChave);
    if (palavraChave && textoNormalizado.includes(palavraChave)) {
      return regra;
    }
  }

  return null;
}
