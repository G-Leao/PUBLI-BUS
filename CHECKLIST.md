# ✅ PUBLI-BUS Backend - Checklist de Implementação

## 🎯 Status Final: 95% Completo

---

## ✅ FASE 1: Setup Inicial (5 min)

- [ ] Abrir terminal e navegar para `backend/`
- [ ] Executar `npm install`
- [ ] Copiar `cp .env.example .env`
- [ ] Editar `.env` com URL do PostgreSQL real
  - [ ] `DATABASE_URL` apontando para servidor PostgreSQL
  - [ ] `JWT_SECRET` com string segura (16+ chars)
- [ ] Verificar: `npm run prisma:generate` (não devem haver erros)

**Tempo**: ~5 min | **Dependência**: Node.js 18+, PostgreSQL 14+

---

## ✅ FASE 2: Banco de Dados (3 min)

- [ ] Criar banco PostgreSQL (se não existir)
  ```sql
  CREATE DATABASE publibus WITH OWNER postgres;
  ```
- [ ] Executar `npm run prisma:migrate`
  - [ ] Será pedido um nome para migration (digitar `init`)
  - [ ] Observar "Migration applied" no terminal
- [ ] Executar `npm run seed`
  - [ ] Observar mensagens de "✓ Usuário criado"
  - [ ] Observar "✓ Seed completado com sucesso!"

**Tempo**: ~3 min | **Output**: Tabelas criadas, dados carregados

---

## ✅ FASE 3: Testar Backend (5 min)

- [ ] Abrir novo terminal
- [ ] Executar `npm run dev`
  - [ ] Observar: "✓ PUBLI-BUS API rodando em http://localhost:4000"
  - [ ] Observar: "✓ Health check: http://localhost:4000/api/health"
- [ ] Em outro terminal, testar health check:
  ```bash
  curl http://localhost:4000/api/health
  ```
  - [ ] Deve retornar JSON com `"success": true`

**Tempo**: ~2 min | **Manter rodando**: Deixar servidor aberto

---

## ✅ FASE 4: Testar Autenticação (3 min)

- [ ] Testar login com ADMIN:
  ```bash
  curl -X POST http://localhost:4000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@publibus.dev","password":"admin123"}'
  ```
  - [ ] Deve retornar `"success": true` e um token JWT
  - [ ] Guardar o token (será usado depois)

- [ ] Testar GET /me (autenticado):
  ```bash
  # Substitua <TOKEN> pelo token acima
  curl -X GET http://localhost:4000/api/auth/me \
    -H "Authorization: Bearer <TOKEN>"
  ```
  - [ ] Deve retornar dados do usuário admin

**Tempo**: ~3 min | **Validação**: Token recebido e validado

---

## ✅ FASE 5: Testar Endpoints Principais (5 min)

Com o token de ADMIN, testar:

- [ ] **Dashboard**:
  ```bash
  curl -X GET http://localhost:4000/api/dashboard \
    -H "Authorization: Bearer <TOKEN>"
  ```
  - [ ] Retorna números: `totalCampaigns`, `activeCampaigns`, `totalBuses`, etc

- [ ] **Listar Campanhas**:
  ```bash
  curl -X GET http://localhost:4000/api/campaigns \
    -H "Authorization: Bearer <TOKEN>"
  ```
  - [ ] Retorna array com campanhas do seed

- [ ] **Listar Ônibus**:
  ```bash
  curl -X GET http://localhost:4000/api/buses \
    -H "Authorization: Bearer <TOKEN>"
  ```
  - [ ] Retorna array com 3 ônibus

- [ ] **Listar Tablets**:
  ```bash
  curl -X GET http://localhost:4000/api/tablets \
    -H "Authorization: Bearer <TOKEN>"
  ```
  - [ ] Retorna 1 tablet conectado ao ônibus 1

**Tempo**: ~5 min | **Validação**: Todos retornam dados corretos

---

## ✅ FASE 6: Testar Permissões (3 min)

- [ ] Fazer login como ADVERTISER:
  ```bash
  curl -X POST http://localhost:4000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"anunciante@publibus.dev","password":"anunciante123"}'
  ```
  - [ ] Guardar token de advertiser

- [ ] Com token de ADVERTISER, tentar listar USERS (deve falhar):
  ```bash
  curl -X GET http://localhost:4000/api/users \
    -H "Authorization: Bearer <TOKEN_ADVERTISER>"
  ```
  - [ ] Deve retornar erro 403 (Forbidden)

- [ ] Com token de ADVERTISER, listar suas campanhas (deve funcionar):
  ```bash
  curl -X GET http://localhost:4000/api/campaigns \
    -H "Authorization: Bearer <TOKEN_ADVERTISER>"
  ```
  - [ ] Deve retornar apenas campanhas do advertiser

**Tempo**: ~3 min | **Validação**: RBAC funcionando

