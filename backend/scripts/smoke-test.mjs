/**
 * Smoke test automatizado do backend PUBLI-BUS.
 *
 * Sobe um PostgreSQL real temporário (embedded-postgres), aplica migrations,
 * roda o seed e valida os principais endpoints: autenticação, RBAC, CRUD,
 * relacionamentos, métricas, dashboard, relatórios e isolamento entre
 * anunciantes.
 *
 * Executar com: npm run test:smoke
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.resolve(__dirname, "..");
const PG_DATA_DIR = path.join(backendDir, ".tmp-pg");

let pg;
let server;
let baseUrl;

let passed = 0;
let failed = 0;
const failures = [];

function check(name, condition, extra = "") {
  if (condition) {
    passed += 1;
    console.log(`  ✅ ${name}`);
  } else {
    failed += 1;
    failures.push(name);
    console.error(`  ❌ ${name} ${extra}`);
  }
}

async function api(method, urlPath, { token, body, formData } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload;
  if (formData) {
    payload = formData;
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }
  const res = await fetch(`${baseUrl}${urlPath}`, {
    method,
    headers,
    body: payload,
  });
  const ct = res.headers.get("content-type") || "";
  const json = ct.includes("application/json") ? await res.json() : null;
  return { status: res.status, body: json };
}

async function startEmbeddedPostgres() {
  fs.rmSync(PG_DATA_DIR, { recursive: true, force: true });
  const { default: EmbeddedPostgres } = await import("embedded-postgres");
  pg = new EmbeddedPostgres({
    databaseDir: PG_DATA_DIR,
    user: "postgres",
    password: "postgres",
    port: 55432,
    persistent: true,
  });
  await pg.initialise();
  await pg.start();
  await pg.createDatabase("publibus_test");
  return `postgresql://postgres:postgres@127.0.0.1:55432/publibus_test?schema=public`;
}

function runPrisma(command, databaseUrl) {
  execSync(`npx prisma ${command}`, {
    cwd: backendDir,
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: ["ignore", "pipe", "pipe"],
  });
}
async function main() {
  console.log("🔌 Iniciando PostgreSQL temporário...");
  const databaseUrl = await startEmbeddedPostgres();

  console.log("📦 Aplicando migrations...");
  runPrisma("migrate deploy", databaseUrl);

  console.log("🌱 Rodando seed...");
  runPrisma("db seed", databaseUrl);

  console.log("🚀 Iniciando a API...");
  process.env.DATABASE_URL = databaseUrl;
  process.env.JWT_SECRET = "smoke-test-secret-0123456789abcdef";
  process.env.NODE_ENV = "test";
  process.env.API_URL = "http://127.0.0.1:4001";
  // Presupuesto de rate-limit alto para que los tests funcionales no sufran 429
  // por acumular llamadas en la misma ventana (los límites reales siguen bajos).
  process.env.RATE_LIMIT_AUTH_MAX = "30";
  process.env.RATE_LIMIT_OTP_MAX = "30";

  const { default: app } = await import(
    pathToFileURL(path.join(backendDir, "src", "app.js")).href
  );
  await new Promise((resolve) => {
    server = app.listen(4001, resolve);
  });
  baseUrl = "http://127.0.0.1:4001/api";

  // Mismo client Prisma que usa la API (mismo proceso): permite expirar códigos.
  const { prisma } = await import(
    pathToFileURL(path.join(backendDir, "src", "utils", "prisma.js")).href
  );

  // ------------------------------------------------------------------
  console.log("\n1) Health check");
  const health = await api("GET", "/health");
  check("GET /api/health → 200 ok", health.status === 200 && health.body?.status === "ok");

  // ------------------------------------------------------------------
  console.log("\n2) Autenticação");
  const loginAdmin = await api("POST", "/auth/login", {
    body: { email: "admin@publibus.dev", password: "admin123" },
  });
  check("Login ADMIN", loginAdmin.status === 200 && loginAdmin.body?.data?.token);
  const adminToken = loginAdmin.body.data.token;

  const loginOp = await api("POST", "/auth/login", {
    body: { email: "operator@publibus.dev", password: "operator123" },
  });
  check("Login OPERATOR", loginOp.status === 200);
  const operatorToken = loginOp.body.data.token;

  const loginAd = await api("POST", "/auth/login", {
    body: { email: "anunciante@publibus.dev", password: "anunciante123" },
  });
  check("Login ADVERTISER", loginAd.status === 200);
  const advertiserToken = loginAd.body.data.token;

  const me = await api("GET", "/auth/me", { token: adminToken });
  check(
    "GET /auth/me",
    me.status === 200 && me.body?.data?.user?.email === "admin@publibus.dev",
  );
  check("Me não expõe passwordHash", !JSON.stringify(me.body).includes("passwordHash"));

  const meNoAuth = await api("GET", "/auth/me");
  check("GET /auth/me sem token → 401", meNoAuth.status === 401);

  const badLogin = await api("POST", "/auth/login", {
    body: { email: "admin@publibus.dev", password: "errada123" },
  });
  check("Login com senha errada → 401", badLogin.status === 401);

  const invalidBody = await api("POST", "/auth/login", { body: { email: "x" } });
  check(
    "Validação Zod → 422 estruturado",
    invalidBody.status === 422 &&
      invalidBody.body?.success === false &&
      Array.isArray(invalidBody.body.errors),
  );

  // ------------------------------------------------------------------
  console.log("\n3) RBAC");
  const busesAsAdvertiser = await api("GET", "/buses", { token: advertiserToken });
  check("ADVERTISER em /buses → 403", busesAsAdvertiser.status === 403);

  const usersAsOperator = await api("GET", "/users", { token: operatorToken });
  check("OPERATOR em /users → 200", usersAsOperator.status === 200);

  const createUserAsOperator = await api("POST", "/users", {
    token: operatorToken,
    body: { name: "X", email: "x@x.com", password: "123456", role: "OPERATOR" },
  });
  check("OPERATOR criar usuário → 403", createUserAsOperator.status === 403);
// ------------------------------------------------------------------
  console.log("\n4) CRUD Buses / Tablets / Spaces");
  const busCreated = await api("POST", "/buses", {
    token: adminToken,
    body: { code: "BUS-TEST-01", plate: "TST-1234", model: "Teste", line: "Linha Teste" },
  });
  check("POST /buses → 201", busCreated.status === 201);
  const busId = busCreated.body.data.id;

  const buses = await api("GET", "/buses", { token: adminToken });
  check("GET /buses → lista com seed", Array.isArray(buses.body?.data) && buses.body.data.length >= 3);

  const busDup = await api("POST", "/buses", {
    token: adminToken,
    body: { code: "BUS-TEST-01" },
  });
  check("Bus duplicado → 409", busDup.status === 409);

  const busUpdated = await api("PUT", `/buses/${busId}`, {
    token: adminToken,
    body: { line: "Linha Atualizada" },
  });
  check("PUT /buses/:id → 200", busUpdated.status === 200 && busUpdated.body.data.line === "Linha Atualizada");

  const tabletCreated = await api("POST", "/tablets", {
    token: adminToken,
    body: { code: "TAB-TEST-01", busId, status: "ONLINE" },
  });
  check("POST /tablets → 201", tabletCreated.status === 201);
  const tabletId = tabletCreated.body.data.id;

  const spaceCreated = await api("POST", "/advertising-spaces", {
    token: adminToken,
    body: { busId, name: "Espaço Teste", type: "EXTERNAL_SIDE", price: 1000 },
  });
  check("POST /advertising-spaces → 201", spaceCreated.status === 201);
  const spaceId = spaceCreated.body.data.id;

  // ------------------------------------------------------------------
  console.log("\n5) Anunciantes e Empresas");
  const advCreated = await api("POST", "/advertisers", {
    token: adminToken,
    body: { name: "Empresa Teste Smoke", email: "smoke@test.dev", phone: "11999998888", cnpj: "00.000.000/0001-00" },
  });
  check("POST /advertisers → 201 (cria empresa + usuário)", advCreated.status === 201);
  const advId = advCreated.body.data.id;
  const advCompanyId = advCreated.body.data.companyId;

  const companies = await api("GET", "/companies", { token: adminToken });
  check(
    "GET /companies → inclui empresa criada",
    companies.body?.data?.some((c) => c.id === advCompanyId),
  );

  const advUpdated = await api("PUT", `/advertisers/${advId}`, {
    token: adminToken,
    body: { phone: "11999990000" },
  });
  check("PUT /advertisers/:id → 200", advUpdated.status === 200);

  // ------------------------------------------------------------------
  console.log("\n6) Campanhas e relacionamentos");
  const campaignCreated = await api("POST", "/campaigns", {
    token: adminToken,
    body: {
      name: "Campanha Smoke Test",
      advertiserId: advId,
      startDate: new Date(Date.now() - 1000 * 60).toISOString(),
      endDate: new Date(Date.now() + 86400000 * 10).toISOString(),
      budget: 1500,
      status: "DRAFT",
      durationSeconds: 12,
      busIds: [busId],
      spaceIds: [spaceId],
      mediaUrl: "https://cdn.example.com/smoke.jpg",
      mediaType: "image/jpeg",
    },
  });
  check("POST /campaigns → 201", campaignCreated.status === 201);
  const campaignId = campaignCreated.body.data.id;

  const campaign = await api("GET", `/campaigns/${campaignId}`, { token: adminToken });
  check(
    "Campanha com relações (buses/spaces/media)",
    campaign.body?.data?.campaignBuses?.length === 1 &&
      campaign.body?.data?.campaignSpaces?.length === 1 &&
      campaign.body?.data?.media?.length === 1,
  );

  const statusPatch = await api("PATCH", `/campaigns/${campaignId}/status`, {
    token: adminToken,
    body: { status: "ACTIVE" },
  });
  check("PATCH status → ACTIVE", statusPatch.status === 200 && statusPatch.body.data.status === "ACTIVE");

  const spaceAfterActivate = await api("GET", `/advertising-spaces/${spaceId}`, {
    token: adminToken,
  });
  check("Espaço fica OCCUPIED ao ativar campanha", spaceAfterActivate.body?.data?.status === "OCCUPIED");

  const campaignUpdated = await api("PUT", `/campaigns/${campaignId}`, {
    token: adminToken,
    body: { name: "Campanha Smoke Test Editada", budget: 2500 },
  });
  check("PUT /campaigns/:id → 200", campaignUpdated.status === 200 && campaignUpdated.body.data.name === "Campanha Smoke Test Editada");
// ------------------------------------------------------------------
  console.log("\n7) Impressões, métricas, dashboard e relatórios");
  const impression = await api("POST", "/impressions", {
    token: adminToken,
    body: { campaignId, tabletId, durationSeconds: 15 },
  });
  check("POST /impressions → 200", impression.status === 200 && impression.body.data.id);

  const tabletTouched = await api("GET", `/tablets/${tabletId}`, { token: adminToken });
  check("Tablet atualizado (lastSeenAt/ONLINE)", tabletTouched.body?.data?.lastSeenAt != null);

  const metrics = await api("GET", "/metrics", { token: adminToken });
  check(
    "GET /metrics → totals",
    metrics.status === 200 &&
      metrics.body?.data?.totalImpressions >= 41 &&
      metrics.body?.data?.byPeriod?.length > 0,
  );

  const metricsCampaign = await api("GET", `/metrics/campaigns/${campaignId}`, {
    token: adminToken,
  });
  check("GET /metrics/campaigns/:id", metricsCampaign.status === 200 && metricsCampaign.body?.data?.totalImpressions >= 1);

  const dashboard = await api("GET", "/dashboard", { token: adminToken });
  check(
    "GET /dashboard com totais reais",
    dashboard.status === 200 &&
      dashboard.body?.data?.totalCampaigns >= 4 &&
      dashboard.body?.data?.totalBuses >= 4 &&
      dashboard.body?.data?.totalImpressions >= 41,
  );

  const reports = await api("GET", "/reports/campaigns", { token: adminToken });
  check(
    "GET /reports/campaigns → array c/ report",
    Array.isArray(reports.body?.data) && reports.body.data.some((c) => typeof c.report?.impressions === "number"),
  );

  const reportCampaign = await api("GET", `/reports/campaigns/${campaignId}`, {
    token: adminToken,
  });
  check("GET /reports/campaigns/:id com daily", reportCampaign.status === 200 && Array.isArray(reportCampaign.body?.data?.daily));

  // ------------------------------------------------------------------
  console.log("\n8) Isolamento entre anunciantes (regra crítica)");
  const adv2 = await api("POST", "/advertisers", {
    token: adminToken,
    body: { name: "Empresa Concorrente", email: "rival@test.dev", cnpj: "11.111.111/0001-11" },
  });
  const adv2Campaign = await api("POST", "/campaigns", {
    token: adminToken,
    body: { name: "Campanha do Concorrente", advertiserId: adv2.body.data.id, status: "ACTIVE" },
  });
  const rivalCampaignId = adv2Campaign.body.data.id;

  const adversaryTries = await api("GET", `/campaigns/${rivalCampaignId}`, {
    token: advertiserToken,
  });
  check("ADVERTISER não lê campanha de outro → 404", adversaryTries.status === 404);

  const adversaryList = await api("GET", "/campaigns", { token: advertiserToken });
  check(
    "ADVERTISER vê somente as própias campanhas",
    adversaryList.body?.data?.every((c) => c.id !== rivalCampaignId) &&
      adversaryList.body?.data?.length < 4,
  );

  const adversaryDashboard = await api("GET", "/dashboard", { token: advertiserToken });
  check("Dashboard do ADVERTISER escopado", adversaryDashboard.body?.data?.totalCampaigns <= 3);

  // ------------------------------------------------------------------
  console.log("\n9) Senha (forgot/reset)");
  const forgot = await api("POST", "/auth/forgot-password", {
    body: { email: "smoke@test.dev" },
  });
  check(
    "forgot-password (dev) devolve devResetLink e NUNCA resetToken",
    forgot.status === 200 &&
      typeof forgot.body?.data?.devResetLink === "string" &&
      !("resetToken" in forgot.body.data),
  );
  const resetToken = new URL(forgot.body.data.devResetLink).searchParams.get("token");
  const reset = await api("POST", "/auth/reset-password", {
    body: { token: resetToken, newPassword: "novaSenha123" },
  });
  check("reset-password → 200", reset.status === 200);
  const relogin = await api("POST", "/auth/login", {
    body: { email: "smoke@test.dev", password: "novaSenha123" },
  });
  check("Login com nova senha", relogin.status === 200);

  const reuseToken = await api("POST", "/auth/reset-password", {
    body: { token: resetToken, newPassword: "outraSenha456" },
  });
  check("Reset token reusado → 400 (uso único)", reuseToken.status === 400);

  const badToken = await api("POST", "/auth/reset-password", {
    body: { token: "token-invalido-abc", newPassword: "outraSenha456" },
  });
  check("Reset token inválido → 400", badToken.status === 400);

  const shortPass = await api("POST", "/auth/reset-password", {
    body: { token: resetToken, newPassword: "123" },
  });
  check("Nova senha demasiado curta → 422", shortPass.status === 422);

  const forgot2 = await api("POST", "/auth/forgot-password", {
    body: { email: "smoke@test.dev" },
  });
  const resetToken2 = new URL(forgot2.body.data.devResetLink).searchParams.get("token");
  await prisma.authCode.updateMany({
    where: {
      purpose: "PASSWORD_RESET",
      user: { is: { email: "smoke@test.dev" } },
      usedAt: null,
    },
    data: { expiresAt: new Date(Date.now() - 1000) },
  });
  const expiredReset = await api("POST", "/auth/reset-password", {
    body: { token: resetToken2, newPassword: "outraSenha456" },
  });
  check("Reset token expirado → 400", expiredReset.status === 400);

  const notExists = await api("POST", "/auth/forgot-password", {
    body: { email: "noexiste@test.dev" },
  });
  check(
    "forgot-password email inexistente → 200 sem vazamento",
    notExists.status === 200 &&
      notExists.body?.data &&
      !("devResetLink" in notExists.body.data) &&
      !JSON.stringify(notExists.body).includes("token"),
  );

  // ------------------------------------------------------------------
  console.log("\n10) Upload de mídia (multipart)");
  const form = new FormData();
  form.append(
    "file",
    new Blob([Buffer.from("89504e470d0a1a0a".repeat(8), "hex")], {
      type: "image/png",
    }),
    "tiny.png",
  );
  const uploadRes = await fetch(`${baseUrl}/campaigns/${campaignId}/media`, {
    method: "POST",
    headers: { Authorization: `Bearer ${adminToken}` },
    body: form,
  });
  const uploadJson = await uploadRes.json().catch(() => null);
  check(
    "POST media multipart → 201 com fileUrl",
    uploadRes.status === 201 && uploadJson?.data?.fileUrl?.includes("/uploads/"),
  );

  const mediaList = await api("GET", `/campaigns/${campaignId}/media`, {
    token: adminToken,
  });
  check("GET media da campanha", Array.isArray(mediaList.body?.data) && mediaList.body.data.length >= 2);

  if (uploadJson?.data?.id) {
    const delMedia = await api("DELETE", `/media/${uploadJson.data.id}`, {
      token: adminToken,
    });
    check("DELETE /media/:id → 204", delMedia.status === 204);
  }

  const badType = new FormData();
  badType.append("file", new Blob(["oops"], { type: "text/plain" }), "x.txt");
  const badUpload = await fetch(`${baseUrl}/campaigns/${campaignId}/media`, {
    method: "POST",
    headers: { Authorization: `Bearer ${adminToken}` },
    body: badType,
  });
  await badUpload.json().catch(() => null);
  check("Upload de tipo inválido → 400", badUpload.status === 400);

  // ------------------------------------------------------------------
  console.log("\n11) Perfil (PATCH /auth/me)");
  const meBefore = await api("GET", "/auth/me", { token: adminToken });
  const adminUserId = meBefore.body?.data?.user?.id;

  const patchMe = await api("PATCH", "/auth/me", {
    token: adminToken,
    body: {
      name: "Admin Smoke Perfil",
      avatarUrl: "https://cdn.example.com/avatar-smoke.png",
    },
  });
  check(
    "PATCH /auth/me atualiza nome + avatar",
    patchMe.status === 200 &&
      patchMe.body?.data?.user?.name === "Admin Smoke Perfil" &&
      patchMe.body?.data?.user?.avatarUrl === "https://cdn.example.com/avatar-smoke.png",
  );

  const meAfter = await api("GET", "/auth/me", { token: adminToken });
  check(
    "Perfil persistido + plan exposto (default FREE)",
    meAfter.body?.data?.user?.name === "Admin Smoke Perfil" &&
      meAfter.body?.data?.user?.avatarUrl === "https://cdn.example.com/avatar-smoke.png" &&
      meAfter.body?.data?.user?.plan === "FREE",
  );

  const patchNoAuth = await api("PATCH", "/auth/me", { body: { name: "X Y" } });
  check("PATCH /auth/me sem token → 401", patchNoAuth.status === 401);

  const patchShortName = await api("PATCH", "/auth/me", {
    token: adminToken,
    body: { name: "A" },
  });
  check("PATCH /auth/me nome curto → 422", patchShortName.status === 422);

  const patchBadUrl = await api("PATCH", "/auth/me", {
    token: adminToken,
    body: { avatarUrl: "no-es-una-url" },
  });
  check("PATCH /auth/me avatarUrl inválido → 422", patchBadUrl.status === 422);

  // Campos administrativos enviados no body são ignorados (whitelist no service).
  const patchPrivileged = await api("PATCH", "/auth/me", {
    token: adminToken,
    body: {
      name: "Admin Smoke Perfil 2",
      role: "OPERATOR",
      plan: "PRO",
      email: "hacked@publibus.dev",
      id: meBefore.body?.data?.user?.id,
    },
  });
  check(
    "PATCH /auth/me ignora role/plan/email/id",
    patchPrivileged.status === 200 &&
      patchPrivileged.body?.data?.user?.role === "ADMIN" &&
      patchPrivileged.body?.data?.user?.plan === "FREE" &&
      patchPrivileged.body?.data?.user?.email === "admin@publibus.dev" &&
      patchPrivileged.body?.data?.user?.id === adminUserId &&
      patchPrivileged.body?.data?.user?.name === "Admin Smoke Perfil 2",
  );

  // Lo que se altera es SIEMPRE el propio usuario del JWT, nunca el id del body.
  const otherUserPatch = await api("PATCH", "/auth/me", {
    token: advertiserToken,
    body: { id: adminUserId, name: "Nome do anunciante" },
  });
  check(
    "Id ajeno no body é ignorado (altera só o próprio)",
    otherUserPatch.status === 200 &&
      otherUserPatch.body?.data?.user?.id !== adminUserId &&
      otherUserPatch.body?.data?.user?.name === "Nome do anunciante",
  );

  // Token válido de um usuário inexistente → 401 (authMiddleware re-consulta a BD).
  const { default: jwt } = await import("jsonwebtoken");
  const ghostToken = jwt.sign(
    { sub: "00000000-0000-0000-0000-000000000000", role: "ADMIN" },
    "smoke-test-secret-0123456789abcdef",
    { expiresIn: "5m" },
  );
  const patchGhost = await api("PATCH", "/auth/me", {
    token: ghostToken,
    body: { name: "Ghost" },
  });
  check("PATCH /auth/me usuário inexistente → 401", patchGhost.status === 401);

  const meFinal = await api("GET", "/auth/me", { token: adminToken });
  check(
    "Nome + avatar finais persistidos",
    meFinal.body?.data?.user?.name === "Admin Smoke Perfil 2" &&
      meFinal.body?.data?.user?.avatarUrl === "https://cdn.example.com/avatar-smoke.png",
  );

  // ------------------------------------------------------------------
  console.log("\n12) Registro + OTP (modo dev)");
  const regValidation = await api("POST", "/auth/register", {
    body: { name: "X", email: "nuevo@test.dev", password: "123" },
  });
  check("Registro senha curta → 422", regValidation.status === 422);

  const reg1 = await api("POST", "/auth/register", {
    body: { name: "Usuario Nuevo", email: "nuevo@test.dev", password: "claveSegura123" },
  });
  check(
    "Registro dev devolve devOtp (6 dígitos) e NUNCA token",
    reg1.status === 201 &&
      typeof reg1.body?.data?.devOtp === "string" &&
      reg1.body.data.devOtp.length === 6 &&
      !reg1.body.data.token,
  );
  const otp1 = reg1.body.data.devOtp;

  const loginPend = await api("POST", "/auth/login", {
    body: { email: "nuevo@test.dev", password: "claveSegura123" },
  });
  check(
    "Login antes de verificar → 403 EMAIL_NOT_VERIFIED",
    loginPend.status === 403 && loginPend.body?.code === "EMAIL_NOT_VERIFIED",
  );

  const badOtp = await api("POST", "/auth/verify-otp", {
    body: { email: "nuevo@test.dev", otpCode: "000000" },
  });
  check("OTP inválido → 401", badOtp.status === 401);

  const verifyOk = await api("POST", "/auth/verify-otp", {
    body: { email: "nuevo@test.dev", otpCode: otp1 },
  });
  check(
    "OTP válido → sessão (token + user)",
    verifyOk.status === 200 &&
      Boolean(verifyOk.body?.data?.token) &&
      verifyOk.body?.data?.user?.email === "nuevo@test.dev",
  );

  const verifyReuse = await api("POST", "/auth/verify-otp", {
    body: { email: "nuevo@test.dev", otpCode: otp1 },
  });
  check("OTP reutilizado → 401 (uso único)", verifyReuse.status === 401);

  const loginVerified = await api("POST", "/auth/login", {
    body: { email: "nuevo@test.dev", password: "claveSegura123" },
  });
  check("Login após verificação → 200", loginVerified.status === 200);

  // Tentativas excessivas invalidam o código
  const reg2 = await api("POST", "/auth/register", {
    body: { name: "Usuario Dos", email: "dos@test.dev", password: "claveSegura123" },
  });
  const otp2 = reg2.body.data.devOtp;
  for (let i = 0; i < 5; i += 1) {
    await api("POST", "/auth/verify-otp", {
      body: { email: "dos@test.dev", otpCode: "111111" },
    });
  }
  const blocked = await api("POST", "/auth/verify-otp", {
    body: { email: "dos@test.dev", otpCode: otp2 },
  });
  check("Máx. tentativas → OTP correto deixa de valer", blocked.status === 401);

  // OTP não é universal
  const reg3 = await api("POST", "/auth/register", {
    body: { name: "Usuario Uno", email: "uno@test.dev", password: "claveSegura123" },
  });
  const otp3 = reg3.body.data.devOtp;
  const crossOtp = await api("POST", "/auth/verify-otp", {
    body: { email: "dos@test.dev", otpCode: otp3 },
  });
  check("OTP de outro usuário não funciona", crossOtp.status === 401);

  // OTP expirado
  const reg4 = await api("POST", "/auth/register", {
    body: { name: "Usuario Cuatro", email: "cuatro@test.dev", password: "claveSegura123" },
  });
  const otp4 = reg4.body.data.devOtp;
  await prisma.authCode.updateMany({
    where: {
      purpose: "EMAIL_VERIFICATION",
      user: { is: { email: "cuatro@test.dev" } },
      usedAt: null,
    },
    data: { expiresAt: new Date(Date.now() - 1000) },
  });
  const expiredOtp = await api("POST", "/auth/verify-otp", {
    body: { email: "cuatro@test.dev", otpCode: otp4 },
  });
  check("OTP expirado → 401", expiredOtp.status === 401);

  // Resend invalida o OTP anterior
  const reg5 = await api("POST", "/auth/register", {
    body: { name: "Usuario Cinco", email: "cinco@test.dev", password: "claveSegura123" },
  });
  const otp5 = reg5.body.data.devOtp;
  const resend = await api("POST", "/auth/resend-otp", {
    body: { email: "cinco@test.dev" },
  });
  check(
    "Resend OTP (dev) devolve novo devOtp",
    resend.status === 200 && typeof resend.body?.data?.devOtp === "string",
  );
  const oldOtpAfterResend = await api("POST", "/auth/verify-otp", {
    body: { email: "cinco@test.dev", otpCode: otp5 },
  });
  check("OTP anterior invalidado após resend → 401", oldOtpAfterResend.status === 401);
  const newOtpOk = await api("POST", "/auth/verify-otp", {
    body: { email: "cinco@test.dev", otpCode: resend.body.data.devOtp },
  });
  check("Novo OTP após resend funciona", newOtpOk.status === 200);

  // ------------------------------------------------------------------
  console.log("\n13) Modo produção (AUTH_DEV_MODE=false)");
  process.env.AUTH_DEV_MODE = "false";
  const prodReg = await api("POST", "/auth/register", {
    body: { name: "Prod User", email: "prod@test.dev", password: "claveSegura123" },
  });
  check(
    "Prod: register sem provider → 503 e NUNCA devOtp",
    prodReg.status === 503 && !JSON.stringify(prodReg.body).includes("devOtp"),
  );

  const prodForgot = await api("POST", "/auth/forgot-password", {
    body: { email: "smoke@test.dev" },
  });
  check(
    "Prod: forgot-password sem provider → 503 e NUNCA token/link",
    prodForgot.status === 503 &&
      !JSON.stringify(prodForgot.body).includes("resetToken") &&
      !JSON.stringify(prodForgot.body).includes("devResetLink"),
  );

  const prodForgotMissing = await api("POST", "/auth/forgot-password", {
    body: { email: "nadie@test.dev" },
  });
  check(
    "Prod: email inexistente → 200 genérico (sem enumeración)",
    prodForgotMissing.status === 200 &&
      !JSON.stringify(prodForgotMissing.body).includes("token"),
  );

  const prodLogin = await api("POST", "/auth/login", {
    body: { email: "prod@test.dev", password: "claveSegura123" },
  });
  check(
    "Prod: register falho não deixa usuário órfano (login → 401)",
    prodLogin.status === 401,
  );
  process.env.AUTH_DEV_MODE = "true";

  // ------------------------------------------------------------------
  console.log("\n14) Rate limit (grupo auth)");
  let reached429 = false;
  for (let i = 0; i < 8; i += 1) {
    const rl = await api("POST", "/auth/forgot-password", {
      body: { email: `rl${i}@test.dev` },
    });
    if (rl.status === 429) reached429 = true;
  }
  check("Rate limit auth → 429 alcanzado", reached429);

  const rlHeaders = await fetch(`${baseUrl}/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "rlheaders@test.dev" }),
  });
  check(
    "forgot-password expone headers de rate-limit",
    rlHeaders.headers?.get?.("ratelimit-policy") ||
      rlHeaders.headers?.get?.("ratelimit") ||
      rlHeaders.headers?.get?.("x-ratelimit-limit"),
  );
  console.log(`Resultado: ${passed} passaram · ${failed} falharam`);
  if (failures.length) {
    console.log("Falhas:", failures.join(", "));
    process.exitCode = 1;
  }
}

main()
  .catch((err) => {
    console.error("💥 Smoke test interrompido:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await new Promise((resolve) => (server ? server.close(resolve) : resolve()));
    } catch {}
    try {
      if (pg) await pg.stop();
    } catch {}
  });