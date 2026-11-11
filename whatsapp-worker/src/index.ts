import "dotenv/config";
import { criarServidor } from "./server.js";
import { iniciarConexao } from "./whatsapp.js";

if (!process.env.DATABASE_URL) {
  throw new Error("Defina DATABASE_URL no .env (mesmo banco do painel principal).");
}
if (!process.env.WORKER_SECRET) {
  throw new Error("Defina WORKER_SECRET no .env (um segredo compartilhado com o painel).");
}

const PORT = Number(process.env.PORT ?? 3001);

const app = criarServidor();
app.listen(PORT, () => {
  console.log(`Worker do WhatsApp ouvindo na porta ${PORT}`);
});

iniciarConexao().catch((erro) => {
  console.error("Falha ao iniciar conexão com o WhatsApp:", erro);
});
