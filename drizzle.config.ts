import { defineConfig } from "drizzle-kit";

// Só gera SQL. Quem aplica é o wrangler (`npm run db:migrate`), que é o
// caminho nativo do D1 tanto local quanto em produção.
export default defineConfig({
  dialect: "sqlite",
  schema: "./app/.server/schema.ts",
  out: "./migrations",
});
