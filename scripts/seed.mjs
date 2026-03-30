import { randomUUID } from "node:crypto";
import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL must be set to run the seed script.");
}

const sql = postgres(databaseUrl, { max: 1 });
const adminEmail =
  process.env.SEED_ADMIN_EMAIL ||
  process.env.ADMIN_EMAILS?.split(",").map((email) => email.trim()).find(Boolean) ||
  "admin@ubcrocket.com";

const userId = randomUUID();

await sql.begin(async (tx) => {
  await tx`
    insert into users (id, name, email, role, starting_balance, cash_balance)
    values (${userId}, 'RocketMarket Admin', ${adminEmail}, 'admin', 10000, 10000)
    on conflict (email) do update set role = excluded.role
  `;

  const [admin] = await tx`select id from users where email = ${adminEmail} limit 1`;

  const existing = await tx`select count(*)::int as count from markets`;
  if (existing[0]?.count > 0) {
    return;
  }

  const marketRows = [
    {
      id: randomUUID(),
      slug: "will-the-rocket-leave-the-launch-rail",
      question:
        "Will the full-scale rocket leave the launch rail on the next official attempt?",
      description:
        "Resolves YES if telemetry, launch director log, and launch video all confirm that the vehicle clears the launch rail during the next official team launch attempt.",
      category: "Launch",
      closeTime: "2026-04-15T19:00:00.000Z",
      resolveByTime: "2026-04-17T19:00:00.000Z",
      criteria:
        "YES if the rocket physically clears the launch rail during an official launch attempt by the posted deadline. Scrubs with no attempt count as NO.",
      source: "Launch director log, official flight video, and avionics telemetry export.",
      probability: 0.62,
      volume: 2420,
      tradersCount: 18,
    },
    {
      id: randomUUID(),
      slug: "will-avionics-burn-through-its-budget",
      question: "Will Avionics exceed its FY2026 budget before the end of April?",
      description:
        "Tracks whether Avionics actual spend passes the approved team budget line before the stated deadline.",
      category: "Finance",
      closeTime: "2026-04-30T07:00:00.000Z",
      resolveByTime: "2026-05-01T07:00:00.000Z",
      criteria:
        "YES if the approved finance sheet shows Avionics actual spend greater than its approved budget before April 30, 2026 at 23:59 Pacific.",
      source: "Official team budget spreadsheet signed off by the finance lead.",
      probability: 0.37,
      volume: 1610,
      tradersCount: 13,
    },
    {
      id: randomUUID(),
      slug: "will-the-engine-hot-fire-by-mid-april",
      question: "Will propulsion complete a clean hot-fire before April 15?",
      description:
        "Resolves based on whether propulsion finishes a hot-fire meeting the posted test-success criteria before the deadline.",
      category: "Propulsion",
      closeTime: "2026-04-14T19:00:00.000Z",
      resolveByTime: "2026-04-16T19:00:00.000Z",
      criteria:
        "YES if the propulsion lead signs off a clean hot-fire meeting target duration and shutdown conditions by April 15, 2026.",
      source: "Official propulsion test log and signoff note from the propulsion lead.",
      probability: 0.71,
      volume: 2980,
      tradersCount: 21,
    },
  ];

  for (const market of marketRows) {
    await tx`
      insert into markets (
        id, slug, question, description, category, status, close_time, resolve_by_time,
        resolution_criteria, resolution_source, created_by_user_id, resolver_user_id,
        current_probability, volume, traders_count, amm_state
      ) values (
        ${market.id},
        ${market.slug},
        ${market.question},
        ${market.description},
        ${market.category},
        'open',
        ${market.closeTime},
        ${market.resolveByTime},
        ${market.criteria},
        ${market.source},
        ${admin.id},
        ${admin.id},
        ${market.probability},
        ${market.volume},
        ${market.tradersCount},
        ${JSON.stringify({ liquidity: 1400, probability: market.probability })}
      )
    `;

    await tx`
      insert into market_chart_points (market_id, probability, at)
      values
        (${market.id}, ${Math.max(0.05, market.probability - 0.12)}, now() - interval '5 days'),
        (${market.id}, ${Math.max(0.05, market.probability - 0.05)}, now() - interval '3 days'),
        (${market.id}, ${market.probability}, now() - interval '1 hour')
    `;
  }
});

await sql.end();
console.log(`Seeded RocketMarket using admin email ${adminEmail}`);
