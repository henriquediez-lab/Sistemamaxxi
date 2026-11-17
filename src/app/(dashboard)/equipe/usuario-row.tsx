"use client";

import { useState, useTransition } from "react";
import {
  alternarAtivoUsuarioAction,
  alternarRoleUsuarioAction,
  excluirUsuarioAction,
  redefinirSenhaUsuarioAction,
  type EquipeActionResult,
} from "@/lib/actions/equipe-actions";

type Usuario = {
  id: string;
  name: string;
  email: string;
  role: string;
  ativo: boolean;
  criadoEm: string;
};

export function UsuarioRow({ usuario, souEu }: { usuario: Usuario; souEu: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);
  const [mostrandoSenha, setMostrandoSenha] = useState(false);
  const [novaSenha, setNovaSenha] = useState("");
  const [senhaOk, setSenhaOk] = useState(false);

  function executar(acao: () => Promise<EquipeActionResult>) {
    setErro(null);
    startTransition(async () => {
      const resultado = await acao();
      if (!resultado.ok) setErro(resultado.error);
    });
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-slate-900 dark:text-white">
            {usuario.name}
            {souEu && (
              <span className="text-xs font-normal text-slate-400">(você)</span>
            )}
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                usuario.role === "admin"
                  ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300"
                  : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
              }`}
            >
              {usuario.role === "admin" ? "Admin" : "Atendente"}
            </span>
            {!usuario.ativo && (
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-red-700 dark:bg-red-950 dark:text-red-300">
                Desativado
              </span>
            )}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{usuario.email}</p>
          <p className="text-xs text-slate-400">Desde {usuario.criadoEm}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={isPending}
            onClick={() =>
              executar(() =>
                alternarRoleUsuarioAction(
                  usuario.id,
                  usuario.role === "admin" ? "atendente" : "admin"
                )
              )
            }
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {usuario.role === "admin" ? "Tornar atendente" : "Tornar admin"}
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() =>
              executar(() => alternarAtivoUsuarioAction(usuario.id, !usuario.ativo))
            }
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {usuario.ativo ? "Desativar" : "Ativar"}
          </button>
          <button
            type="button"
            onClick={() => setMostrandoSenha((v) => !v)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Redefinir senha
          </button>
          {!confirmandoExclusao ? (
            <button
              type="button"
              onClick={() => setConfirmandoExclusao(true)}
              className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
            >
              Excluir
            </button>
          ) : (
            <span className="flex items-center gap-2">
              <button
                type="button"
                disabled={isPending}
                onClick={() => executar(() => excluirUsuarioAction(usuario.id))}
                className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Confirmar
              </button>
              <button
                type="button"
                onClick={() => setConfirmandoExclusao(false)}
                className="text-xs text-slate-500 hover:underline dark:text-slate-400"
              >
                Cancelar
              </button>
            </span>
          )}
        </div>
      </div>

      {erro && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{erro}</p>}

      {mostrandoSenha && (
        <div className="mt-3 flex items-end gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
          <div className="flex-1">
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Nova senha (mínimo 8 caracteres)
            </label>
            <input
              type="password"
              value={novaSenha}
              onChange={(e) => {
                setNovaSenha(e.target.value);
                setSenhaOk(false);
              }}
              minLength={8}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-200 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            />
          </div>
          <button
            type="button"
            disabled={isPending || novaSenha.length < 8}
            onClick={() => {
              const formData = new FormData();
              formData.set("novaSenha", novaSenha);
              setErro(null);
              startTransition(async () => {
                const resultado = await redefinirSenhaUsuarioAction(usuario.id, formData);
                if (resultado.ok) {
                  setNovaSenha("");
                  setSenhaOk(true);
                } else {
                  setErro(resultado.error);
                }
              });
            }}
            className="rounded-lg bg-yellow-400 px-3 py-1.5 text-xs font-semibold text-slate-900 hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Salvar senha
          </button>
          {senhaOk && (
            <span className="text-xs text-green-600 dark:text-green-400">
              Senha atualizada!
            </span>
          )}
        </div>
      )}
    </div>
  );
}
