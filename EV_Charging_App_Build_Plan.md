# EV Charging App — Full Build Plan for Cline

**Project:** Megawatt (or your brand name) EV Charging Platform  
**Phase 1 scope:** Admin Panel \+ Backend API (OCPP-connected, no payment gateway)  
**Phase 2 scope:** Mobile App (React Native)  
**Stack:** Node.js \+ Express, PostgreSQL, React \+ Vite (Admin), React Native (Mobile), OCPP 1.6J WebSocket (existing server)

---

## 0\. Repository Structure

```
ev-charging/
├── backend/          # Node.js API server
│   ├── src/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── models/
│   │   ├── ocpp/         # OCPP WebSocket bridge
│   │   └── middleware/
│   ├── prisma/           # schema.prisma + migrations
│   └── package.json
│
├── admin/            # React + Vite admin dashboard
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   └── api/
│   └── package.json
│
└── mobile/           # React Native app (Phase 2)
    └── ...
```

---

## 1\. Database Schema (PostgreSQL via Prisma)

### Tables to create:

```
model User {
  id              String        @id @default(uuid())
  email           String        @unique
  phone           String?
  name            String
  passwordHash    String
  role            Role          @default(USER)  // USER | ADMIN
  createdAt       DateTime      @default(now())
  wallet          Wallet?
  vehicles        Vehicle[]
  transactions    Transaction[]
  messages        Message[]
}

model Wallet {
  id              String        @id @default(uuid())
  userId          String        @unique
  user            User          @relation(fields: [userId], references: [id])
  balancePeso     Decimal       @default(0.00)
  topUps          TopUp[]
}

model TopUp {
  id              String        @id @default(uuid())
  walletId        String
  wallet          Wallet        @relation(fields: [walletId], references: [id])
  amountPeso      Decimal
  note            String?       // admin note
  createdAt       DateTime      @default(now())
  createdBy       String        // admin user id
}

model Vehicle {
  id              String        @id @default(uuid())
  userId          String
  user            User          @relation(fields: [userId], references: [id])
  make            String
  model           String
  year            Int
  plateNumber     String?
  connectorType   String        // Type 1, Type 2, CCS, CHAdeMO, GB/T
}

model Station {
  id              String        @id @default(uuid())
  name            String
  address         String
  city            String
  latitude        Decimal
  longitude       Decimal
  isActive        Boolean       @default(true)
  openHours       String?       // "24/7" or "08:00-22:00"
  photos          String[]      // array of URLs
  chargers        Charger[]
  createdAt       DateTime      @default(now())
}

model Charger {
  id              String        @id @default(uuid())
  stationId       String
  station         Station       @relation(fields: [stationId], references: [id])
  ocppId          String        @unique  // chargePointId in OCPP
  name            String        // e.g. "Charger A"
  connectorType   String        // Type 2, CCS, CHAdeMO, etc.
  powerOutputKw   Decimal       // e.g. 22.00, 50.00, 150.00
  pricePerKwh     Decimal       // in PHP
  status          ChargerStatus @default(AVAILABLE)
  lastHeartbeat   DateTime?
  sessions        ChargingSession[]
}

enum ChargerStatus {
  AVAILABLE
  OCCUPIED
  FAULTED
  OFFLINE
  RESERVED
}

model ChargingSession {
  id              String        @id @default(uuid())
  chargerId       String
  charger         Charger       @relation(fields: [chargerId], references: [id])
  userId          String
  startTime       DateTime
  endTime         DateTime?
  energyKwh       Decimal       @default(0)
  costPeso        Decimal       @default(0)
  status          SessionStatus @default(ACTIVE)
  ocppTransactionId Int?
}

enum SessionStatus {
  ACTIVE
  COMPLETED
  CANCELLED
}

model Transaction {
  id              String        @id @default(uuid())
  userId          String
  user            User          @relation(fields: [userId], references: [id])
  type            TxnType       // TOP_UP | CHARGE | REFUND | VOUCHER
  amountPeso      Decimal
  description     String
  referenceId     String?       // sessionId or topUpId
  createdAt       DateTime      @default(now())
}

enum TxnType {
  TOP_UP
  CHARGE
  REFUND
  VOUCHER_REDEMPTION
}

model Voucher {
  id              String        @id @default(uuid())
  code            String        @unique
  discountPeso    Decimal?
  discountPercent Decimal?
  maxUses         Int           @default(1)
  usedCount       Int           @default(0)
  expiresAt       DateTime?
  isActive        Boolean       @default(true)
  redemptions     VoucherRedemption[]
  createdAt       DateTime      @default(now())
}

model VoucherRedemption {
  id              String        @id @default(uuid())
  voucherId       String
  voucher         Voucher       @relation(fields: [voucherId], references: [id])
  userId          String
  redeemedAt      DateTime      @default(now())
}

model Message {
  id              String        @id @default(uuid())
  userId          String        // recipient
  user            User          @relation(fields: [userId], references: [id])
  title           String
  body            String
  type            MessageType   // NOTIFICATION | TRANSACTION | VOUCHER | SUPPORT
  isRead          Boolean       @default(false)
  referenceId     String?       // transactionId, voucherId, etc.
  createdAt       DateTime      @default(now())
}

enum MessageType {
  NOTIFICATION
  TRANSACTION
  VOUCHER
  SUPPORT
}
```

