const STATUS_LABELS: Record<string, string> = {
  paid: "Pago",
  confirmed: "Confirmado",
  payment_required: "Aguardando pagamento",
  payment_in_process: "Pagamento em processamento",
  partially_paid: "Parcialmente pago",
  cancelled: "Cancelado",
  invalid: "Inválido",
};

const STATUS_STYLES: Record<string, string> = {
  paid: "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300",
  confirmed: "bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  payment_required:
    "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  payment_in_process:
    "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  partially_paid:
    "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  cancelled: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
  invalid: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
};

export function PedidoStatusBadge({ status }: { status: string }) {
  const style =
    STATUS_STYLES[status] ??
    "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";
  const label = STATUS_LABELS[status] ?? status;

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${style}`}
    >
      {label}
    </span>
  );
}
