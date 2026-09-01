import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";
import { env } from "../config/env.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const UPLOADS_DIR = path.resolve(__dirname, "../../uploads");

/** Tipos de arquivo permitidos (MIME → extensões). */
export const ALLOWED_MIME = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
  "video/mp4": [".mp4"],
};

export function isAllowedMime(mime) {
  return Boolean(ALLOWED_MIME[mime]);
}

export function allowedExtensions() {
  return Object.values(ALLOWED_MIME).flat();
}

export function assertAllowedFile(mime, originalName) {
  const extensions = ALLOWED_MIME[mime];
  if (!extensions) {
    return {
      ok: false,
      message: `Tipo de arquivo não permitido: ${mime}. Permitidos: ${Object.keys(ALLOWED_MIME).join(", ")}`,
    };
  }
  const ext = path.extname(originalName || "").toLowerCase();
  if (ext && !extensions.includes(ext)) {
    return {
      ok: false,
      message: `Extensão "${ext}" não permitida para o tipo ${mime}`,
    };
  }
  return { ok: true };
}

function buildLocalUrl(fileName) {
  return `${env.API_URL.replace(/\/$/, "")}/uploads/${fileName}`;
}

/**
 * Camada de armazenamento persistente.
 * Interface preparada para Supabase Storage (ou qualquer storage compatível).
 */
class LocalStorageDriver {
  async upload({ buffer, mimetype, originalName }) {
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
    const ext = path.extname(originalName || "").toLowerCase();
    const safeExt = allowedExtensions().includes(ext) ? ext : "";
    const fileName = `${crypto.randomUUID()}${safeExt}`;
    await fs.writeFile(path.join(UPLOADS_DIR, fileName), buffer);
    return {
      fileName,
      fileUrl: buildLocalUrl(fileName),
      fileSize: buffer.length,
      fileType: mimetype,
    };
  }

  async delete(fileUrl) {
    if (!fileUrl) return;
    const base = env.API_URL.replace(/\/$/, "");
    const fileName = fileUrl.replace(base + "/uploads/", "").split("?")[0];
    if (!fileName || fileName.includes("..") || fileName.includes("/")) return;
    try {
      await fs.unlink(path.join(UPLOADS_DIR, fileName));
    } catch {
      // arquivo já inexistente: ignora
    }
  }
}

class SupabaseStorageDriver {
  #client;
  #bucket;

  constructor() {
    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error(
        "STORAGE_DRIVER=supabase requer SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY",
      );
    }
    this.#bucket = env.SUPABASE_BUCKET || "publibus-media";
    // Módulo ESM do SDK
    import("@supabase/supabase-js").then(({ createClient }) => {
      this.#client = createClient(
        env.SUPABASE_URL,
        env.SUPABASE_SERVICE_ROLE_KEY,
        { auth: { persistSession: false } },
      );
    });
  }

  async upload({ buffer, mimetype, originalName }) {
    if (!this.#client) throw new Error("Cliente Supabase ainda não iniciado");
    const ext = path.extname(originalName || "").toLowerCase();
    const safeExt = allowedExtensions().includes(ext) ? ext : "";
    const objectName = `${crypto.randomUUID()}${safeExt}`;
    const { error } = await this.#client.storage
      .from(this.#bucket)
      .upload(objectName, buffer, { contentType: mimetype });
    if (error) throw new Error(`Erro no upload Supabase: ${error.message}`);
    const { data } = this.#client.storage
      .from(this.#bucket)
      .getPublicUrl(objectName);
    return {
      fileName: objectName,
      fileUrl: data.publicUrl,
      fileSize: buffer.length,
      fileType: mimetype,
    };
  }

  async delete(fileUrl) {
    if (!this.#client || !fileUrl) return;
    const objectName = fileUrl.split("/").pop();
    if (!objectName) return;
    await this.#client.storage.from(this.#bucket).remove([objectName]);
  }
}

let driver;
function getDriver() {
  if (driver) return driver;
  if (env.STORAGE_DRIVER === "supabase") {
    driver = new SupabaseStorageDriver();
  } else {
    driver = new LocalStorageDriver();
  }
  return driver;
}

export const storageService = {
  upload(file) {
    return getDriver().upload(file);
  },
  delete(fileUrl) {
    return getDriver().delete(fileUrl);
  },
  get UPLOADS_DIR() {
    return UPLOADS_DIR;
  },
};