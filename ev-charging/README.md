# Megawatt EV Charging (Phase 1)

This repo contains:

- `ev-charging/backend`: Express + Prisma API
- `ev-charging/admin`: React + Vite admin dashboard

## Prerequisites

- Node.js
- A PostgreSQL database (this project uses `ev-charging/backend/.env` → `DATABASE_URL`)

### Local dev DB on macOS (recommended): Postgres.app

This repo is easiest to run locally using **Postgres.app**.

1) Download + install: https://postgresapp.com/
2) Launch it and make sure it shows **Running** on port **5432**.
3) (Optional but recommended) Install CLI tools:
   - Postgres.app → **Settings** → **Command Line Tools** → **Install**

If the CLI tools are not on your PATH, you can still run them directly:

```bash
/Applications/Postgres.app/Contents/Versions/latest/bin/psql --version
```

Create the dev database (idempotent):

```bash
/Applications/Postgres.app/Contents/Versions/latest/bin/createdb -h localhost -p 5432 megawatt || true
```

## Backend

```bash
cd ev-charging/backend

# install deps
npm install

# run migrations
npx prisma migrate deploy

# generate Prisma client
npx prisma generate

# seed default admin + sample data
npm run seed

# (recommended) wipe + reseed small dataset for fast dev
npm run seed:wipe:small

# (optional) control seed size
npm run seed:small
npm run seed:medium
npm run seed:large

# (dev-only) wipe + reseed
npm run seed:wipe
npm run seed:wipe:small
npm run seed:wipe:medium
npm run seed:wipe:large

# start API on :3001
npm run dev
```

### Backend env quickstart

Copy the example env and update `DATABASE_URL`:

```bash
cd ev-charging/backend
cp .env.example .env
```

For Postgres.app (macOS user = `user`, no password):

```dotenv
DATABASE_URL="postgresql://user@localhost:5432/megawatt?schema=public"
```

> If your local DB username is different, replace `user`.

### Seeding options

The seed script supports:

- `SEED_SCALE=small|medium|large` (default: `medium`)
- CLI flags:
  - `--scale small|medium|large`
  - `--wipe` (⚠️ dev-only, deletes all rows before seeding)

Examples:

```bash
cd ev-charging/backend

# environment-based
SEED_SCALE=large npm run seed

# flag-based
npm run seed -- --scale small

# wipe & reseed
npm run seed -- --wipe --scale medium
```

### Default admin account (seed)

- Email: `admin@megawatt.com`
- Password: `admin123`

### Option A (OCPP VM) — important env vars

This project is standardized on **Option A**:
- OCPP VM forwards charger events to backend via `/api/internal/*`
- backend calls OCPP VM admin API via `/api/admin/ocpp-server/*`

Relevant env vars in `ev-charging/backend/.env`:
- `INTERNAL_TOKEN` / `INTERNAL_TOKENS` (required for OCPP VM → backend webhooks)
- `OCPP_ADMIN_HTTP_BASE_URL` (backend → OCPP VM admin HTTP)
- `OCPP_ADMIN_HTTP_TOKEN` (optional)
- `ADMIN_MAINTENANCE_TOKEN` (optional “break-glass” auth)

### Health check

- http://localhost:3001/health

## Admin Panel

```bash
cd ev-charging/admin
npm install

# required env
cat .env

# start on :5173
npm run dev
```

Then open:

- http://127.0.0.1:5173/

## User App (customer login/signup)

```bash
cd ev-charging/user-app
npm install

# env
cp .env.example .env

# start on :5174
npm run dev
```

Then open:

- http://127.0.0.1:5174/

### Google login (OAuth)

Backend endpoints:

- `GET /api/auth/google/start`
- `GET /api/auth/google/callback`

To enable Google login, set these in `ev-charging/backend/.env`:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URL` (default: `http://localhost:3001/api/auth/google/callback`)
- `USER_APP_AUTH_REDIRECT_URL` (default: `http://localhost:5174/auth/callback`)
