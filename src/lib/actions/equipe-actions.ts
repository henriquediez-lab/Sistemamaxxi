"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";

export type EquipeActionResult = { ok: true } | { ok: false; error: string };

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    throw new Error("Apenas administradores podem gerenciar a equipe.");
  }
  return user;
}

/** Quantos admins ativos existem — usado pra nunca deixar a equipe sem nenhum. */
async function contarAdminsAtivos(): Promise<number> {
  return prisma.user.count({ where: { role: "admin", ativo: true } });
}

export async function criarAtendenteAction(
  formData: FormData
): Promise<EquipeActionResult> {
  await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const comoAdmin = formData.get("role") === "admin";

  if (!name || !email || !password) {
    return { ok: false, error: "Preencha todos os campos." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Digite um e-mail válido." };
  }
  if (password.length < 8) {
    return { ok: false, error: "A senha precisa ter pelo menos 8 caracteres." };
  }

  const existente = await prisma.user.findUnique({ where: { email } });
  if (existente) {
    return { ok: false, error: "Já existe uma conta com esse e-mail." };
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.create({
    data: { name, email, passwordHash, role: comoAdmin ? "admin" : "atendente" },
  });

  revalidatePath("/equipe");
  return { ok: true };
}

export async function alternarAtivoUsuarioAction(
  userId: string,
  ativo: boolean
): Promise<EquipeActionResult> {
  const admin = await requireAdmin();

  if (!ativo) {
    if (userId === admin.userId) {
      return { ok: false, error: "Você não pode desativar a própria conta." };
    }
    const alvo = await prisma.user.findUnique({ where: { id: userId } });
    if (alvo?.role === "admin" && (await contarAdminsAtivos()) <= 1) {
      return { ok: false, error: "Não dá pra desativar o último administrador ativo." };
    }
  }

  await prisma.user.update({ where: { id: userId }, data: { ativo } });
  revalidatePath("/equipe");
  return { ok: true };
}

export async function alternarRoleUsuarioAction(
  userId: string,
  novoRole: "admin" | "atendente"
): Promise<EquipeActionResult> {
  const admin = await requireAdmin();

  if (novoRole === "atendente") {
    if (userId === admin.userId) {
      return {
        ok: false,
        error: "Você não pode remover seu próprio acesso de administrador.",
      };
    }
    const alvo = await prisma.user.findUnique({ where: { id: userId } });
    if (alvo?.role === "admin" && (await contarAdminsAtivos()) <= 1) {
      return { ok: false, error: "Precisa ter pelo menos um administrador ativo." };
    }
  }

  await prisma.user.update({ where: { id: userId }, data: { role: novoRole } });
  revalidatePath("/equipe");
  return { ok: true };
}

export async function redefinirSenhaUsuarioAction(
  userId: string,
  formData: FormData
): Promise<EquipeActionResult> {
  await requireAdmin();

  const novaSenha = String(formData.get("novaSenha") ?? "");
  if (novaSenha.length < 8) {
    return { ok: false, error: "A senha precisa ter pelo menos 8 caracteres." };
  }

  const passwordHash = await bcrypt.hash(novaSenha, 12);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  return { ok: true };
}

export async function excluirUsuarioAction(userId: string): Promise<EquipeActionResult> {
  const admin = await requireAdmin();

  if (userId === admin.userId) {
    return { ok: false, error: "Você não pode excluir a própria conta." };
  }
  const alvo = await prisma.user.findUnique({ where: { id: userId } });
  if (alvo?.role === "admin" && (await contarAdminsAtivos()) <= 1) {
    return { ok: false, error: "Não dá pra excluir o último administrador." };
  }

  await prisma.user.delete({ where: { id: userId } });
  revalidatePath("/equipe");
  return { ok: true };
}
