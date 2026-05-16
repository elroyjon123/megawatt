# OCPP VM (Option A) — Required Contract & Missing Components

**Repo:** Megawatt (EV Charging Platform)

This document lists the **capabilities we still need/assume** from the OCPP VM we control, so our **webapps (Admin + User App)** can reliably:

- show live charger status
- start/stop sessions
- compute energy/cost
- keep DB state consistent

> We are standardizing on **Option A**:
> - Chargers connect to the **OCPP VM** over OCPP WebSocket.
> - The OCPP VM forwards events to this backend via **HTTP webhooks**.
> - This backend calls the OCPP VM admin API via **HTTP** for RemoteStart/RemoteStop/Reset/etc.

---

## 1) What we already implemented on our side (backend)

### 1.1 Internal webhook receiver (Option A)
File: `ev-charging/backend/src/routes/internal.js`

Endpoints (all require header `X-Internal-Token`):

Charger events:
- `POST /api/internal/charger/boot`
- `POST /api/internal/charger/heartbeat`
- `POST /api/internal/charger/status`

Session lifecycle:
- `POST /api/internal/session/start`
- `POST /api/internal/session/meter`
- `POST /api/internal/session/stop`

Realtime-only (no DB required):
- `POST /api/internal/session/progress`
- `POST /api/internal/cpo/alert`

### 1.3 DB + realtime sync

- `statusSync.js`: maps OCPP status → our `Charger.status`, updates `lastHeartbeat`, emits Socket.IO events.
- `sessionSync.js`: creates/updates `ChargingSession`, updates wallet and creates `Transaction` + `Message` on session stop.

### 1.2 OCPP VM admin API proxy (Option A)
File: `ev-charging/backend/src/routes/admin/ocppServerProxy.js`

This backend proxies OCPP VM endpoints under:
- `/api/admin/ocpp-server/*`

And charger control endpoints now prefer calling the OCPP VM HTTP API:
- `POST /api/admin/chargers/:id/start|stop|reset`

---

## 2) The OCPP VM: what we need from it (Option A contract)

### 2.1 Must forward events to our backend via HTTP (webhooks)

The OCPP VM must call the internal endpoints listed above whenever it receives OCPP charger messages.

### 2.2 Must support OCPP 1.6J frames (JSON over WebSocket) for charger connections

We expect standard OCPP frames:

- **CALL:** `[2, uniqueId, action, payload]`
- **CALLRESULT:** `[3, uniqueId, payload]`
- **CALLERROR:** `[4, uniqueId, errorCode, errorDescription, errorDetails]`

Our client will parse JSON and route by `action`.

### 2.3 Must include `chargePointId` (ocppId) in webhook payloads

Our handlers look for:

- `payload.chargePointId` **or** `payload.ocppId`

If the bridge does not include one of these, we cannot map the message to a `Charger` row.

**Required:** every forwarded event must be attributable to exactly one charger.

### 2.4 Must expose an Admin HTTP API for outgoing commands

Required endpoints on the OCPP VM (these are what our proxy calls):
- `POST /admin/remote-start` body: `{ chargePointId, idTag, connectorId }`
- `POST /admin/remote-stop` body: `{ chargePointId, transactionId }`
- `POST /admin/reset` body: `{ chargePointId, type }`

Optional (already proxied):
- `POST /admin/change-availability`
- `POST /admin/unlock-connector`
- `POST /admin/get-configuration`

### 2.5 Must expose consistent outcomes for commands

For example:

- `RemoteStartTransaction` → `{ status: "Accepted" | "Rejected" }`
- `RemoteStopTransaction` → `{ status: "Accepted" | "Rejected" }`
- `Reset` → `{ status: "Accepted" | "Rejected" }`

If the bridge uses non-standard response schemas, we must normalize them.

---

## 3) Missing / incomplete event coverage (needed for a production Option A VM)

The build plan expects more OCPP messages than we currently handle.

### 3.1 BootNotification
OCPP VM should call `POST /api/internal/charger/boot` when it receives BootNotification.

### 3.2 Authorize / idTag mapping
For Phase 1 Option A we will keep the contract simple:
- OCPP VM resolves `idTag → userId` and forwards `userId` on session start webhook.

Long-term, we can add an `/api/internal/authorize` endpoint if we want the backend to be the authority.

### 3.3 ChangeAvailability / UnlockConnector / GetConfiguration / Diagnostics
Not implemented yet but typically needed for operations.

**Bridge requirement:** support routing for these actions too.

---

## 4) Missing data contract for sessions (critical)

### 4.1 `transactionId` stability
Our session sync depends on:

- `payload.transactionId` being present for `MeterValues` and `StopTransaction`

If the bridge renames this or uses a nested structure, we need a mapping.

### 4.2 MeterValues format
We can parse:

- `payload.meterValue` or `payload.meterValues`
- sampledValue entries with `measurand == "Energy.Active.Import.Register"` and unit `Wh` or `kWh`

**Bridge requirement:** forward raw OCPP meter values or provide an equivalent numeric field.

### 4.3 Timestamps
We accept ISO strings or Date-like values for timestamps.

**Bridge requirement:** provide timestamps consistently (`timestamp` fields) or omit them (we’ll use server time).

---

## 5) Security / auth expectations

### 5.1 Webhooks
All internal webhook calls must include:
- `X-Internal-Token: <INTERNAL_TOKEN>`

### 5.2 Admin HTTP API
If the OCPP VM admin API is protected, configure:
- `OCPP_ADMIN_HTTP_TOKEN` (Bearer token)

---

## 6) Observability + operations requirements (missing)

For production stability we need from the OCPP server/bridge:

- a way to list connected chargers
- a way to validate routing ("is charger X connected?")
- logs / trace ids for commands and forwarded events
- heartbeat/offline detection policy

Our backend already exposes:

- `GET /api/admin/ocpp/status` → `{ connected, urlConfigured }`

But we still need charger-level info.

---

## 7) Compatibility checklist to validate with the OCPP server/bridge owner

### 7.1 Connection
- [ ] `ws://34.69.12.177:9000/ocpp` is reachable from our backend host
- [ ] Supports OCPP 1.6 JSON frames
- [ ] Supports long-lived connections and reconnect

### 7.2 Forwarding (charger → our backend)
- [ ] Forwards: `BootNotification`, `Heartbeat`, `StatusNotification`, `StartTransaction`, `MeterValues`, `StopTransaction`, `Authorize`
- [ ] Includes `chargePointId` or `ocppId` in forwarded payload
- [ ] Preserves `uniqueId` from incoming CALL frames

### 7.3 Routing (our backend → charger)
- [ ] Routes by payload `chargePointId`
- [ ] Returns CALLRESULT/CALLERROR for every command
- [ ] Supports: `RemoteStartTransaction`, `RemoteStopTransaction`, `Reset` (+ optionally ChangeAvailability, UnlockConnector)

### 7.4 Session correctness
- [ ] `transactionId` is consistent across Start/Meter/Stop
- [ ] Meter values include energy (Wh or kWh)

### 7.5 Auth
- [ ] Document auth method (none / token / mTLS)
- [ ] Rotate credentials without downtime

---

## 8) Suggested test procedure (end-to-end)

1) In DB, create a charger with `ocppId` matching a real charger’s chargePointId.
2) Ensure the charger is connected to the remote bridge.
3) Observe in backend logs:
   - `StatusNotification` updates charger status
   - `Heartbeat` updates `lastHeartbeat`
4) Issue RemoteStart from admin (or via curl) and confirm:
   - bridge routes command
   - charger starts
   - backend receives `StartTransaction` with a user mapping strategy
5) Ensure `MeterValues` updates energy
6) On StopTransaction, verify:
   - session is closed
   - wallet debit + Transaction created exactly once

---

## 9) Open questions (must be answered to finish OCPP integration)

1) Is the remote endpoint a real OCPP CSMS, or a custom relay?
2) How do we map `idTag` → `User`?
3) Do we need multi-tenant / multiple CSMS clients?
4) What is the authoritative charger connection state source (bridge vs our DB)?

---

If you want, I can extend this doc with a concrete **message schema examples** section (sample JSON frames for each action) once you confirm what the remote bridge actually sends.
