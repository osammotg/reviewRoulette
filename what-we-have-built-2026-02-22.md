# What We Have Built — 2026-02-22

---

## 1. Technology Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) + TypeScript |
| Styling | Tailwind CSS v4 |
| ORM | Prisma 7 |
| Database | PostgreSQL (Neon / Supabase / any Postgres) |
| Auth (admin) | iron-session (encrypted cookie, 7-day session) |
| Device fingerprinting | @fingerprintjs (rate-limiting) |
| QR generation | qrcode (client-side, canvas-based) |
| Charts | Recharts |
| Deploy target | Vercel |

---

## 2. Database Schema

| Table | Purpose |
|---|---|
| `admin_users` | Admin accounts (email + bcrypt hash) |
| `restaurants` | One row per restaurant (name, slug, Google URL, logo, timezone, daily win cap) |
| `prizes` | Prizes per restaurant (label, emoji, image, weight, daily cap, fallback flag) |
| `spins` | Every spin attempt (device hash, IP hash, prize won, claim token, claimed timestamp) |
| `prize_daily_counters` | Per-prize per-day win count (enforces daily caps) |
| `restaurant_daily_counters` | Per-restaurant per-day total wins (enforces restaurant-level cap) |
| `analytics_events` | Event log: landing_view, review_click, spin_attempt, win, claim_completed, daily_cap_hit |

---

## 3. User Flows

### A. CUSTOMER FLOW (public, triggered by scanning a QR code)

```
[QR Code scanned]
       ↓
FRAME 1 — Landing Page  /r/[slug]
       ↓
FRAME 2 — Spin Page     /r/[slug]/spin
       ↓
FRAME 3a — Win Result   /r/[slug]/result/[spinId]   (if won)
FRAME 3b — No-win Result /r/[slug]/result/[spinId]  (if lost)
```

---

#### FRAME 1 — Landing Page `/r/[slug]`

**What the user sees:**
- Restaurant logo (or 🍽️ placeholder)
- Restaurant name
- "Spin & Win" headline + subtitle
- **Primary button**: "⭐ Leave a Google review first" (opens Google Maps in new tab, then redirects to spin page after 400ms)
- **Secondary link**: "Skip and continue →" (goes straight to spin)
- Fine print: "Leaving a review is completely optional"

**What happens in the background:**
- Fetches restaurant from DB by slug (server-side render — fast, SEO-friendly)
- Fires `landing_view` analytics event once per browser session (sessionStorage dedupe)
- Fires `review_click` analytics event when primary button clicked

**Interactions:**
- Review button → opens Google review URL + navigates to spin page
- Skip → navigates to spin page

---

#### FRAME 2 — Spin Page `/r/[slug]/spin`

**What the user sees:**
- Restaurant name (small, uppercase)
- "Spin the wheel" heading
- Animated roulette wheel (canvas, segments = prizes + empty "noop" slots at 4:1 ratio)
- Big red **"Spin"** button (disabled while spinning → shows "Spinning…")
- "One spin per day. No purchase required." fine print

**Possible alternative states:**
- Loading spinner while fetching restaurant data
- Error state ("Could not load this promotion") with retry link
- **Already spun today**: full-screen ⏳ message with next eligible time

**What happens on spin:**
1. Loads FingerprintJS visitor ID (device fingerprint)
2. POST `/api/r/[slug]/spin` with fingerprint token
3. Server runs rate-limit check (1 spin/device/24h, max 3/IP/24h)
4. Server runs weighted prize selection with daily cap enforcement (serializable transaction)
5. Returns spinId + segmentIndex + outcome
6. Wheel animates to the correct segment
7. On animation complete → navigates to result page

---

#### FRAME 3a — Win Result Page `/r/[slug]/result/[spinId]`

**What the user sees:**
- **"✅ VALID – NOT REDEEMED"** green badge (turns red/⚠️ after 30 minutes)
- Prize card: emoji or image, prize name, description
- "Show this screen to the cashier"
- Time transparency panel: Won at / Current time (live ticking) / Time since win (live)
- Claim code: 6-char short code (e.g. `AB12CD`)
- QR code (links to `/cashier/[claimToken]` for cashier to scan)
- Restaurant name at bottom

**Anti-fraud features:**
- Live clock ticking in real time (hard to screenshot and reuse)
- Background turns red-tinted after 30 minutes (visual pressure to redeem quickly)
- Short code allows manual entry by cashier as alternative to QR scan

---

#### FRAME 3b — No-Win Result Page `/r/[slug]/result/[spinId]`

**What the user sees:**
- 🎰 emoji
- "Not this time!" heading
- "Come back tomorrow for another spin."
- If daily cap was hit: "No more prizes available today — check back tomorrow!"
- Review nudge: "Enjoyed your visit? A review helps us a lot." + link to landing page
- "← Back to start" link

