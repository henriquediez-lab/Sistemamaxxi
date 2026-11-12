import Link from "next/link";

const ITENS = [
  {
    href: "/atendimento/saudacao",
    titulo: "Saudação automática",
    descricao:
      "Mensagem de boas-vindas com menu de setores, enviada quando um cliente volta a falar depois de mais de 24h.",
  },
  {
    href: "/atendimento/regras",
    titulo: "Respostas automáticas",
    descricao: "Responde sozinho quando a mensagem contém uma palavra-chave.",
  },
  {
    href: "/atendimento/etiquetas",
    titulo: "Etiquetas",
    descricao: "Rótulos coloridos pra organizar conversas por assunto.",
  },
  {
    href: "/atendimento/respostas-rapidas",
    titulo: "Respostas rápidas",
    descricao: 'Mensagens prontas que você insere digitando "/atalho" na conversa.',
  },
  {
    href: "/atendimento/contatos",
    titulo: "Contatos",
    descricao: "Mescla contatos duplicados ou limpa o histórico de conversas.",
  },
];

export default function ConfiguracoesPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <Link
        href="/atendimento"
        className="text-sm text-slate-500 hover:underline dark:text-slate-400"
      >
        ← Voltar para o Atendimento
      </Link>

      <h1 className="mt-3 text-xl font-semibold text-slate-900 dark:text-white">
        Configurações do Atendimento
      </h1>

      <div className="mt-6 space-y-3">
        {ITENS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="block rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-[#25d366] hover:shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              {item.titulo}
            </p>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              {item.descricao}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
