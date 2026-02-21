# FleetFlow — Enterprise Fleet Management

FleetFlow is a full-stack fleet operations platform with live dispatch, maintenance tracking, finance logging, analytics, and RBAC controls. It is organized as a workspaced monorepo:

```
FleetFlow/
├── backend/    # NestJS API — Prisma (PostgreSQL), Redis locks/cache, JWT auth
└── frontend/   # Next.js 16 App Router — RBAC-aware UI, Tailwind, SWR
```

## Prerequisites
- Node.js 20+ (recommended LTS)
- npm 10+
- PostgreSQL database (Neon URL provided in `.env` works for dev)
- Redis (Upstash) for caching/locks

## Environment Setup
1) Copy `backend/.env` (or create `backend/.env`):
```
DATABASE_URL=postgresql://...
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
JWT_SECRET=your_jwt_secret_here
JWT_REFRESH_SECRET=your_refresh_secret_here
NODE_ENV=development
PORT=5000
```
2) Install dependencies from the repo root (uses npm workspaces):
```
npm install
```
3) (Optional) Seed sample data:
```
cd backend
npx prisma db seed
```

## Running in Development
Open two terminals (recommended):
- API: `npm run dev:backend` (serves http://localhost:5000)
- Web: `npm run dev:frontend` (serves http://localhost:3000, proxies /api to backend)

If you prefer starting only the API, you can also run `npm run dev` from root (alias to backend dev).

## Building for Production
1) Build both apps:
```
npm run build
```
2) Start services (separate terminals or processes):
```
npm run start:backend   # runs dist/main.js (NestJS)
npm run start:frontend  # runs Next.js production server
```

## Useful Scripts (root)
- `npm run dev:backend` — start NestJS in watch mode
- `npm run dev:frontend` — start Next.js dev server
- `npm run build` — build backend and frontend
- `npm run lint` — lint both workspaces
- `npm run start:backend` — start compiled API
- `npm run start:frontend` — start Next.js in production mode

## Notes
- The frontend uses middleware to enforce role-based access and proxies `/api/*` calls to the backend. Ensure backend and frontend origins match cookies (default: localhost:5000 and 3000).
- Prisma migrations are not yet committed; `npx prisma db seed` creates schema+fixtures against your configured database.
- Default seeded accounts (password: `fleetadmin123`):
	- `super_admin@fleetflow.com`
	- `manager@fleetflow.com`
	- `dispatcher@fleetflow.com`
	- `safety@fleetflow.com`
	- `finance@fleetflow.com`