---

### B. CASHIER FLOW (staff, triggered by scanning customer's QR or typing the short code)

```
[Cashier scans QR on customer's phone]
       ↓
FRAME 4 — Cashier Redemption Page  /cashier/[token]
```

---

#### FRAME 4 — Cashier Redemption Page `/cashier/[token]`

**What the cashier sees:**
- "[Restaurant name] — Cashier" header
- **Status badge**: green "NOT REDEEMED" or grey "REDEEMED at HH:MM:SS"
- Prize card: emoji/image, name, description
- Time panel: Won at / Current time (live) / Time since win
- Big green **"Redeem now"** button (disappears once redeemed)
- "Staff only — do not share this page with customers."

**What happens on redeem:**
- POST `/api/claim/[token]` → atomic `updateMany` where `claimedAt IS NULL`
- Idempotent: if already claimed, just returns current state
- Fires `claim_completed` analytics event
- UI transitions to grey "REDEEMED" state

**⚠️ NO authentication on this page** — anyone with the token URL can view/redeem it. This is intentional for simplicity (cashiers don't log in), but means the token must be kept secret (it's a UUID so hard to guess).

---

### C. ADMIN FLOW (you, the operator)

```
FRAME 5 — Admin Login    /admin/login
       ↓
FRAME 6 — Dashboard      /admin
       ↓
FRAME 7 — Restaurant Mgmt  /admin/restaurants/[id]
       ↓
FRAME 8 — Analytics      /admin/restaurants/[id]/analytics
```

---

#### FRAME 5 — Admin Login `/admin/login`

- Email + password form
- POST `/api/admin/auth/login` → verifies bcrypt hash → creates iron-session cookie
- Redirects to `/admin` on success

---

#### FRAME 6 — Admin Dashboard `/admin`

**What you see:**
- List of all restaurants with name, slug, status badge (Active/Inactive), prize count, spin count
- Links to "Analytics" and "Manage" per restaurant
- "+ Add restaurant" button
- Logout button

---

#### FRAME 7 — Restaurant Management `/admin/restaurants/[id]`

Three sections on one page:

**Restaurant Settings (RestaurantEditor)**
- Edit: name, slug, logo URL, Google review URL, timezone, daily win cap, active toggle
- Save / Delete restaurant

**Prizes (PrizeManager)**
- List all prizes with: emoji, label, weight, daily cap, active/inactive toggle
- Add new prize: label, emoji, weight, image URL, description, daily cap, active, fallback flag
- Edit / delete existing prizes
- Toggle active on/off per prize

**QR Code (QRGenerator)**
- Shows the QR code for this restaurant's landing page
- Shows the URL the QR resolves to
- "Download PNG" button

---

#### FRAME 8 — Analytics `/admin/restaurants/[id]/analytics`

**What you see:**
- Period switcher: Last 7 days / Last 30 days
- 6 stat cards: Page views · Review clicks · Spins · Wins (win rate %) · Claims (claim rate %) · Cap hits (avg minutes to claim)
- Line chart: Spins vs Wins vs Claims over time
- Prize breakdown table: wins and claims per prize

---

## 4. API Routes Summary

| Method | Endpoint | Purpose | Status |
|---|---|---|---|
| GET | `/api/r/[slug]` | Fetch restaurant + active prizes for wheel | ✅ Done |
| POST | `/api/r/[slug]/spin` | Execute spin (rate limit + weighted draw + DB write) | ✅ Done |
| POST | `/api/r/[slug]/event` | Record analytics event (landing_view, review_click) | ✅ Done |
| GET | `/api/spin/[spinId]` | Fetch spin result for result page | ✅ Done |
| GET | `/api/claim/[token]` | Fetch claim data for cashier page | ✅ Done |
| POST | `/api/claim/[token]` | Mark prize as redeemed (idempotent) | ✅ Done |
| POST | `/api/admin/auth/login` | Admin login | ✅ Done |
| POST | `/api/admin/auth/logout` | Admin logout | ✅ Done |
| GET | `/api/admin/restaurants` | List all restaurants | ✅ Done |
| POST | `/api/admin/restaurants` | Create restaurant | ✅ Done |
| GET/PATCH/DELETE | `/api/admin/restaurants/[id]` | Read/update/delete restaurant | ✅ Done |
| GET | `/api/admin/restaurants/[id]/analytics` | Analytics data | ✅ Done |
| POST | `/api/admin/restaurants/[id]/prizes` | Add prize | ✅ Done |
| PATCH/DELETE | `/api/admin/prizes/[id]` | Update/delete prize | ✅ Done |

---

## 5. What's Still "Dev Mode" — Blockers for Tomorrow

