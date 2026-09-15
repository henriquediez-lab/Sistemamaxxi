// O Mercado Livre mostra os horários no fuso do Brasil (Brasília). Sem
// especificar o timeZone, o Intl.DateTimeFormat usaria o fuso do servidor
// (UTC na Vercel), fazendo as datas aparecerem ~3h à frente do real.
const TIME_ZONE = "America/Sao_Paulo";

export function formatDateTimeBR(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: TIME_ZONE,
  }).format(date);
}

export function formatDateBR(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeZone: TIME_ZONE,
  }).format(date);
}
