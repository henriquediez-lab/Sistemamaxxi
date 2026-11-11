"use client";

import { useEffect, useState } from "react";

export function QrImage() {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 4000);
    return () => clearInterval(id);
  }, []);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/api/whatsapp/qr?t=${tick}`}
      alt="QR code para conectar o WhatsApp"
      width={280}
      height={280}
      className="rounded-lg border border-slate-200 dark:border-slate-800"
    />
  );
}
