"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

function toRelativeAppPath(url: string | null | undefined, fallbackPath: string) {
  if (!url) {
    return fallbackPath;
  }

  if (url.startsWith("/")) {
    return url;
  }

  try {
    const parsed = new URL(url);
    return `${parsed.pathname}${parsed.search}${parsed.hash}` || fallbackPath;
  } catch {
    return fallbackPath;
  }
}

export function LocalLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <form
      className="panel rounded-[24px] p-6"
      onSubmit={async (event) => {
        event.preventDefault();
        setError(null);
        setIsSubmitting(true);

        const result = await signIn("local-email", {
          email,
          callbackUrl: "/",
          redirect: false,
        });

        if (!result || result.error) {
          setError("Sign-in failed.");
          setIsSubmitting(false);
          return;
        }

        router.push(toRelativeAppPath(result.url, "/"));
        router.refresh();
      }}
    >
      <div className="eyebrow">Local login</div>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">Sign in for local testing</h1>
      <p className="mt-3 text-sm leading-6 text-[color:var(--muted)]">
        Use any email address. New emails create new local test accounts with a sandbox balance.
      </p>

      <label className="mt-6 block text-sm font-medium">
        Email
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          className="mt-2 w-full rounded-2xl border border-[color:var(--line)] bg-white/4 px-4 py-3 outline-none transition focus:border-[color:var(--accent)]"
          placeholder="you@example.com"
        />
      </label>

      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-5 rounded-full bg-[color:var(--accent)] px-5 py-3 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-65"
      >
        {isSubmitting ? "Signing in..." : "Continue"}
      </button>
      {error ? <p className="mt-3 text-sm font-medium text-rose-300">{error}</p> : null}
    </form>
  );
}
