import { randomUUID } from "node:crypto";
import pg from "pg";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

export type Contato = {
  id: string;
  telefone: string;
  nome: string | null;
  setor: string | null;
  naoLida: boolean;
};

/** Cria o contato se não existir, ou atualiza o nome quando informado. */
export async function upsertContato(
  telefone: string,
  nome: string | null
): Promise<Contato> {
  const existente = await pool.query<Contato>(
    `SELECT id, telefone, nome, setor, "naoLida" FROM "WhatsappContato" WHERE telefone = $1`,
    [telefone]
  );

  if (existente.rows.length > 0) {
    if (nome) {
      await pool.query(
        `UPDATE "WhatsappContato" SET nome = $1, "updatedAt" = now() WHERE id = $2`,
        [nome, existente.rows[0].id]
      );
    }
    return existente.rows[0];
  }

  const id = randomUUID();
  const inserido = await pool.query<Contato>(
    `INSERT INTO "WhatsappContato" (id, telefone, nome, "createdAt", "updatedAt")
     VALUES ($1, $2, $3, now(), now())
     RETURNING id, telefone, nome, setor, "naoLida"`,
    [id, telefone, nome]
  );
  return inserido.rows[0];
}

export async function registrarMensagem(params: {
  contatoId: string;
  direcao: "entrada" | "saida";
  texto: string;
  automatica?: boolean;
  enviadoPor?: string | null;
  erro?: string | null;
  marcarNaoLida?: boolean;
}) {
  const id = randomUUID();
  await pool.query(
    `INSERT INTO "WhatsappMensagem"
       (id, "contatoId", direcao, texto, automatica, "enviadoPor", erro, "createdAt")
     VALUES ($1, $2, $3, $4, $5, $6, $7, now())`,
    [
      id,
      params.contatoId,
      params.direcao,
      params.texto,
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
