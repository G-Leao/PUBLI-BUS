/**
 * PostgreSQL local de DESENVOLVIMENTO sem instalação global.
 *
 * Sobe um PostgreSQL real (binários via embedded-postgres) na porta 5432
 * e mantém o processo vivo. Use em conjunto com:
 *
 *   node scripts/dev-db.mjs      (em outro terminal)
 *   npm run dev                  (API)
 *
 * Comandos úteis:
 *   node scripts/dev-db.mjs --init    → inicializa e aplica migrations + seed
 *   node scripts/dev-db.mjs           → apenas sobe o servidor
 *   node scripts/dev-db.mjs --stop    → derruba servidores
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.resolve(__dirname, "..");
const DATA_DIR = path.join(backendDir, ".dev-pg");
const PORT = 5432;
const DB_NAME = "publibus";

const DATABASE_URL = `postgresql://postgres:postgres@127.0.0.1:${PORT}/${DB_NAME}?schema=public`;

let pg;

async function main() {
  const args = process.argv.slice(2);

  const { default: EmbeddedPostgres } = await import("embedded-postgres");
  pg = new EmbeddedPostgres({
    databaseDir: DATA_DIR,
    user: "postgres",
    password: "postgres",
    port: PORT,
    persistent: true,
  });

  if (args.includes("--stop")) {
    await pg.stop().catch(() => {});
    console.log("🛑 PostgreSQL de desenvolvimento parado.");
    return;
  }

  fs.mkdirSync(DATA_DIR, { recursive: true });
  await pg.initialise();
  await pg.start();
  try {
    await pg.createDatabase(DB_NAME);
  } catch (e) {
    if (!String(e.message).includes("already exists")) console.error(e.message);
  }

  console.log(`🍀 PostgreSQL de desenvolvimento rodando em 127.0.0.1:${PORT}`);

  if (args.includes("--init")) {
    console.log("📦 Aplicando migrations...");
    execSync("npx prisma migrate deploy", {
      cwd: backendDir,
      env: { ...process.env, DATABASE_URL },
      stdio: "inherit",
    });
    console.log("🌱 Rodando seed...");
    execSync("npx prisma db seed", {
      cwd: backendDir,
      env: { ...process.env, DATABASE_URL },
      stdio: "inherit",
    });
  }

  console.log(`DATABASE_URL=${DATABASE_URL}`);
  console.log("Pressione Ctrl+C para derrubar.");

  // Mantém o processo vivo enquanto o Postgres estiver no ar.
  const timer = setInterval(() => {}, 1 << 30);
  const shutdown = async () => {
    clearInterval(timer);
    await pg.stop().catch(() => {});
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("💥 Erro:", err);
  process.exit(1);
});