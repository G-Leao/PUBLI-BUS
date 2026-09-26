# Tech stack

- Frontend: React 18, Vite 6, React Router 6, Tailwind CSS, Radix UI, Framer Motion.
- State/auth: React context (`AuthContext`), localStorage session token, REST fetch adapter.
- Backend: Node.js ESM, Express 4, JWT, Zod, Multer, Prisma 5, PostgreSQL.
- Existing integration: `POST /api/uploads` persists files and returns `fileUrl`.
- SaaS additions: `PlanType`, `User.plan`, `User.avatarUrl`, `PUT /api/auth/me`, and
  service-level resource limit enforcement.