---

## ✅ FASE 7: Testar CRUD (5 min)

- [ ] **Criar um ônibus** (ADMIN):
  ```bash
  curl -X POST http://localhost:4000/api/buses \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer <ADMIN_TOKEN>" \
    -d '{
      "code":"BUS-TEST-001",
      "plate":"TEST-0001",
      "model":"Mercedes",
      "line":"Linha Test",
      "status":"ACTIVE"
    }'
  ```
  - [ ] Retorna 201 com dados do ônibus criado

- [ ] **Atualizar ônibus** (mudar status para MAINTENANCE):
  ```bash
  # Use o ID retornado acima
  curl -X PUT http://localhost:4000/api/buses/<ID> \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer <ADMIN_TOKEN>" \
    -d '{"status":"MAINTENANCE"}'
  ```
  - [ ] Retorna 200 com ônibus atualizado

- [ ] **Listar ônibus** (deve incluir novo):
  ```bash
  curl -X GET http://localhost:4000/api/buses \
    -H "Authorization: Bearer <ADMIN_TOKEN>"
  ```
  - [ ] Deve mostrar 4 ônibus (3 do seed + 1 novo)

- [ ] **Deletar ônibus** (usar ID):
  ```bash
  curl -X DELETE http://localhost:4000/api/buses/<ID> \
    -H "Authorization: Bearer <ADMIN_TOKEN>"
  ```
  - [ ] Retorna 200

**Tempo**: ~5 min | **Validação**: CRUD funciona

---

## ✅ FASE 8: Testar Métricas (2 min)

- [ ] **Registrar Impressão**:
  ```bash
  curl -X POST http://localhost:4000/api/impressions \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer <ADMIN_TOKEN>" \
    -d '{
      "campaignId":"campaign-verao-dev",
      "tabletId":"TAB-DEV-001",
      "durationSeconds":15
    }'
  ```
  - [ ] Retorna 201

- [ ] **Listar Impressões**:
  ```bash
  curl -X GET http://localhost:4000/api/impressions \
    -H "Authorization: Bearer <ADMIN_TOKEN>"
  ```
  - [ ] Deve mostrar impressões registradas

**Tempo**: ~2 min | **Validação**: Impressões gravadas

---

## ✅ FASE 9: Documentação Verificada (2 min)

- [ ] Verificar existência de documentos:
  - [ ] `SETUP_LOCAL.md` (guia completo de setup)
  - [ ] `PROGRESS.md` (status detalhado)
  - [ ] `BACKEND_STATUS.md` (checklist de funcionalidades)
  - [ ] `QUICK_REFERENCE.md` (referência rápida)
  - [ ] `backend/README.md` (documentação da API)
  - [ ] `backend/.env.example` (template de ambiente)

- [ ] Ler `SETUP_LOCAL.md` (próxima etapa)

**Tempo**: ~2 min | **Output**: Familiarizado com docs

---

## ✅ FASE 10: Setup Final (1 min)

- [ ] Deixar servidor rodando com `npm run dev`
- [ ] Manter terminal aberto para logs
- [ ] Backend está pronto para integração com frontend!

**Tempo**: ~1 min | **Status**: ✅ PRONTO

---

## 📊 Tempo Total Estimado

- **Setup + Testes**: ~30 minutos
- **Servidor rodando**: ✅ Contínuo

---

## 🎯 Próximos Passos (Fase 11+)

### Imediato (integração com frontend)
1. [ ] Criar `frontend/src/services/api.js`
2. [ ] Substituir `localClient.js` por chamadas à API
3. [ ] Conectar AuthContext com login real
4. [ ] Testar cada página com backend
5. [ ] Remover localStorage como banco principal

### Médio prazo (testes)
1. [ ] Adicionar testes unitários
2. [ ] Adicionar testes de integração
3. [ ] Testar permissões (RBAC)
4. [ ] Testar validações

### Longo prazo (produção)
1. [ ] Deploy em servidor real
2. [ ] Configurar CI/CD
3. [ ] Implementar monitoramento
4. [ ] Backups automáticos

---

## 📞 Suporte

Se algo der errado:

1. **Verificar logs**: `npm run dev` mostra erros detalhados
2. **Verificar `.env`**: DATABASE_URL deve estar correto
3. **Verificar PostgreSQL**: Deve estar rodando na máquina
4. **Executar seed novamente**: `npm run seed`
5. **Ler documentação**: `SETUP_LOCAL.md` tem troubleshooting

---

## ✅ Fim do Checklist

**Parabéns!** Seu backend está:
- ✅ Instalado
- ✅ Configurado
- ✅ Testado
- ✅ Pronto para uso

**Próximo**: Abrir `SETUP_LOCAL.md` para detalhes de cada etapa ou iniciar integração frontend!

---

**Criado em**: 2025
**Status**: Completo ✅
**Última atualização**: Agora
