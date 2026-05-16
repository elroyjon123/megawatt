# Megawatt — User Mobile App

## Cline Build Plan (React Native \+ Expo)

**Reference:** Patterned after the Evro PH app — the leading EV charging platform in the Philippines. Evro's current feature set includes: real-time map with color-coded station pins, smart filters (charger type, availability, vehicle compatibility), in-app payments, live session monitoring, active metering, hold & charge, and a station finder covering 240+ DOE-registered sites. Megawatt builds on this pattern with a wallet-first approach (PHP peso, admin top-up), OCPP-direct session control, vouchers, and a full inbox system.

---

## Tech Stack

| Layer | Choice | Reason |
| :---- | :---- | :---- |
| Framework | React Native \+ Expo (SDK 51+) | iOS \+ Android from one codebase |
| Navigation | Expo Router (file-based) \+ Bottom Tabs | Matches Evro's tab layout |
| Maps | `react-native-maps` \+ Google Maps | Station pins, clustering |
| State | Zustand \+ React Query | Server state \+ local state |
| Auth | JWT (access \+ refresh tokens) | From existing backend |
| Realtime | Socket.IO client | Live charger status, session updates |
| Styling | NativeWind (Tailwind for RN) | Fast, consistent styling |
| Push notifs | Expo Notifications (FCM \+ APNs) | Admin-sent notifications |
| HTTP | Axios with interceptors | Token refresh, error handling |

---

## File / Folder Structure

```
mobile/
├── app/                          # Expo Router pages
│   ├── (auth)/
│   │   ├── login.tsx
│   │   ├── register.tsx
│   │   └── forgot-password.tsx
│   ├── (tabs)/
│   │   ├── _layout.tsx           # Bottom tab navigator
│   │   ├── index.tsx             # Tab 1: Map / Stations
│   │   ├── search.tsx            # Tab 2: Search
│   │   ├── inbox.tsx             # Tab 3: Inbox
│   │   └── profile.tsx           # Tab 4: Profile
│   ├── station/
│   │   └── [id].tsx              # Station detail screen
│   ├── charger/
│   │   └── [id].tsx              # Charger detail + start charging
│   ├── session/
│   │   └── [id].tsx              # Live session screen
│   └── _layout.tsx               # Root layout (auth guard)
│
├── components/
│   ├── map/
│   │   ├── StationPin.tsx        # Color-coded map marker
│   │   ├── StationCard.tsx       # Bottom sheet preview card
│   │   └── ClusterPin.tsx        # Grouped pin for zoomed-out view
│   ├── station/
│   │   ├── ChargerRow.tsx        # Charger list item (type, power, status, price)
│   │   ├── StationHeader.tsx     # Photo carousel + name + address
│   │   └── AvailabilityBadge.tsx # Green/Orange/Red badge
│   ├── session/
│   │   ├── SessionMeter.tsx      # Live kWh + PHP cost counter
│   │   ├── SessionTimer.tsx      # Elapsed time
│   │   └── StopButton.tsx        # Stop session CTA
│   ├── inbox/
│   │   ├── NotificationItem.tsx
│   │   ├── TransactionItem.tsx
│   │   └── VoucherCard.tsx
│   ├── ui/
│   │   ├── BottomSheet.tsx
│   │   ├── FilterChip.tsx
│   │   ├── LoadingSpinner.tsx
│   │   ├── EmptyState.tsx
│   │   └── PesoAmount.tsx        # Formatted PHP peso display
│   └── profile/
│       ├── VehicleCard.tsx
│       └── TransactionRow.tsx
│
├── hooks/
│   ├── useSession.ts             # Active session state + Socket.IO
│   ├── useLocation.ts            # Device GPS
│   ├── useStations.ts            # Nearby stations query
│   └── useWallet.ts              # Wallet balance query
│
├── lib/
│   ├── api.ts                    # Axios instance + interceptors
│   ├── socket.ts                 # Socket.IO singleton
│   └── store.ts                  # Zustand global store
│
└── constants/
    ├── colors.ts                 # Megawatt brand colors
    └── connectorTypes.ts         # Type 1, Type 2, CCS, CHAdeMO, GB/T
```

