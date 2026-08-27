const STORAGE_KEY = "publibus_data";
const USER_KEY = "publibus_current_user";
const RESET_TOKEN_KEY = "publibus_reset_tokens";
const OTP_CODE = "123456";

const readData = () => JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
const writeData = (data) => localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

const entity = (name) => ({
  async list() {
    return readData()[name] || [];
  },
  async create(values) {
    const data = readData();
    const record = {
      ...values,
      id: crypto.randomUUID(),
      created_date: new Date().toISOString(),
      updated_date: new Date().toISOString(),
    };
    data[name] = [...(data[name] || []), record];
    writeData(data);
    return record;
  },
  async update(id, values) {
    const data = readData();
    let updated;
    data[name] = (data[name] || []).map((record) => {
      if (record.id !== id) return record;
      updated = { ...record, ...values, updated_date: new Date().toISOString() };
      return updated;
    });
    writeData(data);
    return updated;
  },
  async delete(id) {
    const data = readData();
    data[name] = (data[name] || []).filter((record) => record.id !== id);
    writeData(data);
  },
});

const readUsers = () => JSON.parse(localStorage.getItem("publibus_users") || "[]");
const writeUsers = (users) => localStorage.setItem("publibus_users", JSON.stringify(users));
const readResetTokens = () =>
  JSON.parse(localStorage.getItem(RESET_TOKEN_KEY) || "{}");
const writeResetTokens = (tokens) =>
  localStorage.setItem(RESET_TOKEN_KEY, JSON.stringify(tokens));

export const localClient = {
  entities: new Proxy({}, { get: (_, name) => entity(name) }),
  auth: {
    async register({ email, password }) {
      const users = readUsers();
      if (users.some((user) => user.email === email)) throw new Error("Este e-mail já está cadastrado");
      writeUsers([
        ...users,
        {
          id: crypto.randomUUID(),
          email,
          password,
          role: "user",
          otpCode: OTP_CODE,
        },
      ]);
      return { otpCode: OTP_CODE };
    },
    async verifyOtp({ email, otpCode }) {
      if (otpCode !== OTP_CODE) throw new Error("Código de verificação inválido");
      const user = readUsers().find((item) => item.email === email);
      if (!user) throw new Error("Usuário não encontrado");
      writeUsers(readUsers().map((item) =>
        item.id === user.id ? { ...item, verified: true } : item,
      ));
      const verifiedUser = { ...user, verified: true };
      localStorage.setItem(USER_KEY, JSON.stringify(verifiedUser));
      return { user: verifiedUser };
    },
    async resendOtp(email) {
      if (!readUsers().some((item) => item.email === email)) {
        throw new Error("Usuário não encontrado");
      }
      return { otpCode: OTP_CODE };
    },
    async loginViaEmailPassword(email, password) {
      const user = readUsers().find((item) => item.email === email && item.password === password);
      if (!user) throw new Error("E-mail ou senha inválidos");
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      return { user };
    },
    async me() {
      const user = JSON.parse(localStorage.getItem(USER_KEY) || "null");
      if (!user) throw new Error("Não autenticado");
      return user;
    },
    logout() {
      localStorage.removeItem(USER_KEY);
    },
    async resetPasswordRequest(email) {
      const user = readUsers().find((item) => item.email === email);
      if (user) {
        const resetToken = crypto.randomUUID();
        const tokens = readResetTokens();
        tokens[resetToken] = {
          userId: user.id,
          expiresAt: Date.now() + 15 * 60 * 1000,
        };
        writeResetTokens(tokens);
        return { resetToken };
      }
      return {};
    },
    async resetPassword({ resetToken, newPassword }) {
      const tokens = readResetTokens();
      const tokenData = tokens[resetToken];
      if (!tokenData || tokenData.expiresAt < Date.now()) {
        throw new Error("Link de redefinição inválido ou expirado");
      }
      writeUsers(readUsers().map((item) =>
        item.id === tokenData.userId ? { ...item, password: newPassword } : item,
      ));
      delete tokens[resetToken];
      writeResetTokens(tokens);
    },
  },
  files: {
    async createUrl(file) {
      return URL.createObjectURL(file);
    },
  },
};
