# RocketMarket

RocketMarket is a play-money prediction market for UBCRocket. It uses a binary Maniswap-style CPMM for instant YES/NO trades, plus an admin-backed resolution flow for closing markets and paying out fake money.

## Project goal

This project exists to ship an internal, lightweight, prediction-market-style web app for UBCRocket. The product should feel fun and legible, not financially serious: teammates create binary markets about launch outcomes, budgets, testing milestones, and other team events, then trade with fake money and settle those markets through an explicit resolver/admin flow.

The target bar is "team-usable" rather than "exchange-complete":

- easy to run locally
- easy to deploy on simple Docker infrastructure
- clear rules and auditability around market resolution
- simple enough that future contributors can safely extend it

## Architecture docs

High-level project notes, architectural overview, contributor guidance, and future-agent handoff notes live in [docs/ARCHITECTURE.md](/home/hydra/Code/UBCRocket/RocketMarket/docs/ARCHITECTURE.md).

If you change the product shape, data model, auth model, or deployment flow, update that document and this README in the same change.

## Stack

- Next.js 16 App Router
- TypeScript
- Tailwind CSS
- Auth.js with Google OAuth
- Drizzle ORM + PostgreSQL
- Docker + docker-compose

## Current architecture summary

- `src/app/*`: App Router pages and API routes
- `src/components/*`: UI building blocks for markets, trading, charts, and admin actions
- `src/lib/data/service.ts`: main application service layer; uses Postgres/Drizzle in team mode and demo fixtures in local mode
- `src/lib/db/*`: database client and schema
- `src/lib/auth/*` and `src/auth.ts`: auth/session handling and local-mode auth bypass
- `src/lib/markets/engine.ts`: market pricing/settlement helpers
- `scripts/seed.mjs`: starter data seed script
- `drizzle/*`: generated SQL migrations and metadata

## Quick start

1. Copy `.env.example` to `.env`
2. Fill in Google OAuth credentials and `AUTH_SECRET`
3. Set `ADMIN_EMAILS` to the comma-separated emails that should have admin rights
4. Start the database and app:

```bash
docker compose up --build
```

5. For local development without Docker:

```bash
npm install
npm run dev
```

If `DATABASE_URL` is not set, the app boots into demo mode with fixture data so the UI can still be explored.

## Local development mode

For quick local testing with no Postgres and no Google OAuth, set:

```bash
LOCAL_DEV_MODE=true
```

In local mode:

- you sign in through a local email-only login screen
- any email address is accepted
- the first local account becomes an admin automatically
- the app starts from seeded fake data
- create/trade/close/resolve flows persist to a local sandbox state file instead of Postgres
- bankruptcy resets persist locally and still mark leaderboard names with a running bankruptcy count
- the sandbox state lives at `LOCAL_STATE_PATH` or `/tmp/rocketmarket-local.json` by default
- Google OAuth is not required

Useful local test commands:

```bash
npm run dev
npm run local:reset
```

`npm run local:reset` clears the local sandbox state so the next run reseeds fresh fake data.

This local path is intentional and should remain maintained. It should let contributors test multi-account flows and the full market lifecycle without touching production infrastructure.

## Useful commands

```bash
npm run dev
npm run build
npm run lint
npm run test
npm run db:generate
npm run db:push
npm run db:seed
npm run local:reset
```

## What is implemented

- Landing page with featured markets
- Market detail page with chart and trade preview
- Portfolio and leaderboard views
- Admin market queue and resolution UI
- Portfolio bankruptcy reset flow with persistent bankruptcy counts on the leaderboard
- Typed market engine with unit tests
- Postgres schema covering auth, markets, trades, positions, and ledger entries
- API routes for listing markets, creating a market, quoting trades, closing, resolving, portfolio, and leaderboard
- Real Postgres-backed service layer for trades, balances, positions, and resolution

## Documentation maintenance

Future contributors and agents should update these docs when the system changes:

- `README.md` for setup, run modes, and product summary
- `docs/ARCHITECTURE.md` for architecture, responsibilities, and contributor handoff notes
- `AGENTS.md` for repo-specific implementation guidance when workflow assumptions change