---

## 2\. Backend API — Route Map

### Auth

```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/refresh
POST   /api/auth/logout
```

### Users (Admin only)

```
GET    /api/admin/users              — list all users
GET    /api/admin/users/:id          — user detail
PUT    /api/admin/users/:id          — update user
DELETE /api/admin/users/:id          — deactivate
```

### Wallet (Admin top-up only for Phase 1\)

```
GET    /api/admin/wallets/:userId    — get wallet balance + history
POST   /api/admin/wallets/:userId/topup  — add funds (PHP peso, admin only)
GET    /api/wallet/me                — user's own balance
```

### Stations

```
GET    /api/stations                 — public list (lat, lng, radius query params)
GET    /api/stations/:id             — station detail with chargers
POST   /api/admin/stations           — create station
PUT    /api/admin/stations/:id       — update station
DELETE /api/admin/stations/:id       — deactivate
```

### Chargers

```
GET    /api/chargers/:id             — charger detail + live status
POST   /api/admin/chargers           — add charger to station
PUT    /api/admin/chargers/:id       — update charger info/pricing
DELETE /api/admin/chargers/:id       — remove charger

// OCPP Control (calls OCPP bridge internally)
POST   /api/admin/chargers/:id/start — RemoteStartTransaction
POST   /api/admin/chargers/:id/stop  — RemoteStopTransaction
POST   /api/admin/chargers/:id/reset — Reset (soft or hard)
GET    /api/admin/chargers/:id/status — current OCPP status
```

### Sessions

```
GET    /api/sessions                 — user's own sessions
GET    /api/admin/sessions           — all sessions (with filters)
GET    /api/sessions/:id             — session detail
```

### Transactions

```
GET    /api/transactions             — user's own transaction history
GET    /api/admin/transactions       — all transactions (with filters)
```

### Vouchers

```
GET    /api/admin/vouchers           — list all vouchers
POST   /api/admin/vouchers           — create voucher
PUT    /api/admin/vouchers/:id       — edit voucher
DELETE /api/admin/vouchers/:id       — deactivate

POST   /api/vouchers/redeem          — user redeems a voucher code
```

### Messages / Inbox

```
GET    /api/messages                 — user's inbox
PUT    /api/messages/:id/read        — mark as read
DELETE /api/messages/:id             — delete message

POST   /api/admin/messages           — send notification to user(s) or broadcast
GET    /api/admin/messages           — all sent messages
```

### Vehicles

```
GET    /api/vehicles                 — user's vehicles
POST   /api/vehicles                 — add vehicle
PUT    /api/vehicles/:id             — update vehicle
DELETE /api/vehicles/:id             — remove vehicle
```

