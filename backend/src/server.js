import app from "./app.js";
import { env } from "./config/env.js";

const port = env.PORT;

const server = app.listen(port, () => {
  console.log(`🚌 PUBLI-BUS API rodando em http://localhost:${port}`);
  console.log(`Health check: http://localhost:${port}/api/health`);
});

function shutdown(signal) {
  console.log(`\n${signal} recebido. Encerrando...`);
  server.close(() => process.exit(0));
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));