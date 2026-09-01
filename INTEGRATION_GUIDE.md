# 🔗 PUBLI-BUS - Guia de Integração Frontend ↔ Backend

## 🎯 Objetivo

Conectar o frontend React existente ao backend REST, removendo gradualmente as dependências de `localStorage`.

---

## 📊 Arquitetura Atual

```
Frontend (React)
  ↓ (usa localStorage via localClient.js)
  localStorage
  
DEPOIS:
Frontend (React)
  ↓ (chamadas HTTP)
  API REST (Express)
  ↓ (queries ORM)
  PostgreSQL
```

---

## 🛠️ Fase 1: Criar API Client (1-2 horas)

### 1.1 Criar arquivo `frontend/src/services/api.js`

```javascript
// frontend/src/services/api.js

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

// Wrapper para fetch com tratamento de erros
async function request(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Erro na requisição');
  }

  return response.json();
}

export const api = {
  // ==================== AUTENTICAÇÃO ====================
  auth: {
    login: (email, password) =>
      request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),

    register: (name, email, password) =>
      request('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password }),
      }),

    me: () => request('/auth/me'),

    forgotPassword: (email) =>
      request('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      }),

    resetPassword: (token, newPassword) =>
      request('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, newPassword }),
      }),
  },

  // ==================== CAMPANHAS ====================
  campaigns: {
    list: () => request('/campaigns'),

    getById: (id) => request(`/campaigns/${id}`),

    create: (data) =>
      request('/campaigns', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    update: (id, data) =>
      request(`/campaigns/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    delete: (id) =>
      request(`/campaigns/${id}`, {
        method: 'DELETE',
      }),

    updateStatus: (id, status) =>
      request(`/campaigns/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),

    getMedia: (campaignId) =>
      request(`/campaigns/${campaignId}/media`),

    uploadMedia: (campaignId, file) => {
      const formData = new FormData();
      formData.append('file', file);
      const token = localStorage.getItem('token');

      return fetch(`${API_BASE}/campaigns/${campaignId}/media`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      }).then(r => r.json());
    },
  },

  // ==================== ÔNIBUS ====================
  buses: {
    list: () => request('/buses'),

    getById: (id) => request(`/buses/${id}`),

    create: (data) =>
      request('/buses', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    update: (id, data) =>
      request(`/buses/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    delete: (id) =>
      request(`/buses/${id}`, {
        method: 'DELETE',
      }),
  },

  // ==================== ESPAÇOS PUBLICITÁRIOS ====================
  spaces: {
    list: () => request('/advertising-spaces'),

    getById: (id) => request(`/advertising-spaces/${id}`),

    create: (data) =>
      request('/advertising-spaces', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    update: (id, data) =>
      request(`/advertising-spaces/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    delete: (id) =>
      request(`/advertising-spaces/${id}`, {
        method: 'DELETE',
      }),
  },

  // ==================== ANUNCIANTES ====================
  advertisers: {
    list: () => request('/advertisers'),

    getById: (id) => request(`/advertisers/${id}`),

    create: (data) =>
      request('/advertisers', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    update: (id, data) =>
      request(`/advertisers/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    delete: (id) =>
      request(`/advertisers/${id}`, {
        method: 'DELETE',
      }),
  },

  // ==================== EMPRESAS ====================
  companies: {
    list: () => request('/companies'),

    getById: (id) => request(`/companies/${id}`),

    create: (data) =>
      request('/companies', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    update: (id, data) =>
      request(`/companies/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    delete: (id) =>
      request(`/companies/${id}`, {
        method: 'DELETE',
      }),
  },

  // ==================== TABLETS ====================
  tablets: {
    list: () => request('/tablets'),

    getById: (id) => request(`/tablets/${id}`),

    create: (data) =>
      request('/tablets', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    update: (id, data) =>
      request(`/tablets/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    delete: (id) =>
      request(`/tablets/${id}`, {
        method: 'DELETE',
      }),
  },

  // ==================== MÉTRICAS ====================
  metrics: {
    recordImpression: (campaignId, tabletId, durationSeconds) =>
      request('/impressions', {
        method: 'POST',
        body: JSON.stringify({
          campaignId,
          tabletId,
          durationSeconds,
        }),
      }),

    listImpressions: () => request('/impressions'),
  },

  // ==================== DASHBOARD ====================
  dashboard: {
    getStats: () => request('/dashboard'),
  },

  // ==================== SAÚDE ====================
  health: {
    check: () => fetch(`${API_BASE}/health`).then(r => r.json()),
  },
};

export default api;
```

---

## 🔒 Fase 2: Conectar AuthContext (1-2 horas)

### 2.1 Atualizar `frontend/src/contexts/AuthContext.jsx`

```javascript
// ANTES (localStorage)
// const user = JSON.parse(localStorage.getItem('user'));

// DEPOIS (API)
import { api } from '../services/api';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar se há token salvo
    const token = localStorage.getItem('token');
    if (token) {
      // Buscar dados do usuário do backend
      api.auth.me()
        .then(response => {
          setUser(response.data);
        })
        .catch(() => {
          // Token inválido, limpar
          localStorage.removeItem('token');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const response = await api.auth.login(email, password);
    const { token, user } = response.data;
    
    localStorage.setItem('token', token);
    setUser(user);
    return user;
  };

  const register = async (name, email, password) => {
    const response = await api.auth.register(name, email, password);
    const { token, user } = response.data;
    
    localStorage.setItem('token', token);
    setUser(user);
    return user;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
```

---

## 📄 Fase 3: Substituir Chamadas em Componentes (2-4 horas)

### 3.1 Exemplo: Dashboard

```javascript
// ANTES
// import { localClient } from '../API/localClient';
// const campaigns = localClient.getCampaigns();

// DEPOIS
import { api } from '../services/api';

export function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.dashboard.getStats()
      .then(response => {
        setStats(response.data);
      })
      .catch(error => {
        console.error('Erro ao carregar dashboard:', error);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Carregando...</div>;
  if (!stats) return <div>Erro ao carregar</div>;

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Total de campanhas: {stats.totalCampaigns}</p>
      <p>Campanhas ativas: {stats.activeCampaigns}</p>
      <p>Total de ônibus: {stats.totalBuses}</p>
      <p>Total de anunciantes: {stats.totalAdvertisers}</p>
      <p>Total de impressões: {stats.totalImpressions}</p>
    </div>
  );
}
```

### 3.2 Exemplo: Campanhas

```javascript
// ANTES
// const campaigns = localClient.getCampaigns();

// DEPOIS
import { api } from '../services/api';

export function Campaigns() {
  const [campaigns, setCampaigns] = useState([]);

  useEffect(() => {
    api.campaigns.list()
      .then(response => {
        setCampaigns(response.data);
      });
  }, []);

  const handleDelete = async (id) => {
    await api.campaigns.delete(id);
    setCampaigns(campaigns.filter(c => c.id !== id));
  };

  return (
    <div>
      {campaigns.map(campaign => (
        <div key={campaign.id}>
          <h3>{campaign.name}</h3>
          <button onClick={() => handleDelete(campaign.id)}>Deletar</button>
        </div>
      ))}
    </div>
  );
}
```

---

## 🌍 Fase 4: Variáveis de Ambiente

### 4.1 Atualizar `frontend/.env.local`

```env
# Modo desenvolvimento
REACT_APP_API_URL=http://localhost:4000/api

# Modo produção (será definido no deployment)
# REACT_APP_API_URL=https://api.publibus.com/api
```

### 4.2 Usar em `api.js`

```javascript
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
```

---

## ✅ Fase 5: Checklist de Integração

### Componentes a Atualizar

- [ ] `AuthContext.jsx` - Login/Register com API
- [ ] `Dashboard.jsx` - Estatísticas do dashboard
- [ ] `Campaigns.jsx` - Lista e CRUD de campanhas
- [ ] `CampaignForm.jsx` - Criar/editar campanha
- [ ] `Buses.jsx` - Lista e CRUD de ônibus
- [ ] `Tablets.jsx` - Lista e CRUD de tablets
- [ ] `Advertisers.jsx` - Lista de anunciantes
- [ ] `Companies.jsx` - Lista de empresas
- [ ] `MediaUpload.jsx` - Upload de mídias
- [ ] `Reports.jsx` - Relatórios e métricas
- [ ] Todos os outros componentes que usam `localClient`

### Testes

- [ ] Login com credenciais reais
- [ ] Dashboard carrega dados
- [ ] Criar campanha funciona
- [ ] Editar campanha funciona
- [ ] Deletar campanha funciona
- [ ] Listar campanhas funciona
- [ ] Upload de mídia funciona
- [ ] Todas as páginas funcionam
- [ ] Não há erros no console

---

## 🔄 Fase 6: Validação

### Verificar em Cada Página

```javascript
// Em cada componente que usava localClient:

// ANTES
import { localClient } from '../API/localClient';
const data = localClient.getXxx();

// DEPOIS
import { api } from '../services/api';
const [data, setData] = useState([]);

useEffect(() => {
  api.xxx.list()
    .then(response => setData(response.data))
    .catch(error => console.error(error));
}, []);
```

---

## 🛡️ Fase 7: Limpeza

### Remover dependências de localStorage

**MANTER** (necessário):
```javascript
localStorage.getItem('token');
localStorage.setItem('token', token);
localStorage.removeItem('token');
```

**REMOVER** (banco de dados):
```javascript
// Remover estas chamadas:
localClient.getCampaigns();
localClient.getBuses();
localClient.getAdvertisers();
localClient.saveXxx();
// etc...
```

---

## 📚 Referência Rápida

### Login
```javascript
const { token, user } = await api.auth.login('email@test.com', 'password');
localStorage.setItem('token', token);
```

### Campanhas
```javascript
const campaigns = await api.campaigns.list();
const campaign = await api.campaigns.create({ name: 'Nova', ... });
await api.campaigns.update(id, { name: 'Editada' });
await api.campaigns.delete(id);
```

### Upload Mídia
```javascript
const file = new File([...], 'video.mp4', { type: 'video/mp4' });
const media = await api.campaigns.uploadMedia(campaignId, file);
```

### Métricas
```javascript
await api.metrics.recordImpression(campaignId, tabletId, 15);
const impressions = await api.metrics.listImpressions();
```

---

## 🎯 Ordem de Implementação (Recomendada)

1. **Criar `api.js`** (1-2h)
2. **Atualizar `AuthContext`** (30min-1h)
3. **Atualizar `Dashboard`** (30min)
4. **Atualizar `Campaigns`** (1-2h)
5. **Atualizar `Buses`** (30min)
6. **Atualizar `Advertisers`** (30min)
7. **Atualizar restante** (2-3h)
8. **Testar tudo** (1-2h)
9. **Remover `localClient`** (30min)

**Total**: 8-15 horas

---

## 🚀 Comandos Úteis

### Rodar backend
```bash
cd backend
npm run dev
```

### Rodar frontend
```bash
cd frontend
npm run dev
```

### Testar API com curl
```bash
# Login
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@publibus.dev","password":"admin123"}'

# Listar campanhas (com token)
curl -X GET http://localhost:4000/api/campaigns \
  -H "Authorization: Bearer <TOKEN>"
```

---

## ⚠️ Problemas Comuns

### "Cannot fetch from API"
- Verificar se backend está rodando (`npm run dev`)
- Verificar se `REACT_APP_API_URL` está correto
- Verificar CORS em backend (deve aceitar frontend URL)

### "Token expirado"
- Token JWT expira após 7 dias
- Fazer login novamente

### "Anunciante não vê campanhas de outro"
- Isso é correto! RBAC está funcionando
- Cada anunciante vê apenas suas campanhas

### "Upload não funciona"
- Verificar se arquivo é um dos tipos aceitos (JPEG, PNG, WebP, MP4)
- Verificar se tamanho < 50MB

---

## ✨ Sucesso!

Quando todas as páginas estiverem funcionando com o backend, seu frontend integrado está completo! 🎉

Próximos passos:
- [ ] Testes automatizados (opcional)
- [ ] Deploy em produção
- [ ] Monitoramento

---

**Bom desenvolvimento!** 🚀

