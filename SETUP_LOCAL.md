# PUBLI-BUS Backend - Guia de Setup Local

## Pré-requisitos

- Node.js 18+ instalado
- PostgreSQL 14+ instalado localmente (ou acesso a um servidor PostgreSQL)
- npm ou yarn

## Passo 1: Instalar Dependências

```bash
cd backend
npm install
```

Isso instalará:
- Express
- Prisma + @prisma/client
- PostgreSQL driver
- JWT, bcryptjs, Zod, Helmet, CORS, rate-limit
- Multer para uploads
- E mais...

## Passo 2: Configurar Banco de Dados

### Opção A: PostgreSQL Local (Recomendado para Desenvolvimento)

**Windows (instalação)**:
1. Baixar PostgreSQL de https://www.postgresql.org/download/windows/
2. Instalar com password padrão (ex: `postgres123`)
3. Criar banco:

```sql
-- Via pgAdmin ou psql
CREATE DATABASE publibus WITH OWNER postgres;
```

### Opção B: PostgreSQL na Nuvem (Supabase, Neon, etc)

Criar projeto e obter URL de conexão (será algo como):
```
postgresql://user:password@host:5432/publibus?schema=public
```

## Passo 3: Configurar .env

```bash
# Copiar template
cp .env.example .env
```

Editar `.backend/.env` com seus dados reais:

```env
# Database
DATABASE_URL="postgresql://postgres:postgres123@localhost:5432/publibus?schema=public"

# JWT
JWT_SECRET="sua-chave-secreta-super-forte-com-16-plus-caracteres"
JWT_EXPIRES_IN="7d"

# Server
NODE_ENV="development"
PORT=4000

# Frontend
FRONTEND_URL="http://localhost:5173"

# API
API_URL="http://localhost:4000"

# File Upload
MAX_FILE_SIZE_MB=50
STORAGE_DRIVER="local"

# Rate Limiting
RATE_LIMIT_MAX=300
RATE_LIMIT_AUTH_MAX=20
```

### Variáveis Explicadas

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `DATABASE_URL` | Conexão PostgreSQL | `postgresql://postgres:pass@localhost:5432/publibus?schema=public` |
| `JWT_SECRET` | Chave secreta para assinar JWTs (mín 16 chars) | Qualquer string segura |
| `JWT_EXPIRES_IN` | Validade do token | `7d`, `24h`, `30d` |
| `NODE_ENV` | Ambiente | `development`, `production` |
| `PORT` | Porta do servidor | `4000` |
| `FRONTEND_URL` | URL do frontend (para CORS) | `http://localhost:5173` |
| `API_URL` | URL pública da API (para URLs de arquivos) | `http://localhost:4000` |
| `STORAGE_DRIVER` | Driver de storage | `local` ou `supabase` |

## Passo 4: Criar Schema e Migrations

```bash
# Gerar client Prisma
npm run prisma:generate

# Criar migrations (irá aplicar schema ao banco)
npm run prisma:migrate
```

Isso criará tabelas, enums, índices e foreign keys no PostgreSQL.

**Primeiro`, será solicitado um nome para a migration (ex: `init`). Confirme com Enter.

## Passo 5: Popular com Seed de Desenvolvimento

```bash
npm run seed
```

Isso criará:
- ✅ 3 usuários (ADMIN, OPERATOR, ADVERTISER)
- ✅ 2 empresas
- ✅ 3 ônibus
- ✅ 6 espaços publicitários
- ✅ 3 campanhas
- ✅ 1 tablet
- ✅ Impressões de exemplo

Credenciais:
```
admin@publibus.dev       / admin123
operator@publibus.dev    / operator123
anunciante@publibus.dev  / anunciante123
```

## Passo 6: Iniciar o Servidor

```bash
npm run dev
```

Você verá:
```
✓ PUBLI-BUS API rodando em http://localhost:4000
✓ Health check: http://localhost:4000/api/health
```

## Passo 7: Testar a API

### Teste 1: Health Check (sem autenticação)

```bash
curl http://localhost:4000/api/health
```

Resposta esperada:
```json
{
  "success": true,
  "message": "Service is healthy",
  "data": { "service": "PUBLI-BUS API" }
}
```

### Teste 2: Login

```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@publibus.dev",
    "password": "admin123"
  }'
