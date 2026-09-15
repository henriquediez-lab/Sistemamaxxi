import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-6 text-center">
          <h1 className="text-lg font-semibold text-slate-900 dark:text-white">
            Gestor de Conta Mercado Livre
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Entre para acessar o painel
          </p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
