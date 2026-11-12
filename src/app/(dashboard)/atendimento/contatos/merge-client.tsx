"use client";

import { useState, useTransition } from "react";
import { mesclarContatosAction } from "@/lib/actions/whatsapp-actions";

export type ContatoParaMesclar = {
  id: string;
  telefone: string;
  nome: string | null;
  setor: string | null;
  totalMensagens: number;
  ultimaMensagemEmFormatado: string | null;
};

export function MergeContactsClient({ contatos }: { contatos: ContatoParaMesclar[] }) {
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [manterId, setManterId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [mensagem, setMensagem] = useState<{ texto: string; erro: boolean } | null>(null);

  function alternarSelecao(id: string) {
    setMensagem(null);
    setSelecionados((atual) => {
      if (atual.includes(id)) {
        const novo = atual.filter((item) => item !== id);
        if (manterId === id) setManterId(null);
        return novo;
      }
      if (atual.length >= 2) return atual; // só permite 2 por vez
      return [...atual, id];
    });
  }

  function confirmarMesclagem() {
    if (!manterId || selecionados.length !== 2) return;
    const removerId = selecionados.find((id) => id !== manterId);
    if (!removerId) return;

    startTransition(async () => {
      const resultado = await mesclarContatosAction(manterId, removerId);
      if (resultado.ok) {
        setMensagem({ texto: "Contatos mesclados com sucesso.", erro: false });
        setSelecionados([]);
        setManterId(null);
      } else {
        setMensagem({ texto: resultado.error, erro: true });
      }
    });
  }

  const contatosSelecionados = contatos.filter((c) => selecionados.includes(c.id));

  return (
    <div>
      {mensagem && (
        <div
          className={`mb-4 rounded-lg px-4 py-3 text-sm ${
            mensagem.erro
              ? "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
              : "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
          }`}
        >
          {mensagem.texto}
        </div>
      )}

      {selecionados.length === 2 && (
        <div className="mb-4 rounded-2xl border border-yellow-300 bg-yellow-50 p-4 dark:border-yellow-900 dark:bg-yellow-950">
          <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
            Qual dos dois é o contato correto (vai ficar com o nome)?
          </p>
          <div className="mt-3 space-y-2">
            {contatosSelecionados.map((c) => (
              <label
                key={c.id}
                className="flex cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-200"
              >
                <input
                  type="radio"
                  name="manter"
                  checked={manterId === c.id}
                  onChange={() => setManterId(c.id)}
                />
                {c.nome ?? c.telefone} — {c.totalMensagens} mensagem(ns)
              </label>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            As mensagens dos dois contatos vão ficar juntas numa só conversa. O
            outro contato será removido da lista (não dá pra desfazer).
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={!manterId || isPending}
              onClick={confirmarMesclagem}
              className="rounded-lg bg-yellow-400 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? "Mesclando..." : "Mesclar"}
            </button>
            <button
              type="button"
              onClick={() => {
                setSelecionados([]);
                setManterId(null);
              }}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
        <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
          <thead className="bg-slate-50 dark:bg-slate-900">
            <tr>
              <th className="px-4 py-3" />
              <th className="px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400">
                Contato
              </th>
              <th className="px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400">
                Telefone / ID
              </th>
              <th className="px-4 py-3 text-right font-medium text-slate-500 dark:text-slate-400">
                Mensagens
              </th>
              <th className="px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400">
                Última atividade
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {contatos.map((contato) => (
              <tr
                key={contato.id}
                className={
                  selecionados.includes(contato.id)
                    ? "bg-yellow-50 dark:bg-slate-800"
                    : "bg-white dark:bg-slate-900"
                }
              >
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selecionados.includes(contato.id)}
                    onChange={() => alternarSelecao(contato.id)}
                    disabled={
                      !selecionados.includes(contato.id) && selecionados.length >= 2
                    }
                  />
                </td>
                <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                  {contato.nome ?? "—"}
                  {contato.setor && (
                    <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                      {contato.setor}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                  {contato.telefone}
                </td>
                <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300">
                  {contato.totalMensagens}
                </td>
                <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                  {contato.ultimaMensagemEmFormatado ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