---

## 3\. OCPP Bridge (backend/src/ocpp/)

Connect your existing OCPP server via WebSocket. The backend acts as a CSMS (Central System Management System).

```
backend/src/ocpp/
├── ocppClient.js       # WebSocket connection manager to your OCPP server
├── messageHandler.js   # Handles incoming OCPP messages
├── commands.js         # RemoteStart, RemoteStop, Reset, GetStatus helpers
└── statusSync.js       # Syncs charger status changes to PostgreSQL in real-time
```

### Key OCPP Messages to Handle:

- **Incoming from charger:** `BootNotification`, `Heartbeat`, `StatusNotification`, `StartTransaction`, `StopTransaction`, `MeterValues`, `Authorize`  
- **Outgoing to charger:** `RemoteStartTransaction`, `RemoteStopTransaction`, `Reset`, `ChangeAvailability`, `GetConfiguration`

### Status sync logic:

When `StatusNotification` arrives → update `Charger.status` in DB → emit via Socket.IO to admin dashboard for live updates.

---

## 4\. Admin Panel — Pages

### Tech stack: React \+ Vite \+ TailwindCSS \+ React Query \+ Recharts

```
admin/src/pages/
├── Login.jsx
├── Dashboard.jsx          # summary stats, recent sessions, revenue
├── stations/
│   ├── StationList.jsx    # table of all stations with map preview
│   ├── StationCreate.jsx  # form: name, address, lat/lng picker
│   └── StationDetail.jsx  # station info + list of its chargers
├── chargers/
│   ├── ChargerList.jsx    # all chargers across stations, live status badges
│   ├── ChargerCreate.jsx  # form: station, ocppId, connector type, power, price
│   ├── ChargerDetail.jsx  # live status, controls (start/stop/reset), session history
│   └── ChargerControl.jsx # panel: RemoteStart (enter tag/userId), RemoteStop, Reset
├── users/
│   ├── UserList.jsx       # searchable user table
│   └── UserDetail.jsx     # user info + wallet + top-up form + vehicle list + tx history
├── wallets/
│   └── TopUpForm.jsx      # admin top-up: select user, enter amount (PHP), add note
├── transactions/
│   └── TransactionList.jsx # filterable list: by user, date, type
├── vouchers/
│   ├── VoucherList.jsx
│   └── VoucherCreate.jsx  # code, discount (peso or %), max uses, expiry
├── messages/
│   ├── InboxList.jsx      # all sent messages
│   └── ComposeMessage.jsx # send to: specific user / all users; title + body + type
└── settings/
    └── Settings.jsx       # admin profile, password change
```

### Admin Dashboard Cards (top level KPIs):

- Total active chargers / total chargers  
- Active sessions right now  
- Total revenue today (PHP)  
- Total users registered  
- Recent sessions table (live)  
- Charger status overview (pie chart: Available / Occupied / Faulted / Offline)

---

## 5\. Mobile App — Screens (Phase 2\)

### Tech stack: React Native \+ Expo \+ React Navigation (bottom tab)

### Bottom Navigation: 4 tabs

#### Tab 1 — Stations (Home / Map)

- Full-screen map (Google Maps or Mapbox)  
- Pins for each station (color-coded by availability: green \= available, orange \= occupied, red \= all faulted/offline)  
- Tap pin → station card slides up: name, address, available charger count, price range  
- "View Station" → Station Detail screen  
  - Station photos  
  - List of chargers (connector type, power output kW, price/kWh, live status badge)  
  - "Start Charging" button → select charger → confirm → deduct wallet → send RemoteStart

#### Tab 2 — Search

- Search bar: search by station name or city/address  
- Results list view showing:  
  - Station name \+ address  
  - Distance (km from current location)  
  - Price range (PHP/kWh)  
  - Charge points count (e.g. "4 charge points")  
  - Power output range (e.g. "22–150 kW")  
  - Availability badge (e.g. "3 of 4 available")  
- Filter/sort options: by distance, by price, by power output, by connector type  
- Tap result → Station Detail screen

