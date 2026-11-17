import "server-only";
import { prisma } from "@/lib/prisma";

// Mesmo valor usado pelo worker (whatsapp.ts) pra mensagens respondidas
// direto pelo celular, fora do painel — não é um atendente de verdade.
const ENVIADO_POR_CELULAR = "celular";

export type PeriodoMetricas = "24h" | "7d" | "30d";

export const PERIODOS: { valor: PeriodoMetricas; label: string; dias: number }[] = [
  { valor: "24h", label: "Últimas 24h", dias: 1 },
  { valor: "7d", label: "Últimos 7 dias", dias: 7 },
  { valor: "30d", label: "Últimos 30 dias", dias: 30 },
];

export function resolverPeriodo(valor: string | undefined): {
  periodo: PeriodoMetricas;
  inicio: Date;
  fim: Date;
} {
  const encontrado = PERIODOS.find((p) => p.valor === valor) ?? PERIODOS[1];
  const fim = new Date();
  const inicio = new Date(fim.getTime() - encontrado.dias * 24 * 60 * 60 * 1000);
  return { periodo: encontrado.valor, inicio, fim };
}

export type MetricaAtendente = {
  email: string;
  mensagensEnviadas: number;
  conversasAtendidas: number;
  tempoMedioRespostaSegundos: number | null;
  ultimaAtividade: Date | null;
};

export type MetricasGerais = {
  porAtendente: MetricaAtendente[];
  totalMensagens: number;
  totalConversasAtendidas: number;
  tempoMedioRespostaSegundos: number | null;
  mensagensForaDoPainel: number;
};

/**
 * Calcula, pra cada atendente, quantas mensagens manuais ele mandou, em
 * quantas conversas diferentes, e o tempo médio entre a última mensagem do
 * cliente e a resposta dele — tudo dentro do período pedido.
 *
 * Busca um pouco antes do início do período (mesmas conversas) só pra
 * conseguir calcular corretamente o tempo de resposta de mensagens que
 * caem bem no começo da janela, sem precisar escanear o histórico inteiro.
 */
export async function calcularMetricasAtendimento(
  inicio: Date,
  fim: Date
): Promise<MetricasGerais> {
  const contatosComAtividade = await prisma.whatsappMensagem.findMany({
    where: { createdAt: { gte: inicio, lte: fim } },
    distinct: ["contatoId"],
    select: { contatoId: true },
  });
  const contatoIds = contatosComAtividade.map((c) => c.contatoId);

  if (contatoIds.length === 0) {
    return {
      porAtendente: [],
      totalMensagens: 0,
      totalConversasAtendidas: 0,
      tempoMedioRespostaSegundos: null,
      mensagensForaDoPainel: 0,
    };
  }

  const margemBusca = new Date(inicio.getTime() - 3 * 24 * 60 * 60 * 1000);
  const mensagens = await prisma.whatsappMensagem.findMany({
    where: { contatoId: { in: contatoIds }, createdAt: { gte: margemBusca, lte: fim } },
    select: {
      contatoId: true,
      direcao: true,
      automatica: true,
      enviadoPor: true,
      createdAt: true,
    },
    orderBy: [{ contatoId: "asc" }, { createdAt: "asc" }],
  });

  type Acumulado = {
    mensagens: number;
    conversas: Set<string>;
    somaSegundos: number;
    qtdSegundos: number;
    ultimaAtividade: Date | null;
  };
  const porEmail = new Map<string, Acumulado>();
  let totalMensagens = 0;
  let mensagensForaDoPainel = 0;
  const totalConversas = new Set<string>();
  let somaGeralSegundos = 0;
  let qtdGeralSegundos = 0;

  let contatoAnterior: string | null = null;
  let mensagemAnterior: { direcao: string; createdAt: Date } | null = null;

  for (const msg of mensagens) {
    if (msg.contatoId !== contatoAnterior) {
      contatoAnterior = msg.contatoId;
      mensagemAnterior = null;
    }

    const dentroDoPeriodo = msg.createdAt >= inicio && msg.createdAt <= fim;
    const respostaManual =
      dentroDoPeriodo && msg.direcao === "saida" && !msg.automatica && msg.enviadoPor;

    if (respostaManual && msg.enviadoPor === ENVIADO_POR_CELULAR) {
      mensagensForaDoPainel += 1;
    } else if (respostaManual && msg.enviadoPor) {
      const atual = porEmail.get(msg.enviadoPor) ?? {
        mensagens: 0,
        conversas: new Set<string>(),
        somaSegundos: 0,
        qtdSegundos: 0,
        ultimaAtividade: null,
      };
      atual.mensagens += 1;
      atual.conversas.add(msg.contatoId);
      if (!atual.ultimaAtividade || msg.createdAt > atual.ultimaAtividade) {
        atual.ultimaAtividade = msg.createdAt;
      }

      totalMensagens += 1;
      totalConversas.add(msg.contatoId);

      if (mensagemAnterior && mensagemAnterior.direcao === "entrada") {
        const gapSegundos =
          (msg.createdAt.getTime() - mensagemAnterior.createdAt.getTime()) / 1000;
        if (gapSegundos >= 0) {
          atual.somaSegundos += gapSegundos;
          atual.qtdSegundos += 1;
          somaGeralSegundos += gapSegundos;
          qtdGeralSegundos += 1;
        }
      }

      porEmail.set(msg.enviadoPor, atual);
    }

    mensagemAnterior = { direcao: msg.direcao, createdAt: msg.createdAt };
  }

  const porAtendente: MetricaAtendente[] = Array.from(porEmail.entries())
    .map(([email, dados]) => ({
      email,
      mensagensEnviadas: dados.mensagens,
      conversasAtendidas: dados.conversas.size,
      tempoMedioRespostaSegundos:
        dados.qtdSegundos > 0 ? dados.somaSegundos / dados.qtdSegundos : null,
      ultimaAtividade: dados.ultimaAtividade,
    }))
    .sort((a, b) => b.mensagensEnviadas - a.mensagensEnviadas);

  return {
    porAtendente,
    totalMensagens,
    mensagensForaDoPainel,
    totalConversasAtendidas: totalConversas.size,
    tempoMedioRespostaSegundos:
      qtdGeralSegundos > 0 ? somaGeralSegundos / qtdGeralSegundos : null,
  };
}

export function formatarDuracao(segundos: number | null): string {
  if (segundos === null) return "—";
  if (segundos < 60) return `${Math.round(segundos)}s`;
  const minutos = segundos / 60;
  if (minutos < 60) return `${Math.round(minutos)}min`;
  const horas = minutos / 60;
  if (horas < 24) {
    const h = Math.floor(horas);
    const m = Math.round((horas - h) * 60);
    return m > 0 ? `${h}h ${m}min` : `${h}h`;
  }
  const dias = horas / 24;
  return `${dias.toFixed(1)}d`;
}
