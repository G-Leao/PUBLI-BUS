import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando seed de DESENVOLVIMENTO...");

  const passwordHash = (pwd) => bcrypt.hashSync(pwd, 10);

  // ---------- Usuários ----------
  const admin = await prisma.user.upsert({
    where: { email: "admin@publibus.dev" },
    update: {},
    create: {
      name: "Admin PUBLI-BUS (DEV)",
      email: "admin@publibus.dev",
      passwordHash: passwordHash("admin123"),
      role: "ADMIN",
    },
  });

  const operator = await prisma.user.upsert({
    where: { email: "operator@publibus.dev" },
    update: {},
    create: {
      name: "Operador PUBLI-BUS (DEV)",
      email: "operator@publibus.dev",
      passwordHash: passwordHash("operator123"),
      role: "OPERATOR",
    },
  });

  const advertiserUser = await prisma.user.upsert({
    where: { email: "anunciante@publibus.dev" },
    update: {},
    create: {
      name: "Anunciante DEV",
      email: "anunciante@publibus.dev",
      passwordHash: passwordHash("anunciante123"),
      role: "ADVERTISER",
    },
  });

  void admin;
  void operator;

  // ---------- Empresas ----------
  const companyA = await prisma.company.upsert({
    where: { cnpj: "12.345.678/0001-90" },
    update: {},
    create: {
      name: "Empresa Exemplo Alimentos (DEV)",
      cnpj: "12.345.678/0001-90",
      email: "contato@empresaexemplo.dev",
      phone: "(11) 99999-0001",
      address: "Av. Exemplo, 1000 - São Paulo/SP",
    },
  });

  const companyB = await prisma.company.upsert({
    where: { cnpj: "98.765.432/0001-10" },
    update: {},
    create: {
      name: "Tech Publicidade Ltda (DEV)",
      cnpj: "98.765.432/0001-10",
      email: "contato@techpub.dev",
      phone: "(11) 99999-0002",
      address: "Rua Tech, 250 - São Paulo/SP",
    },
  });

  // ---------- Anunciante (vínculo usuário ↔ empresa) ----------
  await prisma.advertiser.upsert({
    where: { userId: advertiserUser.id },
    update: { companyId: companyA.id },
    create: { userId: advertiserUser.id, companyId: companyA.id },
  });

  // ---------- Ônibus ----------
  const bus1 = await prisma.bus.upsert({
    where: { code: "BUS-DEV-001" },
    update: {},
    create: {
      code: "BUS-DEV-001",
      plate: "ABC-1D23",
      model: "Marcopolo Torino",
      line: "Linha 1000 - Centro",
      status: "ACTIVE",
    },
  });
  const bus2 = await prisma.bus.upsert({
    where: { code: "BUS-DEV-002" },
    update: {},
    create: {
      code: "BUS-DEV-002",
      plate: "XYZ-9E87",
      model: "Mercedes O500M",
      line: "Linha 2500 - Bairro Novo",
      status: "ACTIVE",
    },
  });
  const bus3 = await prisma.bus.upsert({
    where: { code: "BUS-DEV-003" },
    update: {},
    create: {
      code: "BUS-DEV-003",
      plate: "QWE-4R56",
      model: "Caio Apache VIP",
      line: "Linha 3050 - Terminal Central",
      status: "MAINTENANCE",
    },
  });

  void companyB;
  void bus3;

  // ---------- Espaços publicitários ----------
  const spaces = [
    { busId: bus1.id, name: "Lateral externa esquerda (DEV)", type: "EXTERNAL_SIDE", price: 1200, status: "AVAILABLE" },
    { busId: bus1.id, name: "Traseira externa (DEV)", type: "EXTERNAL_REAR", price: 900, status: "AVAILABLE" },
    { busId: bus1.id, name: "Painel interno lateral (DEV)", type: "INTERNAL_PANEL", price: 600, status: "AVAILABLE" },
    { busId: bus2.id, name: "Lateral externa direita (DEV)", type: "EXTERNAL_SIDE", price: 1100, status: "AVAILABLE" },
    { busId: bus2.id, name: "Traseira externa (DEV)", type: "EXTERNAL_REAR", price: 850, status: "AVAILABLE" },
    { busId: bus3.id, name: "Vidros traseiros (DEV)", type: "INTERNAL_REAR", price: 450, status: "MAINTENANCE" },
  ];
  const spaceRecords = [];
  for (const s of spaces) {
    const spaceId = `space-${s.busId}-${s.name}`;
    const record = await prisma.advertisingSpace.upsert({
      where: { id: spaceId },
      update: {},
      create: { id: spaceId, ...s },
    });
    spaceRecords.push(record);
  }