---

## Screen-by-Screen Specification

---

### Onboarding & Auth

#### Splash / Onboarding (3 slides)

- Slide 1: Map illustration — "Find chargers near you"  
- Slide 2: Plug illustration — "Start charging in seconds"  
- Slide 3: Wallet illustration — "Pay with your Megawatt wallet"  
- CTA: "Get Started" → Register, "I already have an account" → Login

#### Register screen

Fields: Full name, email, mobile number (PH format), password, confirm password

- OTP verification on mobile number (optional Phase 2\)  
- "By registering you agree to our Terms of Service and Privacy Policy" (linked)  
- After register → prompt to add first vehicle → then go to Map tab

#### Login screen

- Email \+ password  
- "Forgot password?" → email reset flow  
- Social login (Phase 2 — Google)

#### Forgot password

- Enter email → receive reset link → new password screen

---

### Tab 1 — Stations (Map View)

Evro pattern: full-screen map, color-coded pins, bottom sheet station preview, smart filters

#### Main map screen

- Full-screen Google Map as base layer  
- User location dot (blue) with accuracy ring  
- Station pins — color coded:  
  - **Green** — at least one charger available  
  - **Orange** — all chargers occupied  
  - **Red** — all chargers faulted or offline  
  - **Gray** — station closed / outside open hours  
- Pins cluster when zoomed out (show count badge)  
- "Locate me" FAB (bottom right)  
- Filter bar (horizontal scroll, top of map):  
  - All | Available now | Fast charge (50kW+) | Type 2 | CCS | CHAdeMO | GB/T  
- Search bar (top): tapping goes to Search tab with keyboard open  
- Active session banner (if session in progress): slides up from bottom — "Charging at BGC Hub · 4.2 kWh · ₱52.50" → tap to go to live session screen

#### Station pin tap → Bottom sheet preview

Shows (collapsed, \~280px):

- Station photo (thumbnail)  
- Station name \+ distance (e.g. "2.3 km away")  
- Open hours badge (Open / Closed)  
- Available charger count (e.g. "3 of 5 available")  
- Price range (e.g. "₱9.50 – ₱14.00 / kWh")  
- Connector type icons (small icon row: Type 2, CCS)  
- "View Station" button → Station Detail screen

---

### Station Detail Screen

Full screen, not a tab. Accessed from map pin or search result.

#### Top section

- Photo carousel (swipeable, 1–5 photos)  
- Station name (large)  
- Full address  
- Distance from current location  
- Open hours (e.g. "Open 24/7" or "08:00 – 22:00")  
- Map thumbnail (small, tappable → opens Google Maps navigation)  
- "Get directions" button → deep links to Google Maps / Waze

#### Charger list

Each charger row shows:

- Charger display name (e.g. "Charger A1")  
- Connector type icon \+ label (Type 2, CCS, CHAdeMO, GB/T)  
- Power output (e.g. "50 kW")  
- Price per kWh (e.g. "₱12.50 / kWh")  
- Status badge:  
  - Available (green)  
  - Occupied (orange) — shows "In use" \+ estimated time remaining if available  
  - Faulted (red)  
  - Offline (gray)  
- "Charge here" button (only shown on Available chargers)

#### "Charge here" → Pre-session confirmation sheet

Bottom sheet with:

- Selected charger name \+ connector \+ power  
- Your wallet balance (₱XXX.XX)  
- Estimated cost note: "Billed by actual kWh consumed"  
- Voucher code field (optional): enter code → apply → shows discount  
- "Start Charging" button (disabled if wallet \< ₱50 minimum reserve)  
- Wallet too low state: "Insufficient balance — contact your admin to top up"

---

### Live Session Screen

Evro pattern: active metering, real-time kWh \+ cost, stop button

- Station name \+ charger name  
- Large animated charging indicator (bolt icon pulsing)  
- Live counter — updates every \~5 seconds via Socket.IO:  
  - **Energy delivered:** 4.23 kWh (large number)  
  - **Session cost:** ₱52.88 (large, below energy)  
  - **Elapsed time:** 00:42:15  
  - **Power draw:** 22 kW (current)  
