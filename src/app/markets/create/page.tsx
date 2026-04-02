import { requireCurrentUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

function formatDateTimeLocalValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function nextDefaultAtHour(daysFromNow: number, hour: number) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  date.setHours(hour, 0, 0, 0);
  return formatDateTimeLocalValue(date);
}

export default async function CreateMarketPage() {
  await requireCurrentUser("/markets/create");
  const defaultCloseTime = nextDefaultAtHour(1, 17);
  const defaultResolveByTime = nextDefaultAtHour(2, 17);

  return (
    <div className="space-y-6">
      <section className="panel rounded-[36px] px-6 py-7 sm:px-8">
        <div className="eyebrow">Create Market</div>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">
          Write the rules before anyone starts betting.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-[color:var(--muted)]">
          RocketMarket markets need a clean question, close time, optional resolution source,
          and criteria. This page posts to the market creation API and is ready to
          be connected to persistent storage.
        </p>
      </section>

      <form
        action="/api/markets"
        method="post"
        className="panel rounded-[28px] p-5"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-medium">
            Question
            <input
              name="question"
              required
              className="mt-2 w-full rounded-2xl border border-[color:var(--line)] bg-white/4 px-4 py-3 outline-none transition focus:border-[color:var(--accent)]"
              placeholder="Will the rocket leave the rail?"
            />
          </label>
          <label className="text-sm font-medium">
            Category
            <input
              name="category"
              required
              className="mt-2 w-full rounded-2xl border border-[color:var(--line)] bg-white/4 px-4 py-3 outline-none transition focus:border-[color:var(--accent)]"
              placeholder="Launch"
            />
          </label>
          <label className="text-sm font-medium md:col-span-2">
            Description <span className="text-[color:var(--muted)]">(optional)</span>
            <textarea
              name="description"
              className="mt-2 min-h-32 w-full rounded-2xl border border-[color:var(--line)] bg-white/4 px-4 py-3 outline-none transition focus:border-[color:var(--accent)]"
              placeholder="Extra context for traders, if needed."
            />
          </label>
          <label className="text-sm font-medium">
            Close time
            <input
              type="datetime-local"
              name="closeTime"
              required
              defaultValue={defaultCloseTime}
              className="mt-2 w-full rounded-2xl border border-[color:var(--line)] bg-white/4 px-4 py-3 outline-none transition focus:border-[color:var(--accent)]"
            />
          </label>
          <label className="text-sm font-medium">
            Resolve by
            <input
              type="datetime-local"
              name="resolveByTime"
              required
              defaultValue={defaultResolveByTime}
              className="mt-2 w-full rounded-2xl border border-[color:var(--line)] bg-white/4 px-4 py-3 outline-none transition focus:border-[color:var(--accent)]"
            />
          </label>
          <label className="text-sm font-medium md:col-span-2">
            Resolution criteria
            <textarea
              name="resolutionCriteria"
              required
              className="mt-2 min-h-28 w-full rounded-2xl border border-[color:var(--line)] bg-white/4 px-4 py-3 outline-none transition focus:border-[color:var(--accent)]"
            />
          </label>
          <label className="text-sm font-medium md:col-span-2">
            Resolution source <span className="text-[color:var(--muted)]">(optional)</span>
            <textarea
              name="resolutionSource"
              className="mt-2 min-h-24 w-full rounded-2xl border border-[color:var(--line)] bg-white/4 px-4 py-3 outline-none transition focus:border-[color:var(--accent)]"
            />
          </label>
        </div>

        <button
          type="submit"
          className="mt-5 rounded-full bg-[color:var(--accent)] px-5 py-3 text-sm font-semibold text-slate-950"
        >
          Submit market draft
        </button>
      </form>
    </div>
  );
}
