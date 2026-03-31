# RocketMarket Architecture

## High-level goal

RocketMarket is an internal, play-money prediction market for UBCRocket. The intended user experience is:

- teammates browse binary YES/NO markets about real team events
- teammates trade fake money on those outcomes
- admins or designated resolvers close and resolve markets using prewritten criteria
- the app tracks positions, balances, payouts, and a lightweight leaderboard

This is not intended to be a real-money exchange, a decentralized protocol, or a fully realistic market microstructure simulator. The main priorities are:

- clarity
- fun
- low operational complexity
- easy local development
- safe enough behavior for internal team use

## Product model

### Market design

- Binary YES/NO markets only
- Play-money balances only
- Probability-style pricing via a Maniswap-style CPMM helper
- Admin/resolver-backed settlement instead of crowd governance

### Resolution model

- Market creation requires explicit criteria and a source
- Markets move through `open -> closed -> resolved` or `canceled`
- Resolution writes audit logs and settlement ledger entries
- A canceled market refunds cost basis rather than inventing a winner

## Architectural overview

### Frontend

- Next.js App Router application
- Server-rendered pages for main market browsing and admin views
- Client components only where interaction is needed
  - trade widget
  - resolution widget
  - chart rendering

Primary UI entrypoints:

- `src/app/page.tsx`
- `src/app/markets/[slug]/page.tsx`
- `src/app/portfolio/page.tsx`
- `src/app/leaderboard/page.tsx`
- `src/app/admin/markets/*`

### Backend

- API routes under `src/app/api/*`
- Business logic concentrated in `src/lib/data/service.ts`
- Auth wiring in `src/auth.ts` and `src/lib/auth/session.ts`
- Database access via Drizzle in `src/lib/db/*`

The service layer is the main place where future work should land for:

- market reads
- portfolio calculations
- trade execution
- market close/resolve flows
- permission-sensitive business rules

Avoid pushing business logic down into route files or UI components unless there is a strong reason.

### Persistence

- PostgreSQL is the real persistence layer for team mode
- Drizzle schema lives in `src/lib/db/schema.ts`
- Generated migrations live in `drizzle/*`

Core persisted entities:

- `users`
- `markets`
- `trades`
- `positions`
- `ledger_entries`
- `resolution_audit_logs`
- `market_chart_points`

### Market engine

`src/lib/markets/engine.ts` contains the pricing and settlement helper logic. It is intentionally isolated so the app can evolve the pricing mechanism later without rewriting the surrounding product.

The current implementation uses a Maniswap-style weighted CPMM with reserve state stored on each market. Trades are quoted from those reserves and settlement still pays winning shares at 1 fake dollar per share.

If a future change materially alters pricing or payout semantics, update:

- `src/lib/markets/engine.ts`
- UI copy that explains trading
- tests covering pricing and settlement
- this document

## Runtime modes

### Local mode

Purpose:

- full local flow testing
- no Postgres
- no Google OAuth
- safe local sandboxing

Behavior:

- enabled with `LOCAL_DEV_MODE=true`
- uses a seeded local JSON-backed state store instead of Postgres
- requires sign-in through a local email-only login page
- accepts any email address
- first local account becomes admin automatically unless admin emails are configured
- supports persistent local create/trade/resolve flows across reloads
- supports persistent bankruptcy resets and leaderboard bankruptcy counts
- can be reset with `npm run local:reset`

This mode is intentional and should remain working. It is the preferred way to test the end-to-end UX without production dependencies.

### Team mode

Purpose:

- actual internal deployment for the team

Behavior:

- requires Postgres
- uses Auth.js + Google OAuth
- persists trades, balances, positions, and resolution data
- persists bankruptcy counts alongside user balances so leaderboard labels survive resets
- admin users are bootstrapped from `ADMIN_EMAILS`

## Deployment model

Current expected deployment shape:

- one web container
- one Postgres container
- `docker-compose` for simple self-hosted deployment

The container startup path currently expects:

- env vars present
- DB reachable
- schema applied via `npm run db:push`

If deployment strategy changes, update both this file and `README.md`.

## Testing and verification

Current verification layers:

- `npm run lint`
- `npm run test`
- `npx tsc --noEmit`
- `npm run build`

Current automated tests are light and mostly cover market math. If you change settlement logic, position accounting, or permission-sensitive mutations, expand tests accordingly.

## Known design choices and limits

- The current market engine is now a reserve-backed Maniswap-style CPMM, but it is still product-oriented rather than a full exchange implementation
- Local mode is persistent, but it is still a single-machine JSON sandbox rather than a multi-user or highly concurrent datastore
- Resolver governance is centralized to admins/resolvers, which is acceptable for an internal team app
- Team-mode persistence is real, but the app still has room for stronger coverage and finer-grained audit/admin tooling

## Guidance for future contributors and agents

- Read `README.md`, this file, and `AGENTS.md` before making major changes
- Keep business logic in `src/lib/data/service.ts` unless there is a clear reason not to
- Prefer preserving local mode while adding production features
- Do not silently break the admin resolution flow; it is a core product behavior
- When you change architecture, data flow, auth assumptions, or deployment/setup, update the relevant docs in the same PR/change

Minimum documentation maintenance expectation:

- update `README.md` when setup or run modes change
- update this file when architecture, responsibilities, or system behavior changes
- update `AGENTS.md` when future agents need new repo-specific implementation guidance