- Charger status: "Charging" / "Preparing" / "Finishing"  
- "Stop Charging" button (red, bottom — requires confirm dialog)  
- Confirm dialog: "Stop charging session? Final cost will be calculated and deducted from your wallet."  
- After stop: session summary modal → then pushed to Inbox → Transactions

#### Session summary modal (on stop)

- Station \+ charger  
- Total energy: X.XX kWh  
- Total duration: HH:MM:SS  
- Cost breakdown:  
  - Energy cost: ₱XX.XX  
  - Voucher discount: –₱XX.XX (if applied)  
  - **Total charged:** ₱XX.XX  
- Remaining wallet balance: ₱XXX.XX  
- "Done" → goes back to Map tab  
- "View receipt" → goes to transaction detail in Inbox

---

### Tab 2 — Search

Evro pattern: searchable list of all stations with smart filters

#### Search bar

- Persistent search input at top  
- Placeholder: "Search by station name or city..."  
- Voice search button (Phase 2\)

#### Filter row (horizontal scroll chips below search bar)

- Connector type: All | Type 2 | CCS | CHAdeMO | GB/T  
- Availability: All | Available now  
- Power: All | Standard (≤22kW) | Fast (22–50kW) | Ultra-fast (50kW+)  
- Sort: Nearest | Price (low) | Price (high) | Most available

#### Station list item

Each result card shows:

- Station name (bold)  
- Address \+ city  
- Distance (e.g. "1.8 km")  
- Charge points count (e.g. "6 charge points")  
- Power output range (e.g. "22 – 150 kW")  
- Price range (e.g. "₱9.50 – ₱14.00 / kWh")  
- Availability status badge (X of Y available)  
- Connector type icon row  
- Tap card → Station Detail screen

#### Empty state

"No stations found near you. Try adjusting your filters or search a different area."

---

### Tab 3 — Inbox

Evro pattern: notifications \+ transaction history. Megawatt adds: vouchers tab.

Three segments (top segmented control):

#### Segment 1 — Notifications

- Admin-sent messages and announcements  
- Each item: icon (megaphone), title, body preview, timestamp  
- Unread items have a teal left border accent  
- Tap → expand full message (mark as read)  
- Empty state: "No notifications yet"

#### Segment 2 — Transactions

- Auto-generated on every wallet event  
- Each item shows:  
  - Transaction type icon:  
    - Top-up (wallet \+ arrow up) — green  
    - Charge session (bolt) — teal  
    - Voucher redemption (tag) — purple  
    - Refund (arrow return) — blue  
  - Description (e.g. "Charged at BGC Hub · Charger A1")  
  - Amount (e.g. "–₱52.88" in red for charges, "+₱200.00" in green for top-ups)  
  - Date \+ time  
  - Tap → Transaction detail screen

#### Transaction detail screen

- Type \+ icon  
- Station \+ charger (for session transactions)  
- Date and time  
- Amount  
- Reference ID  
- Session stats (if charge): kWh, duration  
- Voucher applied (if any)  
- Wallet balance after transaction

#### Segment 3 — Vouchers

- Cards for each voucher received or claimed  
- Each voucher card shows:  
  - Voucher code (large, monospaced)  
  - Discount value (e.g. "₱100 OFF" or "20% OFF")  
  - Expiry date  
  - Status badge: Active | Redeemed | Expired  
  - "Apply at checkout" note (not a button — applied during pre-session flow)  
- Empty state: "No vouchers yet. Watch out for promos from Megawatt\!"

---

### Tab 4 — Profile

Evro pattern: personal info, transaction history, help, legal. Megawatt adds: wallet display.

#### Profile header

- Avatar initials circle (no photo upload for now — Phase 2\)  
- Full name  
- Email  
- Mobile number  
- **Wallet balance** — prominently displayed: "₱ 250.00 available"  
- "Top Up" label (tappable → shows "Contact your admin to top up your wallet" modal — no payment gateway yet)

#### Menu items (list)

**Account**