// ---------- Campanhas ----------
  const advertiser = await prisma.advertiser.findUnique({
    where: { userId: advertiserUser.id },
  });

  const campaigns = [
    {
      id: "campaign-verao-dev",
      name: "Campanha Verão - Alimentos (DEV)",
      advertiserId: advertiser.id,
      description: "Campanha de exemplo para ambiente de desenvolvimento.",
      startDate: new Date(Date.now() - 7 * 86400000),
      endDate: new Date(Date.now() + 30 * 86400000),
      budget: "5000",
      status: "ACTIVE",
      durationSeconds: 15,
      busIds: [bus1.id],
      spaceIds: [spaceRecords[0].id],
      mediaUrl: "https://images.unsplash.com/photo-1511690656952-34342bb7c2f2?w=800",
    },
    {
      id: "campaign-tech-dev",
      name: "Campanha Tech - Aplicativo (DEV)",
      advertiserId: advertiser.id,
      description: "Divulgação do app de transporte.",
      startDate: new Date(Date.now() + 5 * 86400000),
      endDate: new Date(Date.now() + 60 * 86400000),
      budget: "3200",
      status: "SCHEDULED",
      durationSeconds: 20,
      busIds: [bus2.id],
      spaceIds: [spaceRecords[3].id],
      mediaUrl: "https://images.unsplash.com/photo-1522543558187-768b6df7c25c?w=800",
    },
    {
      id: "campaign-rascunho-dev",
      name: "Campanha Rascunho - Widgets (DEV)",
      advertiserId: advertiser.id,
      description: "Rascunho em desenvolvimento.",
      startDate: null,
      endDate: null,
      budget: "1200",
      status: "DRAFT",
      durationSeconds: 10,
      busIds: [bus1.id, bus2.id],
      spaceIds: [spaceRecords[1].id, spaceRecords[4].id],
      mediaUrl: null,
    },
  ];

  const createdCampaigns = [];
  for (const c of campaigns) {
    const { id, busIds, spaceIds, mediaUrl, ...campaignData } = c;
    const campaign = await prisma.campaign.upsert({
      where: { id },
      update: {},
      create: { id, ...campaignData },
    });
    await prisma.campaignBus.deleteMany({ where: { campaignId: campaign.id } });
    await prisma.campaignBus.createMany({
      data: busIds.map((busId) => ({ campaignId: campaign.id, busId })),
    });
    await prisma.campaignSpace.deleteMany({ where: { campaignId: campaign.id } });
    await prisma.campaignSpace.createMany({
      data: spaceIds.map((advertisingSpaceId) => ({
        campaignId: campaign.id,
        advertisingSpaceId,
      })),
    });
    if (mediaUrl) {
      const existing = await prisma.media.findFirst({
        where: { campaignId: campaign.id },
      });
      if (!existing) {
        await prisma.media.create({
          data: {
            campaignId: campaign.id,
            fileName: "campanha-exemplo.jpg",
            fileUrl: mediaUrl,
            fileType: "image/jpeg",
            fileSize: 0,
          },
        });
      }
    }
    createdCampaigns.push(campaign);
  }

  // ---------- Tablet ----------
  const tablet = await prisma.tablet.upsert({
    where: { code: "TAB-DEV-001" },
    update: {},
    create: {
      code: "TAB-DEV-001",
      busId: bus1.id,
      status: "ONLINE",
      lastSeenAt: new Date(),
    },
  });

  // ---------- Impressões de exemplo ----------
  const activeCampaign = createdCampaigns[0];
  const existingImpressions = await prisma.impression.count({});
  if (existingImpressions === 0 && activeCampaign) {
    const impressions = [];
    for (let i = 0; i < 40; i += 1) {
      impressions.push({
        campaignId: activeCampaign.id,
        tabletId: tablet.id,
        startedAt: new Date(Date.now() - i * 3600000),
        durationSeconds: activeCampaign.durationSeconds || 15,
      });
    }
    await prisma.impression.createMany({ data: impressions });
  }

  console.log("✅ Seed concluído (dados de DESENVOLVIMENTO).\n");
  console.log("Credenciais de desenvolvimento:");
  console.log("  ADMIN      -> admin@publibus.dev / admin123");
  console.log("  OPERATOR   -> operator@publibus.dev / operator123");
  console.log("  ADVERTISER -> anunciante@publibus.dev / anunciante123");
}

main()
  .catch((e) => {
    console.error("❌ Erro no seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });