/**
 * localClient — adaptador de persistência do PUBLI-BUS.
 *
 * Mantém a MESMA interface pública consumida pelas telas (entities, auth,
 * files), porém agora delega para a API REST + PostgreSQL.
 *
 * localStorage é usado APENAS para:
 *   - token/sessão (em src/services/api.js);
 *   - configurações locais da interface (MaintenanceConfig);
 *   - conteúdo local de referência (HelpVideo).
 *
 * Não é mais utilizado como banco principal.
 */
import {
  api,
  getStoredUser,
  getPendingSession,
  saveSession,
  ApiError,
} from "@/services/api";

// ---------------------------------------------------------------------------
// Entidades locais de referência (configurações/UI — uso apropriado de localStorage)
// ---------------------------------------------------------------------------
const STORAGE_KEY = "publibus_data";
const LOCAL_ENTITIES = new Set(["MaintenanceConfig", "HelpVideo"]);
const DEV_OTP = "123456";

const readLocalData = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
};
const writeLocalData = (data) =>
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

function localEntity(name) {
  return {
    async list() {
      return readLocalData()[name] || [];
    },
    async create(values) {
      const data = readLocalData();
      const record = {
        ...values,
        id: crypto.randomUUID(),
        created_date: new Date().toISOString(),
        updated_date: new Date().toISOString(),
      };
      data[name] = [...(data[name] || []), record];
      writeLocalData(data);
      return record;
    },
    async update(id, values) {
      const data = readLocalData();
      let updated;
      data[name] = (data[name] || []).map((record) => {
        if (record.id !== id) return record;
        updated = { ...record, ...values, updated_date: new Date().toISOString() };
        return updated;
      });
      writeLocalData(data);
      return updated;
    },
    async delete(id) {
      const data = readLocalData();
      data[name] = (data[name] || []).filter((record) => record.id !== id);
      writeLocalData(data);
    },
  };
}

// ---------------------------------------------------------------------------
// Entidades persistidas na API REST (PostgreSQL)
// ---------------------------------------------------------------------------
const apiDelegates = {
  Campaign: {
    list: () => api.campaigns.list(),
    create: (values) => api.campaigns.create(values),
    update: (id, values) => api.campaigns.update(id, values),
    delete: (id) => api.campaigns.remove(id),
  },
  Advertiser: {
    list: () => api.advertisers.list(),
    create: (values) => api.advertisers.create(values),
    update: (id, values) => api.advertisers.update(id, values),
    delete: (id) => api.advertisers.remove(id),
  },
  Tablet: {
    list: () => api.tablets.list(),
    create: (values) => api.tablets.create(values),
    update: (id, values) => api.tablets.update(id, values),
    delete: (id) => api.tablets.remove(id),
  },
};

// ---------------------------------------------------------------------------
// localClient
// ---------------------------------------------------------------------------
export const localClient = {
  entities: new Proxy(
    {},
    {
      get(_target, name) {
        if (name in apiDelegates) return apiDelegates[name];
        if (LOCAL_ENTITIES.has(name)) return localEntity(name);
        // Qualquer outra entidade também funciona como dados locais,
        // garantindo que telas futuras não quebrem durante a migração.
        return localEntity(name);
      },
    },
  ),

  auth: {
    async register({ email, password }) {
      // O backend cria o usuário real (PostgreSQL) e retorna uma sessão.
      await api.auth.register({ email, password });
      // O OTP é simulado em ambiente de desenvolvimento (sem provedor de e-mail).
      return { otpCode: DEV_OTP };
    },

    async verifyOtp({ email, otpCode }) {
      if (otpCode !== DEV_OTP) {
        throw new Error("Código de verificação inválido");
      }
      const pending = getPendingSession();
      if (!pending?.token) {
        throw new Error(
          "Sessão de cadastro expirada. Por favor, faça login ou refaça o cadastro.",
        );
      }
      saveSession({ token: pending.token, user: pending.user });
      const user = pending.user;
      // Atualiza o perfil a partir da API para garantir dados atualizados.
      try {
        return { user: await api.auth.me() };
      } catch {
        return { user };
      }
    },

    async resendOtp(email) {
      if (!email) throw new Error("Usuário não encontrado");
      return { otpCode: DEV_OTP };
    },

    async loginViaEmailPassword(email, password) {
      const session = await api.auth.login({ email, password });
      return { user: session.user };
    },

    async me() {
      return api.auth.me();
    },

    logout() {
      api.auth.logout();
    },

    async resetPasswordRequest(email) {
      const result = await api.auth.forgotPassword({ email });
      return result;
    },

    async resetPassword({ resetToken, newPassword }) {
      if (!resetToken) throw new Error("Token de redefinição ausente");
      await api.auth.resetPassword({ token: resetToken, newPassword });
    },
  },

  files: {
    /**
     * Envia o arquivo para a API e retorna a URL persistida.
     * Não utiliza URL.createObjectURL como armazenamento definitivo.
     */
    async createUrl(file) {
      const stored = await api.uploads.upload(file);
      if (!stored?.fileUrl) {
        throw new ApiError("Upload concluído sem URL de retorno");
      }
      return stored.fileUrl;
    },
  },

  // Utilidades expostas para consumo avançado.
  api,
  getStoredUser,
};

export default localClient;