- My Vehicles  
- Transaction History (full list — same as Inbox Transactions tab)  
- Edit Profile (name, mobile)  
- Change Password

**Support**

- Help Center (FAQ accordion)  
- Contact Support (opens email or support message form)  
- Report an Issue

**Legal**

- Terms of Service (in-app webview)  
- Privacy Policy (in-app webview)

**App**

- App version (read-only, e.g. "Megawatt v1.0.0")  
- Log Out (red text, with confirm dialog)

---

### My Vehicles Screen

- List of added vehicles  
- Each vehicle card:  
  - Make \+ Model \+ Year (e.g. "BYD Sealion 6 · 2024")  
  - Plate number (if added)  
  - Connector type badge (auto-matched from vehicle data)  
  - Edit | Delete actions  
- "Add Vehicle" button → Add vehicle form

#### Add / Edit Vehicle form

Fields:

- Make (text or searchable dropdown — common PH EV brands: BYD, Nissan, Hyundai, Kia, MG, Volvo, BMW, Mercedes, Audi, Toyota, Mitsubishi)  
- Model (text)  
- Year (number picker)  
- Plate number (optional)  
- Connector type (dropdown: Type 1 | Type 2 | CCS | CHAdeMO | GB/T)  
- "Save vehicle"

---

### Help Center Screen

FAQ accordion sections:

**Getting started**

- How do I create an account?  
- How do I add my vehicle?  
- How does the wallet work?

**Charging**

- How do I start a charging session?  
- What happens if charging stops unexpectedly?  
- Can I stop a session early?

**Wallet & Payments**

- How do I top up my wallet?  
- When is my wallet deducted?  
- What if I was charged but no energy was delivered?

**Vouchers**

- How do I use a voucher?  
- When do vouchers expire?

**Account**

- How do I change my password?  
    
- How do I delete my account?  
    
- "Still need help?" → Contact Support button (email or in-app message)

---

## API Connections (Mobile → Backend)

```
Auth
  POST   /api/auth/register
  POST   /api/auth/login
  POST   /api/auth/refresh
  POST   /api/auth/logout
  POST   /api/auth/reset-password

Stations & Chargers (public)
  GET    /api/stations?lat=&lng=&radius=&filters=
  GET    /api/stations/:id
  GET    /api/chargers/:id

Sessions
  POST   /api/sessions/start        { chargerId, voucherCode? }
  POST   /api/sessions/:id/stop
  GET    /api/sessions/:id          live session detail
  GET    /api/sessions              user history

Wallet
  GET    /api/wallet/me

Vouchers
  POST   /api/vouchers/validate     { code } → preview discount
  POST   /api/vouchers/redeem       { code, sessionId }

Messages / Inbox
  GET    /api/messages              all inbox items (paginated)
  PUT    /api/messages/:id/read
  DELETE /api/messages/:id

Transactions
  GET    /api/transactions          user history (paginated)
  GET    /api/transactions/:id

Vehicles
  GET    /api/vehicles
  POST   /api/vehicles
  PUT    /api/vehicles/:id
  DELETE /api/vehicles/:id

Profile
  GET    /api/profile/me
  PUT    /api/profile/me
  POST   /api/profile/change-password

Push notifications
  POST   /api/profile/push-token    { expoPushToken }
```

---

## Socket.IO Events (Real-time)

```javascript
// Client subscribes on session start
socket.emit('join:session', { sessionId })

// Server pushes every ~5 seconds during active session
socket.on('session:meter', { energyKwh, costPeso, powerKw, elapsedSeconds })

// Server pushes when session ends (charger stopped)
socket.on('session:ended', { sessionId, totalKwh, totalCost })

// Server pushes charger status changes (map updates)
socket.on('charger:status', { chargerId, status })

// User subscribes to own wallet on login
socket.emit('join:wallet', { userId })
socket.on('wallet:updated', { newBalance })
```

---

## Key UX Patterns to Match Evro

