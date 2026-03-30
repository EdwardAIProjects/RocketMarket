import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getPortfolio } from "@/lib/data/service";

export async function GET() {
  const actor = await getCurrentUser();

  if (!actor) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const portfolio = await getPortfolio(actor.id);
  return NextResponse.json({ portfolio });
}
