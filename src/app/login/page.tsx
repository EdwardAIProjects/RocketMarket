import { redirect } from "next/navigation";
import { LocalLoginForm } from "@/components/local-login-form";
import { TeamLoginForm } from "@/components/team-login-form";
import { getCurrentSession } from "@/lib/auth/session";
import { isDemoMode, isLocalMode } from "@/lib/env";

export default async function LoginPage() {
  if (isDemoMode()) {
    redirect("/");
  }

  const session = await getCurrentSession();
  if (session?.user?.email) {
    redirect("/");
  }

  return (
    <div className="mx-auto w-full max-w-xl py-8">
      {isLocalMode() ? <LocalLoginForm /> : <TeamLoginForm />}
    </div>
  );
}
