# 🚌 PUBLI-BUS Backend - Quick Reference

## 🚀 Start Backend in 3 Commands

```bash
cd backend
npm install
npm run prisma:migrate && npm run seed && npm run dev
```

Then open: **http://localhost:4000/api/health**

---

## 🔑 Test Credentials

| User | Email | Password |
|------|-------|----------|
| **ADMIN** | admin@publibus.dev | admin123 |
| **OPERATOR** | operator@publibus.dev | operator123 |
| **ADVERTISER** | anunciante@publibus.dev | anunciante123 |

---

## 🔓 Login & Get Token

```bash
# 1. Login
TOKEN=$(curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@publibus.dev","password":"admin123"}' \
  | jq -r '.data.token')

echo $TOKEN

# 2. Use token in requests
curl -X GET http://localhost:4000/api/dashboard \
  -H "Authorization: Bearer $TOKEN"
```

---

## 📌 Key Endpoints

### Authentication
```
POST   /api/auth/register          Create account
POST   /api/auth/login             Get JWT token
GET    /api/auth/me                Get user profile
POST   /api/auth/forgot-password   Request password reset
POST   /api/auth/reset-password    Reset with token
```

### Data Management
```
GET    /api/users                  List users (ADMIN only)
GET    /api/companies              List companies
GET    /api/advertisers            List advertisers
GET    /api/buses                  List buses
GET    /api/advertising-spaces     List spaces
GET    /api/campaigns              List campaigns
GET    /api/tablets                List tablets
GET    /api/campaigns/:id/media    List campaign media
```

### Analytics
```
POST   /api/impressions            Record ad display
GET    /api/impressions            List impressions
GET    /api/dashboard              Dashboard stats
GET    /api/reports/campaigns      Campaign reports
```

### Health
```
GET    /api/health                 Service status (no auth)
```

---

## 🔐 Authorization Levels

| Role | Permission |
|------|-----------|
| **ADMIN** | Everything (users, system config) |
| **OPERATOR** | Buses, tablets, campaigns, metrics |
| **ADVERTISER** | Own campaigns, media, company data |

---

## 📝 Create a Campaign (Example)

```bash
TOKEN="your-jwt-token-here"

curl -X POST http://localhost:4000/api/campaigns \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "advertiserId": "12345-uuid",
    "name": "My Campaign",
    "description": "Summer sale",
    "startDate": "2025-02-01T00:00:00Z",
    "endDate": "2025-03-01T00:00:00Z",
    "budget": 5000,
    "status": "DRAFT",
    "durationSeconds": 15
  }'
```

---

## 📤 Upload Media for Campaign

```bash
# Media must be: JPEG, PNG, WebP, or MP4
# Max size: 50MB (configurable in .env)

TOKEN="your-jwt-token"
CAMPAIGN_ID="campaign-uuid"

curl -X POST http://localhost:4000/api/campaigns/$CAMPAIGN_ID/media \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/path/to/image.jpg"
```

---

## 📊 View Dashboard

```bash
TOKEN="your-jwt-token"

curl -X GET http://localhost:4000/api/dashboard \
  -H "Authorization: Bearer $TOKEN"

# Response:
# {
#   "totalCampaigns": 3,
#   "activeCampaigns": 1,
#   "totalBuses": 3,
#   "totalAdvertisers": 1,
#   "totalImpressions": 40,
#   "revenue": 0
# }
```

---

## 📊 Record an Impression (Ad Display)

```bash
TOKEN="your-token"

curl -X POST http://localhost:4000/api/impressions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "campaignId": "uuid",
    "tabletId": "uuid",
    "durationSeconds": 15
  }'
```

---

## ⚙️ Environment (.env) Template

```env
DATABASE_URL="postgresql://user:pass@localhost:5432/publibus?schema=public"
JWT_SECRET="your-secret-key-16-chars-minimum"
PORT=4000
FRONTEND_URL="http://localhost:5173"
STORAGE_DRIVER="local"
```

---

## 🔧 Useful Commands

```bash
# Start dev server (auto-restart on changes)
npm run dev

# Start production server
npm start

# Create/run migrations
npm run prisma:migrate

# Load seed data (users, companies, buses, campaigns)
npm run seed

# View database in GUI
npm run prisma:studio

# Check project structure
node scripts/integrity-check.mjs

# Run smoke tests
npm run test:smoke
```

---

## 🔍 Debugging

### Check if backend is running
```bash
curl http://localhost:4000/api/health
```

### View database tables (psql)
```bash
psql $DATABASE_URL
\dt              # List tables
SELECT * FROM "User";
\q              # Exit
```

### View database in GUI
```bash
npm run prisma:studio
# Opens http://localhost:5555
```

### Check JWT token content
```bash
# Decode token at https://jwt.io
# Or use:
node -e "console.log(require('jsonwebtoken').decode('your-token'))"
```

---

## ❌ Common Errors

| Error | Solution |
|-------|----------|
| `ECONNREFUSED` | PostgreSQL not running. Start it or check `DATABASE_URL` |
| `JWT_SECRET too short` | Use string ≥16 characters |
| `CORS error` | Add frontend URL to `FRONTEND_URL` in `.env` |
| `Unauthorized` | Token expired or missing Bearer prefix |
| `Insufficient permissions` | User doesn't have required role |

---

## 📁 Project Structure

```
backend/
├── src/server.js              Entry point
├── src/app.js                 Express config
├── src/controllers/           HTTP handlers
├── src/services/              Business logic
├── src/routes/                Endpoints
├── src/middlewares/           Auth, validation, errors
├── prisma/schema.prisma       Data models
├── prisma/seed.js             Sample data
└── package.json               Dependencies
```

---

## 🌐 Frontend Integration

Replace `src/API/localClient.js` with real API calls:

```javascript
// Before
const campaigns = await localClient.getCampaigns();

// After
const response = await fetch('http://localhost:4000/api/campaigns', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const campaigns = await response.json();
```

Or create `src/services/api.js`:

```javascript
export const api = {
  auth: {
    login: (email, password) => 
      fetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({email, password})
      }).then(r => r.json()),
  },
  campaigns: {
    list: (token) =>
      fetch('/api/campaigns', {
        headers: {'Authorization': `Bearer ${token}`}
      }).then(r => r.json()),
  }
}
```

---

## 📚 More Info

- 📖 Full docs: See `backend/README.md`
- 🛠️ Setup guide: See `SETUP_LOCAL.md`
- ✅ Implementation status: See `BACKEND_STATUS.md`
- 📊 Progress: See `PROGRESS.md`

---

**Version**: 1.0.0 Beta
**Status**: Ready for testing ✅
**API Base URL**: `http://localhost:4000/api`

---
