const STATUS_LABELS: Record<string, string> = {
  active: "Ativo",
  paused: "Pausado",
  closed: "Encerrado",
  under_review: "Em revisão",
  inactive: "Inativo",
  payment_required: "Pagamento pendente",
  not_yet_active: "Não ativado",
};

const STATUS_STYLES: Record<string, string> = {
  active:
    "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300",
  paused:
    "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  closed: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
};

export function StatusBadge({ status }: { status: string }) {
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