| Evro Pattern | Megawatt Implementation |
| :---- | :---- |
| Color-coded map pins | Green / Orange / Red / Gray — same logic |
| Smart filters on map | Filter chips: connector type, availability, power tier |
| Bottom sheet station preview | Snap to 280px on pin tap, full expand on swipe |
| Real-time availability on station list | Live charger count badge, updates via Socket.IO |
| Active metering during session | Live kWh \+ cost counter via Socket.IO |
| In-app payment setup screen | Pre-session confirmation sheet with wallet balance |
| Session history in-app | Inbox → Transactions segment |
| Station-level tech specs | Charger row: connector, kW, price, status |
| Color-coded pin legend | Shown as a collapsible legend button on map |

---

## Where Megawatt Goes Beyond Evro

| Feature | Evro | Megawatt |
| :---- | :---- | :---- |
| Payment method | Credit card / GCash | PHP peso wallet (admin top-up) |
| Voucher system | Not visible | Full voucher inbox tab \+ apply at checkout |
| Wallet display | Not prominent | Large wallet balance on profile header |
| Inbox | Basic notifications | 3-segment: Notifications / Transactions / Vouchers |
| Admin messaging | None | Admin can message individual users directly |
| OCPP control | Abstracted | Direct OCPP RemoteStart/Stop per charger |

---

## Build Order for Cline

### Phase A — Auth \+ Shell (Week 1\)

- [ ] Expo project init with Expo Router  
- [ ] NativeWind setup (tailwind.config.js \+ babel config)  
- [ ] Axios instance with JWT interceptor \+ refresh logic  
- [ ] Zustand store: auth slice, wallet slice, session slice  
- [ ] Auth screens: Login, Register, Forgot Password  
- [ ] Root layout auth guard (redirect unauthenticated users to login)  
- [ ] Bottom tab navigator with 4 tabs (placeholder screens)  
- [ ] Push token registration on login → POST to backend

### Phase B — Map \+ Stations (Week 2\)

- [ ] Google Maps base layer (react-native-maps)  
- [ ] Fetch stations via `/api/stations?lat&lng&radius=10000`  
- [ ] Render StationPin components (color-coded by status)  
- [ ] Pin clustering (react-native-maps callout or Supercluster)  
- [ ] Filter chip bar (connector type, availability, power)  
- [ ] Pin tap → BottomSheet preview card  
- [ ] "View Station" → Station Detail screen  
- [ ] Station Detail: photo carousel, charger list rows, status badges  
- [ ] "Get Directions" → deep link to Google Maps

### Phase C — Charging Flow (Week 2–3)

- [ ] "Charge here" → pre-session bottom sheet  
- [ ] Wallet balance check (≥ ₱50 reserve)  
- [ ] Voucher code input \+ validate API call  
- [ ] POST /api/sessions/start → navigate to Live Session screen  
- [ ] Socket.IO join:session on session start  
- [ ] Live session screen: kWh meter, cost counter, timer, power draw  
- [ ] Stop button → confirm dialog → POST /api/sessions/:id/stop  
- [ ] Session summary modal (kWh, cost, voucher, remaining balance)  
- [ ] Socket.IO session:ended listener (handles charger-side stops)

### Phase D — Search Tab (Week 3\)

- [ ] Search input with debounced query  
- [ ] Filter chips (connector, availability, power, sort)  
- [ ] Station list results (react-query paginated)  
- [ ] Station list card component  
- [ ] Empty state  
- [ ] Tap → Station Detail screen (reuse same component)

### Phase E — Inbox (Week 3–4)

- [ ] Segmented control (Notifications / Transactions / Vouchers)  
- [ ] Notifications list — NotificationItem, unread indicator  
- [ ] Transactions list — TransactionItem with type icons and \+/- amounts  
- [ ] Transaction detail screen  
- [ ] Vouchers list — VoucherCard with status badge  
- [ ] Mark as read on tap

### Phase F — Profile (Week 4\)

- [ ] Profile header: name, email, wallet balance  
- [ ] "Top Up" modal (admin contact message, no gateway)  
- [ ] My Vehicles screen \+ Add/Edit/Delete vehicle  
- [ ] Transaction History (reuse Inbox transactions component)  
- [ ] Edit Profile form  
- [ ] Change Password form  
- [ ] Help Center FAQ accordion  
- [ ] Terms of Service \+ Privacy Policy (in-app webview)  
- [ ] Logout with confirm

