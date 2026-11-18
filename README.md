# H-Pesa

Full-stack prototype mobile money web app.

**This is a demo only** — no real money is moved.

## Project Structure
```
h-pesa-fixed/
├── backend/          ← Node.js + Express API
│   ├── src/
│   ├── prisma/
│   └── package.json
├── frontend/         ← React + Vite app
│   ├── src/
│   └── package.json
└── README.md
```

## Demo Login
- Phone: `0712345678`
- Password: `password123`
- PIN: `1234`

## How to Run

### 1. Backend
Open a terminal and run:
```bash
cd backend
npm install
npx prisma generate
npx prisma db push
npm run db:seed
npm run dev
```

### 2. Frontend
Open a **second** terminal and run:
```bash
cd frontend
npm install
npm run dev
```

### 3. Open the app
Go to: http://localhost:5173

## Features
- Login / Register
- Wallet Balance
- Send Money
- QR Payments (Generate + Scan demo)
- Buy Goods (Till)
- Pay Bill
- Buy Airtime
- Withdraw Cash
- Transaction History

---
## New in this version
Chama (rotating savings), payment links, auto-pay, rewards points, Kiswahili, merchant API for H-Fleet / H-Homes / H-Mart, one-account (SSO) verify, new look + splash.

### Deploy
**Backend (Render, Web Service, root `backend`)** — Build: `npm install` — Start: `npm run start:prod`
Environment: `JWT_SECRET` (long random text), `CORS_ORIGINS` (your Vercel address, comma separated), `CRON_SECRET` (optional, for scheduled payments while Render sleeps), `HFLEET_API_KEY`, `HHOMES_API_KEY`, `HMART_API_KEY` (choose long random keys; otherwise they are generated and printed once in the logs).
Note: with SQLite on Render's free tier the data resets on every deploy. Database choice is still on hold.

**Frontend (Vercel, root `frontend`)** — Environment: `VITE_API_URL` = your Render backend address.

### Test
`cd backend && npm install && npm test` (offline, in-memory) — `npm run smoke` checks a running server (set `BASE_URL`, `HFLEET_API_KEY`, ...).
