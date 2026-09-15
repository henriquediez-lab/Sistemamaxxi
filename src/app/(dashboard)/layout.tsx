import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { logoutAction } from "@/lib/actions/auth-actions";

const NAV_ITEMS = [
  { href: "/", label: "Anúncios" },
  { href: "/contas", label: "Conta Mercado Livre" },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen flex-1">
      <aside className="flex w-60 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-200 px-5 py-5 dark:border-slate-800">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">
            Gestor Mercado Livre
          </p>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Maxxi Tacos
          </p>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-yellow-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="border-t border-slate-200 px-4 py-4 dark:border-slate-800">
          <p className="truncate text-xs text-slate-500 dark:text-slate-400">
            {user.email}
          </p>
          <form action={logoutAction} className="mt-2">
            <button
              type="submit"
              className="text-xs font-medium text-slate-500 underline-offset-2 hover:text-slate-900 hover:underline dark:text-slate-400 dark:hover:text-white"
            >
              Sair
            </button>
          </form>
        </div>
      </aside>

      <main className="flex-1 overflow-x-hidden">{children}</main>
    </div>
  );
}
