<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# RocketMarket Repo Notes

- Read `README.md` and `docs/ARCHITECTURE.md` before making substantial changes.
- Preserve both supported runtime modes unless the change explicitly removes one and updates docs:
  - local mode: `LOCAL_DEV_MODE=true`, local email login, local JSON-backed sandbox state, no DB, no Google OAuth
  - team mode: Postgres + Google OAuth + persistent data
- Keep business logic centralized in `src/lib/data/service.ts` instead of spreading it through routes and components.
- Treat market resolution, payouts, ledger writes, and permission checks as high-risk areas; if you change them, verify them carefully.
- If you change architecture, setup, env vars, deployment flow, auth assumptions, or runtime modes, update:
  - `README.md`
  - `docs/ARCHITECTURE.md`
  - this file if agent guidance has changed
