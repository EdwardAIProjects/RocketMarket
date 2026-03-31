import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { declareBankruptcy } from "@/lib/data/service";

export async function POST() {
  try {
    const actor = await getCurrentUser();

    if (!actor) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }

    const portfolio = await declareBankruptcy(actor.id);
    return NextResponse.json({ portfolio });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Bankruptcy reset failed.",
      },
      { status: 400 },
    );
  }
}
