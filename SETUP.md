# Review Roulette — Setup

## Stack

- **Next.js 16** (App Router) + TypeScript + Tailwind CSS
- **Prisma 7** (ORM) + **PostgreSQL** (Neon / Supabase / any Postgres)
- **iron-session** (admin auth) · **@fingerprintjs** (device rate-limiting) · **qrcode** (QR generation)
- Deploy target: **Vercel**

---

## 1. Postgres database

Create a free database at [Neon](https://neon.tech) or [Supabase](https://supabase.com).

Copy your connection strings:
- **Pooled URL** (for runtime queries) → `DATABASE_URL`
- **Direct URL** (for migrations) → `DIRECT_URL`

> Neon: Settings → Connection string → toggle "Connection pooling" on/off
> Supabase: Project Settings → Database → "Connection pooling" vs "Direct connection"

---

## 2. Environment variables

```bash
cp .env.example .env
```

Edit `.env`:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DB?sslmode=require"
DIRECT_URL="postgresql://USER:PASSWORD@HOST-direct:5432/DB?sslmode=require"
ADMIN_SESSION_SECRET="run: openssl rand -base64 32"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

---

## 3. Database setup

```bash
# Apply schema migrations
npx prisma migrate deploy

# Seed demo data (1 restaurant, 5 prizes, admin@example.com / admin123)
npm run db:seed
```

Or create your own admin:
```bash
npm run admin:create
```

---

## 4. Local development

```bash
npm run dev
```

- Customer flow: `http://localhost:3000/r/demo-cafe`
- Admin: `http://localhost:3000/admin` → login: `admin@example.com` / `admin123`
- Cashier (after a win): `http://localhost:3000/cashier/[token]`

---

## 5. Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

Set environment variables in the Vercel dashboard:
- `DATABASE_URL` — pooled connection string
- `DIRECT_URL` — direct connection string (for migrations)
- `ADMIN_SESSION_SECRET` — 32-char random string
- `NEXT_PUBLIC_APP_URL` — `https://your-app.vercel.app`

Run migrations against production database:
```bash
DATABASE_URL="your-direct-url" npx prisma migrate deploy
```

---

## File structure

```
app/
  r/[slug]/           Customer landing → spin → result
  cashier/[token]/    Cashier redemption
  admin/              Admin dashboard (protected)
  api/                API routes
  generated/prisma/   Generated Prisma client (git-ignored, rebuilt on deploy)

lib/
  db.ts               Prisma singleton
  auth.ts             iron-session helpers
  hash.ts             SHA-256 for device/IP fingerprinting
  spin-engine.ts      Weighted prize selection (pure, testable)
  analytics.ts        Event recording helpers

components/
  Wheel.tsx           Canvas roulette wheel + animation
  LiveClock.tsx       Ticking HH:MM:SS display
  ElapsedTime.tsx     "Xm Ys since win" counter

prisma/
  schema.prisma       Database schema
  seed.ts             Demo data seed
```

---

## Adding a restaurant

1. Go to `/admin` → "Add restaurant"
2. Fill name, slug, Google review URL, timezone
3. Add prizes (label, emoji, weight, optional daily cap)
4. Mark one prize as "fallback" (shown when daily caps are reached)
5. Download the QR code from the Manage page and print it

## Rate limiting behaviour

- 1 spin per device fingerprint per 24 hours
- Max 3 spins per IP address per 24 hours
- Concurrent spins use serializable transactions to prevent race conditions on prize caps