### Phase G — Polish (Week 5\)

- [ ] Active session banner on Map tab (if session in progress)  
- [ ] Socket.IO charger:status → live pin color updates on map  
- [ ] Push notification deep link handling (tap notif → correct screen)  
- [ ] Loading skeletons on all list screens  
- [ ] Empty states on all screens  
- [ ] Error boundary \+ retry UI  
- [ ] Offline state handling (no network banner)  
- [ ] App icon \+ splash screen (Megawatt brand)  
- [ ] Over-the-air update setup (Expo EAS Update)

---

## Environment Variables

```
EXPO_PUBLIC_API_URL=https://api.megawatt.ph/api
EXPO_PUBLIC_SOCKET_URL=https://api.megawatt.ph
EXPO_PUBLIC_GOOGLE_MAPS_KEY=your_google_maps_api_key
```

---

## First Commands for Cline

```shell
# 1. Create Expo project
npx create-expo-app@latest mobile --template blank-typescript
cd mobile

# 2. Install core dependencies
npx expo install expo-router react-native-safe-area-context react-native-screens
npx expo install expo-location expo-notifications
npm install nativewind zustand @tanstack/react-query axios socket.io-client
npm install react-native-maps
npm install @gorhom/bottom-sheet react-native-reanimated react-native-gesture-handler

# 3. NativeWind setup
npm install --save-dev tailwindcss
npx tailwindcss init

# 4. Run on simulator
npx expo start
```

---

## Design Tokens (Megawatt Brand)

```ts
// constants/colors.ts
export const Colors = {
  primary: '#1BB66E',       // Megawatt teal-green (main brand)
  primaryDark: '#0F8A50',   // Darker shade for pressed states
  primaryLight: '#E6F9F1',  // Light background tint

  chargerAvailable: '#1BB66E',   // Green pin
  chargerOccupied: '#F59E0B',    // Orange pin
  chargerFaulted: '#EF4444',     // Red pin
  chargerOffline: '#9CA3AF',     // Gray pin

  wallet: '#7C3AED',        // Purple for wallet/money elements
  danger: '#EF4444',        // Red for stop, deductions
  success: '#10B981',       // Green for top-ups, confirmations

  text: '#111827',
  textMuted: '#6B7280',
  border: '#E5E7EB',
  background: '#FFFFFF',
  surface: '#F9FAFB',
}
```

---

## Notes for Cline

1. **No payment gateway.** "Top Up" button leads to a modal saying wallet is topped up by admin only. Do not integrate PayMongo or GCash at this stage.  
     
2. **Wallet reserve check.** Before allowing session start, call `GET /api/wallet/me` and check `balancePeso >= 50`. Show an error state if insufficient.  
     
3. **Voucher flow.** Voucher is entered on the pre-session sheet, validated via API, and the discounted cost preview is shown. The actual deduction happens server-side when the session ends.  
     
4. **Socket.IO reconnection.** Implement exponential backoff reconnect on the socket client. If the session screen loses connection, show a "Reconnecting..." banner and resume from last known state on reconnect.  
     
5. **Active session persistence.** Store the active `sessionId` in Zustand \+ AsyncStorage. If the user kills the app mid-session, on relaunch check for an active session and redirect to the live session screen.  
     
6. **Map performance.** Limit visible pins to stations within the current map viewport \+ a small buffer. Use Supercluster for clustering. Do not render all stations at once.  
     
7. **Google Maps API key.** Must be restricted to the app's bundle ID in Google Cloud Console. Use separate keys for iOS and Android.  
     
8. **Philippine phone number format.** Validate mobile number as `09XXXXXXXXX` (11 digits, starts with 09\) on the register form.

---

*Plan version: 1.0 | Megawatt User App* *Modeled on: Evro PH (evro.ph) — leading EV charging platform in the Philippines* *Phase A–G target: 5 weeks | Phase 2 (payment gateway): separate plan*  
