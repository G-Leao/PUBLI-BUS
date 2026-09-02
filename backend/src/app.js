import express from "express";
import cors from "cors";
import helmet from "helmet";
import path from "node:path";
import { fileURLToPath } from "node:url";
import routes from "./routes/index.js";
import { apiLimiter } from "./middlewares/rateLimit.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { notFoundHandler } from "./middlewares/notFoundHandler.js";
import { env, isProduction } from "./config/env.js";
import { UPLOADS_DIR } from "./services/storageService.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const app = express();
app.set("trust proxy", 1);
// Segurança
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

// CORS configurável via FRONTEND_URL (aceita lista separada por vírgula)
const allowedOrigins = env.FRONTEND_URL.split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      // Em desenvolvimento libera qualquer origem localhost.
      if (!isProduction && /^https?:\/\/localhost(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Origem não permitida pelo CORS"), false);
    },
    credentials: true,
  }),
);

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

// Arquivos enviados (storage local de desenvolvimento)
app.use(
  "/uploads",
  express.static(path.resolve(__dirname, "../uploads"), {
    maxAge: "30d",
    immutable: true,
  }),
);

// Log básico de requisições
app.use((req, res, next) => {
  if (req.path.startsWith("/uploads")) return next();
  const start = Date.now();
  res.on("finish", () => {
    const ms = Date.now() - start;
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} - ${ms}ms`);
  });
  next();
});

// Rate limiting global e rotas da API
app.use("/api", apiLimiter);
app.use("/api", routes);

// 404
app.use(notFoundHandler);

// Tratamento global de erros (sem stack trace em produção)
// eslint-disable-next-line no-unused-vars
app.use(errorHandler);

export default app;
