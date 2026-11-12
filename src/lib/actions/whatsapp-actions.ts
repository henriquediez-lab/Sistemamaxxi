"use server";

import { revalidatePath } from "next/cache";
import { put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import {
  enviarMensagemWhatsapp,
  type TipoMidiaWhatsapp,
} from "@/lib/whatsapp-worker";

export type EnviarMensagemResult = { ok: true } | { ok: false; error: string };

function tipoMidiaPorMimetype(mimetype: string): TipoMidiaWhatsapp {
  if (mimetype.startsWith("image/")) return "imagem";
  if (mimetype.startsWith("video/")) return "video";
  if (mimetype.startsWith("audio/")) return "audio";
  return "documento";
}

export async function enviarMensagemWhatsappAction(
  formData: FormData
): Promise<EnviarMensagemResult> {
  const contatoId = String(formData.get("contatoId") ?? "");
  const texto = String(formData.get("texto") ?? "").trim();
  const respondendoAId = String(formData.get("respondendoAId") ?? "") || undefined;
  const arquivo = formData.get("arquivo");
  const temArquivo = arquivo instanceof File && arquivo.size > 0;

  if (!texto && !temArquivo) {
    return { ok: false, error: "Digite uma mensagem ou anexe um arquivo." };
  }

  const contato = await prisma.whatsappContato.findUnique({
    where: { id: contatoId },
  });
  if (!contato) {
    return { ok: false, error: "Contato não encontrado." };
  }

  let midia: {
    url: string;
    tipo: TipoMidiaWhatsapp;
    mimetype?: string;
    nomeArquivo?: string;
  } | undefined;

  if (temArquivo) {
    const arquivoFile = arquivo as File;
    if (arquivoFile.size > 60 * 1024 * 1024) {
      return { ok: false, error: "Arquivo muito grande (máximo 60 MB)." };
    }
    try {
      const tipo = tipoMidiaPorMimetype(arquivoFile.type || "application/octet-stream");
      const enviado = await put(
        `whatsapp/saida/${tipo}/${crypto.randomUUID()}-${arquivoFile.name}`,
        arquivoFile,
        {
          access: "public",
          contentType: arquivoFile.type || undefined,
          token: process.env.BLOB_READ_WRITE_TOKEN,
        }
      );
      midia = {
        url: enviado.url,
        tipo,
        mimetype: arquivoFile.type || undefined,
        nomeArquivo: arquivoFile.name,
      };
    } catch (error) {
      return {
        ok: false,
        error:
          error instanceof Error
            ? `Falha ao enviar o arquivo: ${error.message}`
            : "Falha ao enviar o arquivo.",
      };
    }
  }

  const user = await getCurrentUser();
  const resultado = await enviarMensagemWhatsapp(
    contato.telefone,
    texto || undefined,
    { enviadoPor: user?.email, respondendoAId, midia }
  );

  revalidatePath("/atendimento");

  if (!resultado.ok) {
    return { ok: false, error: resultado.error };
  }
  return { ok: true };
}

export async function marcarContatoLidoAction(contatoId: string) {
  await prisma.whatsappContato.update({
    where: { id: contatoId },
    data: { naoLida: false },
  });
  revalidatePath("/atendimento");
}

export async function criarRegraAction(formData: FormData) {
  const palavraChave = String(formData.get("palavraChave") ?? "").trim();
  const resposta = String(formData.get("resposta") ?? "").trim();
  const setor = String(formData.get("setor") ?? "").trim();

  if (!palavraChave || !resposta) {
    return;
  }

  await prisma.whatsappRegraAutomatica.create({
    data: {
      palavraChave,
      resposta,
      setor: setor || null,
    },
  });

  revalidatePath("/atendimento/regras");
}

export async function alternarRegraAction(id: string, ativo: boolean) {
  await prisma.whatsappRegraAutomatica.update({
    where: { id },
    data: { ativo },
  });
  revalidatePath("/atendimento/regras");
}

export async function excluirRegraAction(id: string) {
  await prisma.whatsappRegraAutomatica.delete({ where: { id } });
  revalidatePath("/atendimento/regras");
}

export type MesclarContatosResult = { ok: true } | { ok: false; error: string };

/**
 * Mescla dois contatos que na verdade são a mesma pessoa (ex: o WhatsApp
 * identificou o mesmo cliente de duas formas diferentes em momentos
 * distintos). Move as mensagens do contato removido para o mantido e
 * completa dados que estiverem faltando (nome, foto, setor).
 */
export async function mesclarContatosAction(
  contatoManterId: string,
  contatoRemoverId: string
): Promise<MesclarContatosResult> {
  if (contatoManterId === contatoRemoverId) {
    return { ok: false, error: "Selecione dois contatos diferentes." };
  }

  const [manter, remover] = await Promise.all([
    prisma.whatsappContato.findUnique({ where: { id: contatoManterId } }),
    prisma.whatsappContato.findUnique({ where: { id: contatoRemoverId } }),
  ]);
  if (!manter || !remover) {
    return { ok: false, error: "Contato não encontrado." };
  }

  await prisma.$transaction([
    prisma.whatsappMensagem.updateMany({
      where: { contatoId: contatoRemoverId },
      data: { contatoId: contatoManterId },
    }),
    prisma.whatsappContato.update({
      where: { id: contatoManterId },
      data: {
        nome: manter.nome ?? remover.nome,
        fotoUrl: manter.fotoUrl ?? remover.fotoUrl,
        setor: manter.setor ?? remover.setor,
        naoLida: manter.naoLida || remover.naoLida,
        ultimaMensagemEm:
          !manter.ultimaMensagemEm ||
          (remover.ultimaMensagemEm &&
            remover.ultimaMensagemEm > manter.ultimaMensagemEm)
            ? remover.ultimaMensagemEm
            : manter.ultimaMensagemEm,
      },
    }),
    prisma.whatsappContato.delete({ where: { id: contatoRemoverId } }),
  ]);

  revalidatePath("/atendimento");
  revalidatePath("/atendimento/contatos");
  return { ok: true };
}