These are the things that don't work in the real world yet:

---

### 🔴 BLOCKER 1 — App is not deployed (QR codes point to localhost)

**Problem:** The QR code generated in the admin panel uses `NEXT_PUBLIC_APP_URL`. If this env var isn't set (or is set to `http://localhost:3000`), every QR code points to your laptop. When a customer scans it at the restaurant, nothing loads.

**Fix needed:** Deploy to Vercel and set `NEXT_PUBLIC_APP_URL=https://your-app.vercel.app`.

**Steps:**
```bash
npm i -g vercel
vercel
# Set env vars in Vercel dashboard, then re-download QR
```

---

### 🔴 BLOCKER 2 — Middleware not wired up (admin routes unprotected)

**Problem:** The admin protection middleware lives in `proxy.ts` but Next.js requires it to be named `middleware.ts` at the project root. The file is currently ignored by Next.js — the admin is technically unprotected at the edge (though server-side session checks still work on each page).

**Fix needed:** Rename `proxy.ts` → `middleware.ts`.

---

### 🔴 BLOCKER 3 — No production database

**Problem:** The app needs a live PostgreSQL database. You likely have one running locally but not hosted.

**Fix needed:** Create a free Neon or Supabase database, set `DATABASE_URL` and `DIRECT_URL` in Vercel, and run migrations:
```bash
DATABASE_URL="your-direct-url" npx prisma migrate deploy
```

---

### 🟡 MISSING — No restaurant logo / prize images (cosmetic, not blocking)

**Problem:** Logo and prize images are entered as URLs. You'd need to host images somewhere (Cloudinary, Imgur, etc.) and paste the URL. There's no file upload built in.

**Workaround for tomorrow:** Leave logo blank (shows 🍽️) and use emoji for prizes instead of images. Works fine.

---

### 🟡 MISSING — Cashier page has no authentication

**Problem:** `/cashier/[token]` has zero auth. Any staff member can redeem any token if they have the URL. The protection is security-by-obscurity (UUID token is hard to guess).

**For a prototype demo:** Acceptable. For production: add a PIN or restaurant-scoped session.

---

### 🟡 MISSING — No "forgot password" or admin self-service

**Problem:** Admin accounts are created via CLI (`npm run admin:create`). The restaurant owner can't reset their own password.

**For a prototype demo:** You create the account for them. Fine for now.

---

### 🟡 MINOR — "Leave a Google review" link on no-win page goes to landing, not Google

**Problem:** On the no-win result page, "Leave a Google review ↗" links to `/r/[slug]` (landing page), not directly to the Google Maps review URL.

**Impact:** Minor — the landing page then offers the Google review button. One extra tap.

---

### 🟢 WORKS (confirmed from code)

- ✅ Weighted prize draw with daily caps — fully implemented with serializable transactions
- ✅ Rate limiting: 1 spin/device/24h + 3 spins/IP/24h
- ✅ Live clock + elapsed time on win/cashier pages (anti-fraud)
- ✅ Analytics event logging (landing_view, review_click, spin_attempt, win, claim_completed, cap_hit)
- ✅ Analytics dashboard with chart + prize breakdown
- ✅ QR code download (PNG)
- ✅ Admin CRUD for restaurants and prizes
- ✅ Admin session (7-day cookie, iron-session encrypted)
- ✅ Fallback prize when all main prizes hit daily caps
- ✅ Restaurant-level daily win cap
- ✅ Timezone-aware daily cap resets

---

## 6. Minimum To-Do List Before Tomorrow's Restaurant Demo

| Priority | Task | Time estimate |
|---|---|---|
| 🔴 | Deploy to Vercel | ~20 min |
| 🔴 | Create Neon/Supabase database + run migrations | ~15 min |
| 🔴 | Set all 4 env vars in Vercel (`DATABASE_URL`, `DIRECT_URL`, `ADMIN_SESSION_SECRET`, `NEXT_PUBLIC_APP_URL`) | ~5 min |
| 🔴 | Rename `proxy.ts` → `middleware.ts` | ~1 min |
| 🔴 | Create admin account for the restaurant owner (`npm run admin:create`) | ~2 min |
| 🔴 | Create the restaurant in admin, add prizes, download QR | ~10 min |
| 🟡 | Print or display the QR code in the restaurant | ~5 min |

**Total: ~1 hour of setup**

---

## 7. What to Tell the Restaurant Owner

> "Scan this QR with your phone — you'll see the exact screen your customers see.
> When you want to check your stats or update prizes, go to [your-app.vercel.app]/admin.
> Log in with [email] / [password].
> At the end of the week, tell me: How many people scanned it? Did staff find the cashier screen easy to use? What prizes drove the most redemptions? I'll have the analytics waiting for you."

---

*Generated 2026-02-22*
