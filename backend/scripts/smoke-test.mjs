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

  const { default: app } = await import(
    pathToFileURL(path.join(backendDir, "src", "app.js")).href
  );
  await new Promise((resolve) => {
    server = app.listen(4001, resolve);
  });
  baseUrl = "http://127.0.0.1:4001/api";

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
  check("forgot-password retorna resetToken (dev)", forgot.status === 200 && forgot.body?.data?.resetToken);
  const resetToken = forgot.body?.data?.resetToken;
  const reset = await api("POST", "/auth/reset-password", {
    body: { token: resetToken, newPassword: "novaSenha123" },
  });
  check("reset-password → 200", reset.status === 200);
  const relogin = await api("POST", "/auth/login", {
    body: { email: "smoke@test.dev", password: "novaSenha123" },
  });
  check("Login com nova senha", relogin.status === 200);

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
  console.log(`\n${"=".repeat(46)}`);
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