#### Tab 3 — Inbox

Three sub-sections (segmented control at top):

1. **Notifications** — admin-sent announcements and messages  
2. **Transactions** — auto-generated transaction records (top-ups, charges, refunds)  
3. **Vouchers** — voucher cards received from admin with redemption button

#### Tab 4 — Profile

- Header: user name, email, wallet balance (PHP)  
  - "Top Up Wallet" button (Phase 1: contact admin; Phase 2: payment gateway)  
- Menu items:  
  - My Vehicles (list \+ add/edit/delete)  
  - Transaction History (full filterable list)  
  - Help Center (FAQ / contact support)  
  - Terms of Service  
  - Privacy Policy  
  - Log Out

---

## 6\. Build Order / Phases

### Phase 1A — Backend Foundation (Week 1–2)

- [ ] Initialize Node.js project with Express, Prisma, PostgreSQL  
- [ ] Setup Prisma schema (all models above)  
- [ ] Run initial migration  
- [ ] Implement auth middleware (JWT)  
- [ ] Auth routes (register, login, refresh, logout)  
- [ ] Seed script: create default admin user

### Phase 1B — OCPP Bridge (Week 2\)

- [ ] Connect to existing OCPP server via WebSocket  
- [ ] Handle `BootNotification`, `Heartbeat`, `StatusNotification`  
- [ ] Handle `StartTransaction`, `StopTransaction`, `MeterValues`  
- [ ] Implement `RemoteStartTransaction`, `RemoteStopTransaction`  
- [ ] Sync charger status to DB on `StatusNotification`  
- [ ] Socket.IO setup for real-time push to admin dashboard

### Phase 1C — Core API Routes (Week 2–3)

- [ ] Station CRUD (admin)  
- [ ] Charger CRUD \+ OCPP control endpoints (admin)  
- [ ] User management (admin)  
- [ ] Wallet top-up (admin only)  
- [ ] Transaction recording (auto on session events)  
- [ ] Voucher CRUD \+ redemption  
- [ ] Message/notification system

### Phase 1D — Admin Panel (Week 3–5)

- [ ] React \+ Vite \+ Tailwind setup  
- [ ] Login page \+ auth flow  
- [ ] Dashboard with KPI cards \+ live charger status  
- [ ] Station management pages (list, create, detail)  
- [ ] Charger management pages (list, create, control panel)  
- [ ] User management \+ wallet top-up form  
- [ ] Transaction list with filters  
- [ ] Voucher management (create, list, deactivate)  
- [ ] Message composer (send to user / broadcast)  
- [ ] Real-time charger status via Socket.IO

### Phase 2A — Mobile App (Week 6–9)

- [ ] React Native \+ Expo project setup  
- [ ] Navigation structure (bottom tabs \+ stack)  
- [ ] Auth screens (login, register)  
- [ ] Tab 1: Map view with station pins  
- [ ] Tab 2: Search \+ list view  
- [ ] Tab 3: Inbox (notifications, transactions, vouchers)  
- [ ] Tab 4: Profile, vehicles, history, help, T\&S, privacy  
- [ ] Wallet display \+ top-up flow (admin-only for now)  
- [ ] Start/stop charging session flow  
- [ ] Push notifications (FCM / APNs)

### Phase 2B — Payment Integration (Later)

- [ ] PayMongo or GCash integration  
- [ ] User-initiated wallet top-up via payment gateway  
- [ ] Webhook for payment confirmation → wallet credit

---

## 7\. Admin Panel Field Reference

### Station Form Fields

| Field | Type | Notes |
| :---- | :---- | :---- |
| Name | text | e.g. "Megawatt BGC Hub" |
| Address | text | street address |
| City | text |  |
| Latitude | decimal | from map picker |
| Longitude | decimal | from map picker |
| Open Hours | text | "24/7" or "08:00-22:00" |
| Photos | file upload | multiple, stored as URLs |
| Is Active | toggle | show/hide from public |

### Charger Form Fields

