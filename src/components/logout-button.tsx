"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";

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

export function LogoutButton() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <button
      type="button"
      disabled={isSubmitting}
      className="rounded-full bg-[color:var(--accent)] px-4 py-2 text-sm font-semibold text-slate-950 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-65"
      onClick={async () => {
        setIsSubmitting(true);

        const result = await signOut({
          callbackUrl: "/login",
          redirect: false,
        });

        router.push(toRelativeAppPath(result.url, "/login"));
        router.refresh();
      }}
    >
      {isSubmitting ? "Logging out..." : "Log out"}
    </button>
  );
}
