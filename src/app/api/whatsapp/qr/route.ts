import { NextResponse } from "next/server";
import { fetchWorkerQrImage } from "@/lib/whatsapp-worker";

export async function GET() {
  const response = await fetchWorkerQrImage();
  if (!response) {
    return NextResponse.json(
      { error: "Nenhum QR code disponível no momento." },
      { status: 404 }
    );
  }

  const buffer = await response.arrayBuffer();
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": response.headers.get("content-type") ?? "image/png",
      "Cache-Control": "no-store",
    },
  });
}