| Field | Type | Notes |
| :---- | :---- | :---- |
| Station | dropdown | select from stations |
| OCPP Charger ID | text | must match chargePointId in your OCPP server |
| Display Name | text | e.g. "Charger A1" |
| Connector Type | dropdown | Type 1, Type 2, CCS, CHAdeMO, GB/T |
| Power Output (kW) | decimal | e.g. 22, 50, 150 |
| Price per kWh (PHP) | decimal | e.g. 12.50 |

### Voucher Form Fields

| Field | Type | Notes |
| :---- | :---- | :---- |
| Code | text | e.g. "WELCOME100" |
| Discount Type | radio | Fixed peso / Percentage |
| Discount Amount | decimal | PHP or % |
| Max Uses | number | how many times total |
| Expires At | date | optional |

### Message Compose Fields

| Field | Type | Notes |
| :---- | :---- | :---- |
| Recipients | dropdown | Specific user / All users |
| Type | dropdown | Notification / Voucher / Support |
| Title | text | short subject |
| Body | textarea | message content |

---

## 8\. Environment Variables

```
# Backend .env
DATABASE_URL="postgresql://user:password@localhost:5432/ev_charging"
JWT_SECRET="your_jwt_secret_here"
JWT_REFRESH_SECRET="your_refresh_secret"
OCPP_SERVER_URL="ws://your-existing-ocpp-server:port/ocpp"
PORT=3001

# Admin .env
VITE_API_URL="http://localhost:3001/api"
VITE_SOCKET_URL="http://localhost:3001"
VITE_GOOGLE_MAPS_KEY="your_google_maps_api_key"
```

---

## 9\. Key Technical Notes for Cline

1. **OCPP connection:** The backend connects TO your existing OCPP server as a CSMS client. Use `ws` npm package. Maintain a persistent connection and reconnect on drop.  
     
2. **Charger status real-time:** Use Socket.IO rooms per `chargerId`. Admin dashboard subscribes to charger rooms and receives live status updates without polling.  
     
3. **Wallet deduction logic:** Before sending `RemoteStart`, check `wallet.balancePeso >= minimumSessionAmount` (e.g. ₱50 reserve). Hold the reserve, then deduct actual cost on `StopTransaction` using `MeterValues` energy data.  
     
4. **Transaction auto-creation:** Create a `Transaction` record automatically on:  
     
   - Admin top-up → type: `TOP_UP`  
   - Session complete → type: `CHARGE`  
   - Voucher redemption → type: `VOUCHER_REDEMPTION`  
   - Admin-issued refund → type: `REFUND`

   

5. **Message auto-creation:** Create a `Message` record automatically (type: `TRANSACTION`) whenever a transaction completes, so it appears in the user's Inbox under the Transactions tab.  
     
6. **Soft deletes:** Don't hard-delete stations, chargers, or users. Use `isActive: false` flag to deactivate. This preserves historical session data.  
     
7. **Google Maps in mobile:** Use `react-native-maps` with Google Maps provider. For the admin panel map picker (station lat/lng), use `@react-google-maps/api`.  
     
8. **Admin auth guard:** All `/api/admin/*` routes must require `role === 'ADMIN'` in JWT middleware. Return 403 for non-admin users.

---

## 10\. First Commands for Cline

Start with this sequence:

```shell
# 1. Initialize backend
mkdir ev-charging && cd ev-charging
mkdir backend && cd backend
npm init -y
npm install express prisma @prisma/client jsonwebtoken bcrypt ws socket.io cors dotenv
npx prisma init

# 2. Paste schema into prisma/schema.prisma then:
npx prisma migrate dev --name init

# 3. Initialize admin
cd ../
npm create vite@latest admin -- --template react
cd admin
npm install axios react-query react-router-dom @react-google-maps/api recharts socket.io-client tailwindcss
```

---

*Plan version: 1.0 | Built for Megawatt EV Charging Platform* *Phase 1 (Admin \+ Backend): Target 5 weeks | Phase 2 (Mobile): Target 4 weeks*  