```

Resposta:
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "...",
      "name": "Admin PUBLI-BUS (DEV)",
      "email": "admin@publibus.dev",
      "role": "ADMIN"
    }
  }
}
```

### Teste 3: Perfil (com autenticação)

Copie o `token` da resposta acima e use:

```bash
curl -X GET http://localhost:4000/api/auth/me \
  -H "Authorization: Bearer <TOKEN-AQUI>"
```

### Teste 4: Dashboard

```bash
curl -X GET http://localhost:4000/api/dashboard \
  -H "Authorization: Bearer <TOKEN-AQUI>"
```

Resposta esperada:
```json
{
  "success": true,
  "message": "Dashboard statistics",
  "data": {
    "totalCampaigns": 3,
    "activeCampaigns": 1,
    "totalBuses": 3,
    "totalAdvertisers": 1,
    "totalImpressions": 40,
    "revenue": 0
  }
}
```

### Teste 5: Listar Campanhas

```bash
curl -X GET http://localhost:4000/api/campaigns \
  -H "Authorization: Bearer <TOKEN-AQUI>"
```

### Teste 6: Criar Campanha

```bash
curl -X POST http://localhost:4000/api/campaigns \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN-AQUI>" \
  -d '{
    "advertiserId": "ads-id-aqui",
    "name": "Minha Campanha",
    "description": "Descrição",
    "startDate": "2025-02-01T00:00:00Z",
    "endDate": "2025-03-01T00:00:00Z",
    "budget": 5000,
    "status": "DRAFT",
    "durationSeconds": 15
  }'
```

## Ferramentas Recomendadas para Testar

### Postman
- GUI para testar endpoints
- Gerenciar variáveis (token, URLs)
- Histórico de requisições
- Download: https://www.postman.com/downloads/

### cURL (ou Insomnia)
- Ferramenta CLI para testes
- Vem com Windows/macOS/Linux
- Perfeito para scripts

### VS Code REST Client
- Extensão "REST Client" no VS Code
- Crie arquivo `.rest` ou `.http`

## Problemas Comuns

### "ECONNREFUSED" ou "database connection error"
- ✅ Verificar se PostgreSQL está rodando
- ✅ Verificar `DATABASE_URL` em `.env`
- ✅ Testar conexão: `psql postgresql://postgres:pass@localhost:5432/publibus`

### "JWT_SECRET must be at least 16 characters"
- ✅ Editar `.env` e usar string maior

### "CORS error no frontend"
- ✅ Adicionar URL do frontend em `FRONTEND_URL`
- ✅ Reiniciar servidor

### Migrations já foram aplicadas?
- ✅ Ver arquivo `prisma/migrations/` (será criado após `prisma:migrate`)
- ✅ Ou verificar tabelas no banco: `\dt` (psql)

## Próximas Etapas

1. ✅ Backend está rodando localmente
2. 🔜 Integrar frontend com a API
3. 🔜 Remover `localClient.js` e usar API REST
4. 🔜 Testar todas as páginas com backend
5. 🔜 Deploy em produção

## Scripts Disponíveis

```bash
npm run dev                 # Dev mode com auto-restart
npm start                   # Iniciar em produção
npm run prisma:generate     # Gerar Prisma Client
npm run prisma:migrate      # Criar/executar migrations
npm run prisma:studio       # Abrir Prisma Studio (GUI)
npm run seed                # Popular banco com dados
npm run db:dev:init         # Setup embedded PostgreSQL (dev-db)
npm run test:smoke          # Smoke test automatizado
```

## Suporte

Dúvidas? Verifique:
- [README.md](./README.md) - Documentação geral
- [BACKEND_STATUS.md](../BACKEND_STATUS.md) - Status de implementação
- Logs no terminal (erros detalhados)
- Banco: `npm run prisma:studio` para ver dados

---

**Seu backend está pronto para ser usado!** 🚀
