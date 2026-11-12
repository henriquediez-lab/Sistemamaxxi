"use client";

import { useState } from "react";

const CATEGORIAS: { titulo: string; emojis: string[] }[] = [
  {
    titulo: "Sorrisos",
    emojis: [
      "😀", "😁", "😂", "🤣", "😊", "😍", "😘", "😉", "😎", "🤔",
      "😅", "😢", "😭", "😡", "😱", "🥳", "🙄", "😴", "🤗", "🙏",
    ],
  },
  {
    titulo: "Gestos",
    emojis: [
      "👍", "👎", "👏", "🙌", "👌", "✌️", "🤝", "💪", "🤙", "☝️",
    ],
  },
  {
    titulo: "Corações",
    emojis: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "💔", "💯", "✨"],
  },
  {
    titulo: "Trabalho",
    emojis: [
      "✅", "❌", "⏰", "📅", "📦", "🚚", "💰", "💳", "📞", "📍",
      "🎉", "🔥", "⚠️", "📄", "📷", "🛒", "🎱",
    ],
  },
];

export function EmojiPicker({
  onSelecionar,
}: {
  onSelecionar: (emoji: string) => void;
}) {
  const [aberto, setAberto] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        title="Emoji"
        onClick={() => setAberto((a) => !a)}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xl text-slate-500 transition hover:bg-[#f0f2f5] dark:text-slate-300 dark:hover:bg-[#202c33]"
      >
        🙂
      </button>

      {aberto && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setAberto(false)} />
          <div className="absolute bottom-full left-0 z-20 mb-2 w-72 rounded-xl border border-slate-200 bg-white p-3 shadow-lg dark:border-slate-700 dark:bg-[#233138]">
            <div className="max-h-64 overflow-y-auto">
              {CATEGORIAS.map((categoria) => (
                <div key={categoria.titulo} className="mb-2">
                  <p className="mb-1 text-[11px] font-medium text-slate-400">
                    {categoria.titulo}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {categoria.emojis.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => onSelecionar(emoji)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-lg hover:bg-[#f0f2f5] dark:hover:bg-[#182229]"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
