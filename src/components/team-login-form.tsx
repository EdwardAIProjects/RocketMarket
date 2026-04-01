"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

export function TeamLoginForm() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [phase, setPhase] = useState<"email" | "code">("email");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <form
      className="panel rounded-[24px] p-6"
      onSubmit={async (event) => {
        event.preventDefault();
        setError(null);
        setMessage(null);
        setIsSubmitting(true);

        if (phase === "email") {
          const response = await fetch("/api/auth/slack/request-code", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
          });

          const payload = (await response.json()) as {
            error?: string;
            mode?: "slack" | "admin";
          };

          if (!response.ok) {
            setError(payload.error ?? "Could not send a Slack verification code.");
            setIsSubmitting(false);
            return;
          }

          setPhase("code");
          setMessage("Enter your 6-digit verification code to continue.");
          setIsSubmitting(false);
          return;
        }

        const result = await signIn("slack-email-code", {
          email,
          code,
          callbackUrl: "/",
          redirect: false,
        });

        if (!result || result.error) {
          setError(result?.error ?? "Sign-in failed.");
          setIsSubmitting(false);
          return;
        }

        window.location.href = result.url ?? "/";
      }}
    >
      <div className="eyebrow">Login</div>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">Sign in with your team email</h1>
      <p className="mt-3 text-sm leading-6 text-[color:var(--muted)]">
        Enter your UBCRocket email, then verify your sign-in with a 6-digit code.
      </p>

      <label className="mt-6 block text-sm font-medium">
        Email
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          disabled={phase === "code"}
          className="mt-2 w-full rounded-2xl border border-[color:var(--line)] bg-white/4 px-4 py-3 outline-none transition focus:border-[color:var(--accent)] disabled:cursor-not-allowed disabled:opacity-70"
          placeholder="you@ubcrocket.com"
        />
      </label>

      {phase === "code" ? (
        <label className="mt-4 block text-sm font-medium">
          Verification code
          <input
            type="text"
            inputMode="numeric"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            required
            className="mt-2 w-full rounded-2xl border border-[color:var(--line)] bg-white/4 px-4 py-3 outline-none transition focus:border-[color:var(--accent)]"
            placeholder="123456"
          />
        </label>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-full bg-[color:var(--accent)] px-5 py-3 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-65"
        >
          {isSubmitting
            ? phase === "email"
              ? "Sending code..."
              : "Signing in..."
            : phase === "email"
              ? "Continue"
              : "Verify and sign in"}
        </button>
        {phase === "code" ? (
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => {
              setPhase("email");
              setCode("");
              setMessage(null);
              setError(null);
            }}
            className="rounded-full border border-[color:var(--line)] px-5 py-3 text-sm font-semibold text-[color:var(--muted)] transition hover:text-foreground disabled:cursor-not-allowed disabled:opacity-65"
          >
            Change email
          </button>
        ) : null}
      </div>

      {message ? <p className="mt-3 text-sm font-medium text-[color:var(--accent)]">{message}</p> : null}
      {error ? <p className="mt-3 text-sm font-medium text-rose-300">{error}</p> : null}
    </form>
  );
}
