"use client";

import { useState, useTransition } from "react";
import { syncAnunciosAction } from "@/lib/actions/ml-actions";

export function SyncButton({ mlAccountId }: { mlAccountId: string }) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  function handleClick() {
    setMessage(null);
    startTransition(async () => {
      const result = await syncAnunciosAction(mlAccountId);
      if (result.ok) {
        setIsError(false);
        setMessage(
          `Sincronização concluída: ${result.itemsSynced} anúncio(s) atualizado(s).`
        );
      } else {
        setIsError(true);
        setMessage(result.error ?? "Erro ao sincronizar.");
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="rounded-lg bg-yellow-400 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Sincronizando..." : "Sincronizar agora"}
      </button>
      {message && (
        <p
          className={`max-w-xs text-right text-xs ${
            isError
              ? "text-red-600 dark:text-red-400"
              : "text-green-600 dark:text-green-400"
          }`}
        >
          {message}
        </p>
      )}
    </div>
  );
}
