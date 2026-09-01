# PUBLI-BUS

<p align="center">
  Sistema web para gerenciamento e divulgação de publicidade em transporte coletivo.
</p>

<p align="center">
  <a href="https://github.com/G-Leao/PUBLI-BUS">Repositório</a>
</p>

---

## Sobre o projeto

O **PUBLI-BUS** é uma aplicação web desenvolvida para gerenciamento de publicidade em ônibus, com foco em uma experiência moderna, intuitiva e responsiva.

A proposta do projeto é criar uma plataforma capaz de conectar anunciantes aos espaços publicitários disponíveis em veículos de transporte coletivo, permitindo organizar campanhas e centralizar informações relacionadas à publicidade.

A interface foi desenvolvida priorizando uma experiência visual moderna, utilizando animações, transições suaves e componentes interativos para melhorar a navegação.

---

## Arquitetura

```text
Frontend
   ↓
REST API
   ↓
Express
   ↓
Prisma
   ↓
PostgreSQL
```

A aplicação é **full-stack**:

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React + Vite + Tailwind CSS |
| API REST | Node.js + Express |
| ORM | Prisma |
| Banco de dados | PostgreSQL |
| Autenticação | JWT + bcryptjs |
| Validação | Zod |
| Uploads | Multer + storageService (local dev / Supabase Storage) |

O frontend consome a API através de `src/services/api.js` (cliente HTTP
centralizado) e o `src/API/localClient.js` atua como adaptador para as telas,
preservando a gestão de sessão via JWT. LocalStorage é usado apenas para
token/sessão, preferências e conteúdos locais de referência.

## Características

* Interface moderna e responsiva
* Animações e transições entre elementos
* Componentes interativos
* Layout adaptável para diferentes dispositivos
* Navegação intuitiva
* Estrutura componentizada
* Design focado em experiência do usuário
* Arquitetura preparada para expansão
* Desenvolvimento utilizando React
* Build e desenvolvimento utilizando Vite

---

## Animações e experiência visual

O projeto utiliza animações para tornar a interface mais dinâmica e melhorar a experiência de navegação.

Entre os recursos utilizados estão:

* Animações de entrada de elementos
* Transições suaves
* Efeitos de hover
* Animações em componentes da interface
* Mudanças de estado com transições
* Elementos interativos
* Animações durante a navegação
* Efeitos visuais para destacar informações importantes

As animações são utilizadas de forma funcional, evitando excesso de elementos que possam prejudicar a usabilidade.

---

## Tecnologias

### Front-end

* React
* JavaScript
* HTML5
* CSS3
* Tailwind CSS
* Vite

### Ferramentas

* Git
* GitHub
* ESLint
* PostCSS
* Lucide React

---

## Estrutura do projeto

```text
PUBLI-BUS/
│
├── frontend → (raiz do repositório, aplicação React)
│   ├── src/
│   │   ├── API/localClient.js      # adaptador de persistência (delega à API)
│   │   ├── services/api.js         # cliente HTTP centralizado da REST API
│   │   ├── components/
│   │   ├── pages/
│   │   └── ...
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma           # modelos PostgreSQL
│   │   ├── seed.js                 # dados de desenvolvimento
│   │   └── migrations/
│   ├── scripts/
│   │   ├── dev-db.mjs              # PostgreSQL local sem instalação
│   │   └── smoke-test.mjs          # suíte de testes da API
│   ├── src/
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── middlewares/
│   │   ├── models/ (via Prisma)
│   │   ├── config/
│   │   ├── utils/
│   │   ├── app.js
│   │   └── server.js
│   ├── .env.example
│   └── package.json
│
├── .gitignore
└── README.md
```

## Instalação (full-stack)

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
```

Configure o `.env` com a sua `DATABASE_URL` (PostgreSQL).

**Opção A — PostgreSQL já instalado:**

```bash
npm run prisma:generate
npm run prisma:migrate
npm run seed
npm run dev        # API em http://localhost:4000
```

**Opção B — sem PostgreSQL instalado (desenvolvimento):**

```bash
npm run db:dev:init   # sobe um PostgreSQL real local (embedded) + migrations + seed
npm run dev           # em outro terminal: API em http://localhost:4000
```

### 2. Frontend

Em outro terminal, na raiz:

```bash
npm install
npm run dev    # em http://localhost:5173
```

O Vite redireciona `/api` e `/uploads` para o backend em desenvolvimento
(proxy configurado em `vite.config.js`). Em produção, defina `VITE_API_URL`
apontando para a API (ex.: `VITE_API_URL=https://api.publibus.com/api`).

### Credenciais de desenvolvimento (seed)

```text
admin@publibus.dev      / admin123      (ADMIN)
operator@publibus.dev   / operator123   (OPERATOR)
anunciante@publibus.dev / anunciante123 (ADVERTISER)
```

### Testes do backend

```bash
cd backend
npm run test:smoke    # valida migrations, seed e todos os endpoints principais
```

---

## Desenvolvimento

O projeto foi estruturado utilizando componentes reutilizáveis, permitindo que novas funcionalidades sejam adicionadas sem comprometer a organização da aplicação.

A utilização de React permite dividir a interface em componentes independentes, enquanto o Tailwind CSS facilita a construção e manutenção do design responsivo.

O Vite é utilizado como ferramenta de desenvolvimento e build da aplicação.

---

## Funcionalidades

### Implementadas

* [x] Sistema de autenticação (JWT + bcrypt, register/login/me/forgot/reset)
* [x] Sistema de permissões (ADMIN / OPERATOR / ADVERTISER)
* [x] Dashboard administrativo (endpoint com dados reais do banco)
* [x] Cadastro de anunciantes e empresas (endpoints + telas)
* [x] Cadastro e gerenciamento de ônibus (endpoints)
* [x] Gerenciamento de espaços publicitários (endpoints)
* [x] Criação e gerenciamento de campanhas (endpoints + telas)
* [x] Controle de campanhas ativas (transições de status)
* [x] Métricas de publicidade (impressões, por campanha/ônibus/tablet/período)
* [x] Relatórios (campanhas, campanha, anunciante, com filtros)
* [x] Upload de materiais publicitários (validação de tipo/tamanho)
* [x] Integração com banco de dados (Prisma + PostgreSQL)
* [x] API REST (users, companies, advertisers, buses, spaces, campaigns, media, tablets, metrics, dashboard, reports)

### Planejadas

* [ ] Upload em storage definitivo (a camada `storageService` está preparada para Supabase)
* [ ] Sistema de pagamentos
* [ ] Envio real de e-mails (OTP e recuperação de senha)
* [ ] Deploy do backend

---

## Status

**Em desenvolvimento**

O backend está implementado e testado localmente com PostgreSQL. O projeto continua
recebendo novas funcionalidades, melhorias de arquitetura e integrações.

---

## Objetivo

O PUBLI-BUS foi desenvolvido com o objetivo de aplicar conhecimentos de desenvolvimento web e engenharia de software na construção de uma aplicação que possa evoluir de um projeto de portfólio para uma solução real de gerenciamento de publicidade em transporte coletivo.

O projeto também serve como laboratório para desenvolvimento de interfaces modernas, componentização, responsividade, animações e integração futura com serviços externos.

---

## Desenvolvedor

**G-Leao**

Desenvolvedor focado em desenvolvimento web e estudante de Engenharia de Software.

GitHub:

https://github.com/G-Leao

Repositório:

https://github.com/G-Leao/PUBLI-BUS
