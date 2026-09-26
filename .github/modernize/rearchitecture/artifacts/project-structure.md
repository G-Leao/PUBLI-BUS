# Project structure

PubBus is a React/Vite single-page SaaS interface backed by an Express REST API.
The frontend has route-level pages under `src/pages`, reusable UI primitives under
`src/components/ui`, shared layout/auth state, and a central REST adapter. The
backend is layered into routes, controllers, services, Prisma models, and storage.

Functional domains: authentication/profile, dashboard/usage, advertisers,
campaigns/media, tablets/devices, reports and maintenance settings.
Primary layers: browser UI -> `localClient`/`api` -> authenticated REST routes ->
services -> PostgreSQL/Prisma and local upload storage.
