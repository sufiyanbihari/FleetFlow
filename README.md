# FleetFlow — Enterprise Fleet Management System

A full-stack monorepo structured as:

```
FleetFlow/
├── backend/    # NestJS API — RBAC, Prisma, Redis, WebSockets
└── frontend/   # Next.js 16 — ABAC UI, Tailwind, Middleware gating
```

## Quick Start

### Backend (NestJS)
```bash
cd backend
npm install
npm run start:dev
```

### Frontend (Next.js)
```bash
cd frontend
npm install
npm run dev
```

### From Root (requires npm workspaces support)
```bash
npm run dev:backend   # Start NestJS dev server
npm run dev:frontend  # Start Next.js dev server
npm run test:backend  # Run Jest suite
npm run build:backend # Production build
npm run build:frontend
```

## Architecture

| Layer | Tech | Details |
|---|---|---|
| API Server | NestJS + Fastify | REST, WebSockets, Guards |
| Database | PostgreSQL (Neon) | Prisma ORM, pgbouncer |
| Cache / Locks | Upstash Redis | UUID distributed locks, TTL cache |
| Auth | JWT + RolesGuard | Numeric RBAC hierarchy |
| Frontend | Next.js 16 App Router | Tailwind, Middleware ABAC gating |

## Environment

Copy `backend/.env.example` (or `backend/.env`) and fill in:
- `DATABASE_URL` — Neon PostgreSQL connection string
- `DIRECT_URL` — Direct (non-pooled) connection for migrations
- `UPSTASH_REDIS_REST_URL` — Upstash Redis URL
- `UPSTASH_REDIS_REST_TOKEN` — Upstash Redis token
- `NODE_ENV` — `development` | `production`
