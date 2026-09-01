/**
 * Cliente HTTP centralizado da API PUBLI-BUS.
 *
 * Centraliza todas as requisições HTTP ao backend REST e faz o mapeamento
 * entre o formato usado pelas telas (snake_case) e o formato da API (camelCase).
 */
const API_URL = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");

const TOKEN_KEY = "publibus_token";
const USER_KEY = "publibus_current_user";
const PENDING_SESSION_KEY = "publibus_pending_session";

export class ApiError extends Error {
  constructor(message, status = 0, errors = []) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors || [];
  }
}

// ---------------------------------------------------------------------------
// Sessão (token + usuário) — localStorage é usado APENAS para sessão
// ---------------------------------------------------------------------------
function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || null;
  } catch {
    return null;
  }
}

function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(PENDING_SESSION_KEY);
}

export function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || "null");
  } catch {
    return null;
  }
}

function setStoredUser(user) {
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function saveSession({ token, user }) {
  if (token) setToken(token);
  if (user) setStoredUser(user);
  localStorage.removeItem(PENDING_SESSION_KEY);
}

export function savePendingSession(session) {
  try {
    localStorage.setItem(PENDING_SESSION_KEY, JSON.stringify(session || null));
  } catch {
    /* ignore */
  }
}

export function getPendingSession() {
  try {
    return JSON.parse(localStorage.getItem(PENDING_SESSION_KEY) || "null");
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Requisições
// ---------------------------------------------------------------------------
async function request(
  path,
  { method = "GET", body, formData, auth = true, raw, extraHeaders } = {},
) {
  const headers = { ...extraHeaders };
  let payload;
  if (formData) {
    payload = formData;
  } else if (body !== undefined) {
    if (typeof body === "string" || body instanceof FormData) payload = body;
    else {
      headers["Content-Type"] = "application/json";
      payload = JSON.stringify(body);
    }
  }
  if (auth && getToken()) headers.Authorization = `Bearer ${getToken()}`;

  let res;
  try {
    res = await fetch(API_URL + path, { method, headers, body: payload });
  } catch {
    throw new ApiError(
      "Não foi possível conectar à API. Verifique se o backend está rodando.",
      0,
    );
  }

  if (raw) return res;

  let json = null;
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    try {
      json = await res.json();
    } catch {
      json = null;
    }
  }

  if (!res.ok) {
    if (res.status === 401 && auth) {
      // sessão expirada
      localStorage.removeItem(USER_KEY);
    }
    throw new ApiError(
      json?.message || `Erro ${res.status}`,
      res.status,
      json?.errors || [],
    );
  }

  if (res.status === 204) return { success: true, data: null };
  return json || { success: true, data: null };
}

/** Lista recursos com paginação e trata 403 sem quebrar telas. */
async function listResource(basePath, { token = getToken() } = {}) {
  try {
    const res = await request(basePath, {
      auth: Boolean(token),
      extraHeaders: token ? { Authorization: `Bearer ${token}` } : {},
      body: undefined,
    });
    return res?.data ?? [];
  } catch (err) {
    // ADVERTISER não acessa alguns recursos administrativos → lista vazia.
    if (err.status === 403) return [];
    throw err;
  }
}
// ---------------------------------------------------------------------------
// Mapeamento de status (frontend minúsculo ↔ backend MAIÚSCULO)
// ---------------------------------------------------------------------------
const CAMPAIGN_STATUS = {
  DRAFT: "draft",
  SCHEDULED: "scheduled",
  ACTIVE: "active",
  PAUSED: "paused",
  FINISHED: "finished",
  CANCELLED: "cancelled",
};
const TABLET_STATUS = {
  ONLINE: "online",
  OFFLINE: "offline",
  MAINTENANCE: "maintenance",
};

function toFrontStatus(status, map) {
  return map[status] || String(status || "").toLowerCase();
}

function toBackStatus(status, map) {
  const found = Object.keys(map).find((k) => map[k] === status);
  return found || String(status || "").toUpperCase();
}

// ---------------------------------------------------------------------------
// Mappers: backend (API) ↔ frontend (telas)
// ---------------------------------------------------------------------------
function campaignToFront(c) {
  const media = c.media?.[0];
  return {
    id: c.id,
    name: c.name,
    advertiser_id: c.advertiserId,
    advertiser_name:
      c.advertiser?.company?.name || c.advertiser?.user?.name || "",
    media_type: media
      ? String(media.fileType || "").startsWith("video")
        ? "video"
        : "image"
      : "",
    media_url: media?.fileUrl || "",
    media_id: media?.id || null,
    start_date: c.startDate || "",
    end_date: c.endDate || "",
    budget: c.budget != null ? Number(c.budget) : 0,
    status: toFrontStatus(c.status, CAMPAIGN_STATUS),
    display_order: 0,
    duration_seconds: c.durationSeconds ?? 10,
    created_date: c.createdAt,
    updated_date: c.updatedAt,
    buses: c.campaignBuses?.map((b) => b.bus) || [],
    spaces: c.campaignSpaces?.map((s) => s.advertisingSpace) || [],
  };
}

async function campaignToBackend(form) {
  let advertiserId = form.advertiser_id || null;
  if (!advertiserId && form.advertiser_name) {
    try {
      const advertisers = await api.advertisers.list();
      const found = (advertisers || []).find(
        (a) => a.name === form.advertiser_name,
      );
      advertiserId = found?.id || null;
    } catch {
      advertiserId = null;
    }
  }
  if (!advertiserId) {
    const me = getStoredUser();
    advertiserId = me?.advertiser_id || me?.advertiserId || null;
  }

  return {
    name: form.name,
    description: form.description || "",
    advertiserId,
    startDate: form.start_date
      ? new Date(form.start_date).toISOString()
      : null,
    endDate: form.end_date ? new Date(form.end_date).toISOString() : null,
    status: toBackStatus(form.status || "draft", CAMPAIGN_STATUS),
    durationSeconds: Number(form.duration_seconds ?? 10) || 0,
    budget: Number(form.budget ?? 0) || 0,
    busIds: form.bus_ids?.length ? form.bus_ids : undefined,
    spaceIds: form.space_ids?.length ? form.space_ids : undefined,
    mediaUrl: form.media_url || null,
    mediaType:
      form.media_type ||
      (form.media_url
        ? String(form.media_url).match(/\.mp4($|\?)/i)
          ? "video/mp4"
          : "image/jpeg"
        : null),
  };
}

function tabletToFront(t) {
  return {
    id: t.id,
    device_id: t.code,
    patrimonio: t.code,
    code: t.code,
    bus: t.bus?.code || "",
    line: t.bus?.line || "",
    bus_id: t.busId || null,
    status: toFrontStatus(t.status, TABLET_STATUS),
    last_sync: t.lastSeenAt || "",
    system_version: "1.0.0",
    company_name: "",
    created_date: t.createdAt,
    updated_date: t.updatedAt,
  };
}

async function tabletToBackend(form) {
  let busId = form.bus_id || null;
  if (!busId && form.bus) {
    try {
      const buses = await api.buses.list();
      const found = (buses || []).find(
        (b) => b.code === form.bus || b.id === form.bus,
      );
      busId = found?.id || null;
    } catch {
      busId = null;
    }
  }
  return {
    code: form.device_id || form.code || "",
    busId,
    status: toBackStatus(form.status || "online", TABLET_STATUS),
  };
}

function advertiserToFront(a) {
  const company = a.company || {};
  const user = a.user || {};
  return {
    id: a.id,
    name: company.name || user.name || "",
    contact_name: user.name || "",
    email: company.email || user.email || "",
    phone: company.phone || "",
    cnpj: company.cnpj || "",
    status: "active",
    notes: a.notes || company.address || "",
    company_id: a.companyId,
    user_id: a.userId,
    created_date: a.createdAt,
    updated_date: a.updatedAt,
  };
}

function advertiserToBackend(form) {
  const payload = {
    name: form.name,
    email: form.email || null,
    phone: form.phone || null,
    cnpj: form.cnpj || null,
  };
  if (Object.prototype.hasOwnProperty.call(form, "contact_name")) {
    payload.contact_name = form.contact_name;
  }
  if (Object.prototype.hasOwnProperty.call(form, "notes")) {
    payload.notes = form.notes;
  }
  return payload;
}
// ---------------------------------------------------------------------------
// Normalização dos dados de sessão do usuário
// ---------------------------------------------------------------------------
function normalizeSessionUser(user) {
  if (!user) return user;
  const advertiser = user.advertiser || {};
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    advertiser_id: advertiser.id || null,
    companyId: advertiser.company?.id || null,
    company: advertiser.company || null,
  };
}

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------
export const api = {
  auth: {
    async register({ name, email, password }) {
      const res = await request("/auth/register", {
        method: "POST",
        body: { name: name || String(email).split("@")[0], email, password },
      });
      const { token, user } = res.data;
      savePendingSession({ token, user: normalizeSessionUser(user) });
      return res.data;
    },
    async login({ email, password }) {
      const res = await request("/auth/login", {
        method: "POST",
        body: { email, password },
      });
      saveSession({
        token: res.data.token,
        user: normalizeSessionUser(res.data.user),
      });
      return {
        token: res.data.token,
        user: normalizeSessionUser(res.data.user),
      };
    },
    async me() {
      const res = await request("/auth/me");
      const user = normalizeSessionUser(res.data.user);
      setStoredUser(user);
      return user;
    },
    async forgotPassword({ email }) {
      const res = await request("/auth/forgot-password", {
        method: "POST",
        body: { email },
        auth: false,
      });
      return res.data || {};
    },
    async resetPassword({ token, newPassword }) {
      const res = await request("/auth/reset-password", {
        method: "POST",
        body: { token, newPassword },
        auth: false,
      });
      return res.data;
    },
    logout() {
      clearSession();
    },
  },

  users: {
    list: () => listResource("/users").then((r) => r),
    get: (id) => request(`/users/${id}`).then((r) => r.data),
    create: (body) => request("/users", { method: "POST", body }).then((r) => r.data),
    update: (id, body) => request(`/users/${id}`, { method: "PUT", body }).then((r) => r.data),
    remove: (id) => request(`/users/${id}`, { method: "DELETE" }),
  },

  companies: {
    list: () => listResource("/companies").then((r) => r),
    get: (id) => request(`/companies/${id}`).then((r) => r.data),
    create: (body) => request("/companies", { method: "POST", body }).then((r) => r.data),
    update: (id, body) => request(`/companies/${id}`, { method: "PUT", body }).then((r) => r.data),
    remove: (id) => request(`/companies/${id}`, { method: "DELETE" }),
  },

  advertisers: {
    // Retorna objetos compostos (empresa + usuário) formatados para as telas.
    list: async () => {
      const res = await listResource("/advertisers");
      return (res || []).map(advertiserToFront);
    },
    get: async (id) =>
      advertiserToFront(
        await request(`/advertisers/${id}`).then((r) => r.data),
      ),
    create: async (form) => {
      const res = await request("/advertisers", {
        method: "POST",
        body: advertiserToBackend(form),
      });
      return advertiserToFront(res.data);
    },
    update: async (id, form) => {
      const res = await request(`/advertisers/${id}`, {
        method: "PUT",
        body: advertiserToBackend(form),
      });
      return advertiserToFront(res.data);
    },
    remove: (id) => request(`/advertisers/${id}`, { method: "DELETE" }),
  },

  buses: {
    list: () => listResource("/buses").then((r) => r),
    get: (id) => request(`/buses/${id}`).then((r) => r.data),
    create: (body) => request("/buses", { method: "POST", body }).then((r) => r.data),
    update: (id, body) => request(`/buses/${id}`, { method: "PUT", body }).then((r) => r.data),
    remove: (id) => request(`/buses/${id}`, { method: "DELETE" }),
  },

  spaces: {
    list: () => listResource("/advertising-spaces").then((r) => r),
    get: (id) => request(`/advertising-spaces/${id}`).then((r) => r.data),
    create: (body) => request("/advertising-spaces", { method: "POST", body }).then((r) => r.data),
    update: (id, body) =>
      request(`/advertising-spaces/${id}`, { method: "PUT", body }).then((r) => r.data),
    remove: (id) => request(`/advertising-spaces/${id}`, { method: "DELETE" }),
  },
campaigns: {
    // Retorna campanhas no formato das telas (snake_case + status minúsculo).
    list: async () => {
      const res = await listResource("/campaigns");
      return (res || []).map(campaignToFront);
    },
    get: async (id) =>
      campaignToFront(await request(`/campaigns/${id}`).then((r) => r.data)),
    create: async (form) => {
      const payload = await campaignToBackend(form);
      const res = await request("/campaigns", {
        method: "POST",
        body: payload,
      });
      return campaignToFront(res.data);
    },
    update: async (id, form) => {
      const payload = await campaignToBackend(form);
      const res = await request(`/campaigns/${id}`, {
        method: "PUT",
        body: payload,
      });
      return campaignToFront(res.data);
    },
    updateStatus: async (id, status) => {
      const res = await request(`/campaigns/${id}/status`, {
        method: "PATCH",
        body: { status: toBackStatus(status, CAMPAIGN_STATUS) },
      });
      return campaignToFront(res.data);
    },
    remove: (id) => request(`/campaigns/${id}`, { method: "DELETE" }),
  },

  media: {
    listByCampaign: (campaignId) =>
      listResource(`/campaigns/${campaignId}/media`).then((r) => r),
    create: (campaignId, formData) =>
      request(`/campaigns/${campaignId}/media`, {
        method: "POST",
        formData,
      }).then((r) => r.data),
    remove: (id) => request(`/media/${id}`, { method: "DELETE" }),
  },

  tablets: {
    // Retorna tablets no formato das telas (device_id, patrimonio, bus, ...).
    list: async () => {
      const res = await listResource("/tablets");
      return (res || []).map(tabletToFront);
    },
    get: async (id) =>
      tabletToFront(await request(`/tablets/${id}`).then((r) => r.data)),
    create: async (form) => {
      const payload = await tabletToBackend(form);
      const res = await request("/tablets", { method: "POST", body: payload });
      return tabletToFront(res.data);
    },
    update: async (id, form) => {
      const payload = await tabletToBackend(form);
      const res = await request(`/tablets/${id}`, {
        method: "PUT",
        body: payload,
      });
      return tabletToFront(res.data);
    },
    remove: (id) => request(`/tablets/${id}`, { method: "DELETE" }),
  },

  impressions: {
    create: (body) =>
      request("/impressions", { method: "POST", body }).then((r) => r.data),
    list: () => listResource("/impressions").then((r) => r),
  },

  metrics: {
    get: (query = "") => request(`/metrics${query}`).then((r) => r.data),
    byCampaign: (id) =>
      request(`/metrics/campaigns/${id}`).then((r) => r.data),
  },

  dashboard: {
    get: () => request("/dashboard").then((r) => r.data),
  },

  reports: {
    campaigns: (query = "") =>
      request(`/reports/campaigns${query}`).then((r) => r.data),
    campaignById: (id) =>
      request(`/reports/campaigns/${id}`).then((r) => r.data),
    advertiserById: (id) =>
      request(`/reports/advertisers/${id}`).then((r) => r.data),
  },

  uploads: {
    // Envia o arquivo para a API e retorna a URL persistida.
    async upload(file) {
      if (!file) throw new ApiError("Nenhum arquivo informado");
      const formData = new FormData();
      formData.append("file", file);
      const res = await request("/uploads", {
        method: "POST",
        formData,
        auth: Boolean(getToken()),
      });
      return res.data;
    },
  },

  health: () => request("/health", { auth: false }).then((r) => r),
};

export { saveSession, getToken, toFrontStatus, toBackStatus };