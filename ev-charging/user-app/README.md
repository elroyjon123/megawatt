# Megawatt User Web App (Phase 1)

Customer-facing React + Vite web app.

## Prerequisites

- Backend API running on `http://localhost:3001`
- `ev-charging/user-app/.env` with:

```dotenv
VITE_API_URL="http://localhost:3001/api"
```

## Run

```bash
cd ev-charging/user-app
npm install

cp .env.example .env
npm run dev
```

Open:

- http://127.0.0.1:5174/

## Implemented screens

- Auth: Login / Signup / Google OAuth callback
- Stations: list + station detail (chargers)
- Chargers: charger detail
- Wallet: balance
- Sessions: list
- Transactions: list
- Inbox: list/read/delete messages
- Vouchers: redeem code
- Vehicles: CRUD
- Profile: edit name/phone + change password

## Notes

- Starting/stopping charging sessions is done via OCPP + admin/operator actions in Phase 1.
- Wallet top-up is admin-driven in Phase 1 (no payment gateway).
