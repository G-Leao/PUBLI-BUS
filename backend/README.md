# PUBLI-BUS Backend

Backend em Node.js + Express + Prisma + PostgreSQL para o sistema PUBLI-BUS.

## Stack

- Node.js
- Express
- PostgreSQL
- Prisma ORM
- JWT (autenticação)
- bcryptjs (hash de senha)
- Zod (validação)
- Helmet
- CORS
- express-rate-limit (rate limiting)
- Multer + storageService (uploads)

## Estrutura

```text
backend/
├── prisma/
│   ├── schema.prisma
│   ├── seed.js
│   └── migrations/
├── scripts/
│   └── smoke-test.mjs        # smoke test automatizado (usa embedded-postgres)
├── src/
│   ├── config/
│   ├── controllers/
│   ├── middlewares/
│   ├── routes/
│   ├── services/
│   ├── utils/
│   ├── app.js
│   └── server.js
├── .env.example
├── package.json
└── README.md
```

## Requisitos

- Node.js 18+
- PostgreSQL 14+

## Instalação

```bash
cd backend
npm install
cp .env.example .env
```

## Configuração do `.env`

```text
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/publibus?schema=public"
JWT_SECRET="troque-por-um-segredo-forte"
PORT=4000
FRONTEND_URL="http://localhost:5173"
```

Opções adicionais:

- `JWT_EXPIRES_IN` (padrão `7d`)
- `API_URL` — URL pública da API (usada para montar URLs de arquivos)
- `STORAGE_DRIVER` — `local` (padrão) ou `supabase`
- `MAX_FILE_SIZE_MB` — tamanho máximo de upload (padrão 50)

## Banco de dados

Crie o banco PostgreSQL e defina `DATABASE_URL`.

```bash
npm run prisma:generate
npm run prisma:migrate
npm run seed
```

Em produção use `npm run prisma:deploy` (aplica as migrations existentes).

## Seed

O seed cria dados **claramente identificados como de desenvolvimento**:

- 1 usuário `ADMIN`
- 1 usuário `OPERATOR`
- 1 usuário `ADVERTISER`
- 2 empresas
- 3 ônibus
- 6 espaços publicitários
- 3 campanhas (com mídia de exemplo)
- 1 tablet
- impressões de exemplo

Credenciais de desenvolvimento:

```text
admin@publibus.dev    / admin123
operator@publibus.dev / operator123
anunciante@publibus.dev / anunciante123
```

## Execução local

```bash
npm run dev
```

A API ficará disponível em `http://localhost:4000/api`.

## Autenticação

Use JWT em `Authorization: Bearer <token>`.

### Endpoints

- `POST /api/auth/register` — cria conta (role `ADVERTISER`)
- `POST /api/auth/login` — retorna `{ token, user }`
- `GET /api/auth/me` — perfil do usuário autenticado
- `POST /api/auth/forgot-password` — gera token de redefinição (dev: retorna o token)
- `POST /api/auth/reset-password` — redefine a senha com o token

## Roles

| Role        | Descrição |
|-------------|-----------|
| `ADMIN`     | Acesso completo |
| `OPERATOR`  | Gerencia ônibus, tablets, campanhas, anunciantes, espaços, métricas e relatórios |
| `ADVERTISER`| Acesso somente aos próprios dados, empresa, campanhas, materiais e métricas |

A regra "anunciante nunca acessa dados de outro anunciante" é aplicada no backend em todos os endpoints.

## API REST

### Users (`/api/users`)
`GET /` · `GET /:id` · `POST /` · `PUT /:id` · `DELETE /:id`

### Companies (`/api/companies`)
`GET /` · `GET /:id` · `POST /` · `PUT /:id` · `DELETE /:id`

### Advertisers (`/api/advertisers`)
`GET /` · `GET /:id` · `POST /` · `PUT /:id` · `DELETE /:id`

### Buses (`/api/buses`)
`GET /` · `GET /:id` · `POST /` · `PUT /:id` · `DELETE /:id`

### Advertising Spaces (`/api/advertising-spaces`)
`GET /` · `GET /:id` · `POST /` · `PUT /:id` · `DELETE /:id`

### Campaigns (`/api/campaigns`)
`GET /` · `GET /:id` · `POST /` · `PUT /:id` · `DELETE /:id` · `PATCH /:id/status`

### Media
- `GET /api/campaigns/:campaignId/media`
- `POST /api/campaigns/:campaignId/media` (multipart `file` ou JSON com metadados)
- `DELETE /api/media/:id`

### Tablets (`/api/tablets`)
`GET /` · `GET /:id` · `POST /` · `PUT /:id` · `DELETE /:id`

### Metrics & Impressions
- `POST /api/impressions` — `{ campaignId, tabletId, durationSeconds }`
- `GET /api/metrics` — totais e agrupamentos (por campanha/ônibus/tablet/período)
- `GET /api/metrics/campaigns/:id` — métricas de uma campanha

### Dashboard & Reports
- `GET /api/dashboard` — totais calculados pelo banco
- `GET /api/reports/campaigns?startDate=&endDate=&campaignId=&advertiserId=&busId=`
- `GET /api/reports/campaigns/:id`
- `GET /api/reports/advertisers/:id`

### Health
`GET /api/health`

## Uploads

Tipos permitidos: `image/jpeg`, `image/png`, `image/webp`, `video/mp4`.

O `storageService` possui a interface preparada para Supabase Storage:

```text
STORAGE_DRIVER=supabase
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_BUCKET=
```

O banco guarda apenas a URL e os metadados do arquivo.

## Deploy

1. Provisione um PostgreSQL (Supabase, Neon, RDS, etc.)
2. Configure `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL`, `STORAGE_DRIVER`
3. Aplique as migrations: `npm run prisma:deploy`
4. Inicie a API: `npm start`

Para deploy com armazenamento efêmero (ex.: Vercel serverless), use `STORAGE_DRIVER=supabase`.

## Smoke test automatizado

```bash
npm run test:smoke
```

Sobe um PostgreSQL temporário (embedded), aplica migrations e seed e valida os principais endpoints.