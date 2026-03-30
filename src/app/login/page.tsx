import { redirect } from "next/navigation";
import { LocalLoginForm } from "@/components/local-login-form";
import { getCurrentSession } from "@/lib/auth/session";
import { isLocalMode } from "@/lib/env";

export default async function LoginPage() {
  if (!isLocalMode()) {
    redirect("/api/auth/signin");
  }

  const session = await getCurrentSession();
  if (session?.user?.email) {
    redirect("/");
  }

  return (
    <div className="mx-auto w-full max-w-xl py-8">
      <LocalLoginForm />
    </div>
  );
}
