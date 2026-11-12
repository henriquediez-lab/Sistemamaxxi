import { randomUUID } from "node:crypto";
import pg from "pg";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

export type Contato = {
  id: string;
  telefone: string;
  nome: string | null;
  fotoUrl: string | null;
  setor: string | null;
  naoLida: boolean;
};

/** Cria o contato se não existir, ou atualiza nome/foto quando informados. */
export async function upsertContato(
  telefone: string,
  nome: string | null,
  fotoUrl?: string | null
): Promise<Contato> {
  const existente = await pool.query<Contato>(
    `SELECT id, telefone, nome, "fotoUrl", setor, "naoLida" FROM "WhatsappContato" WHERE telefone = $1`,
    [telefone]
  );

  if (existente.rows.length > 0) {
    if (nome || fotoUrl) {
      await pool.query(
        `UPDATE "WhatsappContato"
         SET nome = COALESCE($1, nome),
             "fotoUrl" = COALESCE($2, "fotoUrl"),
             "updatedAt" = now()
         WHERE id = $3`,
        [nome, fotoUrl ?? null, existente.rows[0].id]
      );
    }
    return existente.rows[0];
  }

  const id = randomUUID();
  const inserido = await pool.query<Contato>(
    `INSERT INTO "WhatsappContato" (id, telefone, nome, "fotoUrl", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, now(), now())
     RETURNING id, telefone, nome, "fotoUrl", setor, "naoLida"`,
    [id, telefone, nome, fotoUrl ?? null]
  );
  return inserido.rows[0];
}

export type TipoMensagem = "texto" | "imagem" | "video" | "audio" | "documento";

export async function registrarMensagem(params: {
  contatoId: string;
  direcao: "entrada" | "saida";
  texto?: string | null;
  waMessageId?: string | null;
  tipo?: TipoMensagem;
  midiaUrl?: string | null;
  midiaMimetype?: string | null;
  midiaNomeArquivo?: string | null;
  respondendoAId?: string | null;
  automatica?: boolean;
  enviadoPor?: string | null;
  erro?: string | null;
  marcarNaoLida?: boolean;
}): Promise<string> {
  const id = randomUUID();
  await pool.query(
    `INSERT INTO "WhatsappMensagem"
       (id, "contatoId", direcao, "waMessageId", tipo, texto, "midiaUrl", "midiaMimetype",
        "midiaNomeArquivo", "respondendoAId", automatica, "enviadoPor", erro, "createdAt")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, now())`,
    [
      id,
      params.contatoId,
      params.direcao,
      params.waMessageId ?? null,
      params.tipo ?? "texto",
      params.texto ?? null,
      params.midiaUrl ?? null,
      params.midiaMimetype ?? null,
      params.midiaNomeArquivo ?? null,
      params.respondendoAId ?? null,
      params.automatica ?? false,
      params.enviadoPor ?? null,
      params.erro ?? null,
    ]
  );

  await pool.query(
    `UPDATE "WhatsappContato"
     SET "ultimaMensagemEm" = now(),
         "naoLida" = CASE WHEN $2 THEN true ELSE "naoLida" END,
         "updatedAt" = now()
     WHERE id = $1`,
    [params.contatoId, params.marcarNaoLida ?? params.direcao === "entrada"]
  );

  return id;
}

export type MensagemParaCitar = {
  id: string;
  waMessageId: string | null;
  direcao: "entrada" | "saida";
  texto: string | null;
  contatoTelefone: string;
};

/** Busca uma mensagem já registrada no mesmo contato pelo id dela no WhatsApp (usado para ligar respostas citadas recebidas). */
export async function buscarMensagemPorWaId(
  contatoId: string,
  waMessageId: string
): Promise<{ id: string } | null> {
  const resultado = await pool.query<{ id: string }>(
    `SELECT id FROM "WhatsappMensagem" WHERE "contatoId" = $1 AND "waMessageId" = $2 LIMIT 1`,
    [contatoId, waMessageId]
  );
  return resultado.rows[0] ?? null;
}

/** Busca uma mensagem pelo id interno, com o telefone do contato (usado para montar a citação ao responder pelo painel). */
export async function buscarMensagemParaCitar(
  id: string
): Promise<MensagemParaCitar | null> {
  const resultado = await pool.query<MensagemParaCitar>(
    `SELECT m.id, m."waMessageId", m.direcao, m.texto, c.telefone AS "contatoTelefone"
     FROM "WhatsappMensagem" m
     JOIN "WhatsappContato" c ON c.id = m."contatoId"
     WHERE m.id = $1
     LIMIT 1`,
    [id]
  );
  return resultado.rows[0] ?? null;
}

export async function atualizarSetorContato(
  contatoId: string,
  setor: string
) {
  await pool.query(
    `UPDATE "WhatsappContato" SET setor = $1, "updatedAt" = now() WHERE id = $2`,
    [setor, contatoId]
  );
}

export type RegraAutomatica = {
  id: string;
  palavraChave: string;
  resposta: string;
  setor: string | null;
};

export async function listarRegrasAtivas(): Promise<RegraAutomatica[]> {
  const resultado = await pool.query<RegraAutomatica>(
    `SELECT id, "palavraChave", resposta, setor
     FROM "WhatsappRegraAutomatica"
     WHERE ativo = true
     ORDER BY ordem ASC, "createdAt" ASC`
  );
  return resultado.rows;
}

export async function fecharConexaoBanco() {
  await pool.end();
}
