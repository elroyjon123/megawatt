# Megawatt Admin Panel

React + Vite admin dashboard for operators/admins.

## Setup

```bash
cd ev-charging/admin
npm install

# env
cp .env.example .env

# start on :5173
npm run dev
```

Then open:

- http://127.0.0.1:5173/

## Backend dependency

The admin panel expects the backend API to be running (default):

- `http://localhost:3001`

Seeded credentials (see backend seed script):

- Admin: `admin@megawatt.com / admin123`
- Operator: `operator@megawatt.com / operator123`

## Environment variables

Copy `.env.example` to `.env` and adjust values.

### Google Maps (optional)

If you provide `VITE_GOOGLE_MAPS_KEY`, the Stations create/edit forms will show a map picker for latitude/longitude.
