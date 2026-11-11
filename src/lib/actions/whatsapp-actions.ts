"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import { enviarMensagemWhatsapp } from "@/lib/whatsapp-worker";

export type EnviarMensagemResult = { ok: true } | { ok: false; error: string };

export async function enviarMensagemWhatsappAction(
  contatoId: string,
  texto: string
): Promise<EnviarMensagemResult> {
  const textoLimpo = texto.trim();
  if (!textoLimpo) {
    return { ok: false, error: "Digite uma mensagem." };
  }

  const contato = await prisma.whatsappContato.findUnique({
    where: { id: contatoId },
  });
  if (!contato) {
    return { ok: false, error: "Contato não encontrado." };
  }

  const user = await getCurrentUser();
  const resultado = await enviarMensagemWhatsapp(
    contato.telefone,
    textoLimpo,
    user?.email
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
