import { env, isLocalMode } from "@/lib/env";

export function LocalModeBanner() {
  if (!isLocalMode()) {
    return null;
  }

  return (
    <div className="border-b border-[color:var(--line)] bg-[rgba(101,167,255,0.14)] px-4 py-2 text-center text-xs font-medium text-[color:var(--accent-strong)]">
      Local test mode. Email login accepts any address. Data is stored only in{" "}
      <span className="mono">{env.localStatePath}</span>.
    </div>
  );
}
