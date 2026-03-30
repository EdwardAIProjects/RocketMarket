import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { closeMarket } from "@/lib/data/service";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await getCurrentUser();
    if (!actor) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }

    const { id } = await params;
    const market = await closeMarket(id, actor.id);
    return NextResponse.json({ market });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Close failed.",
      },
      { status: 400 },
    );
  }
}
