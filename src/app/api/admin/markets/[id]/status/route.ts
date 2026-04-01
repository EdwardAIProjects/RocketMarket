import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { setAdminMarketStatus } from "@/lib/data/service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await getCurrentUser();

    if (!actor) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }

    const { id } = await params;
    const body = (await request.json()) as { status: "open" | "closed" };
    const market = await setAdminMarketStatus(id, body, actor.id);
    return NextResponse.json({ market });
  } catch (error) {
    const message =
      error instanceof ZodError
        ? error.issues[0]?.message ?? "Market status update failed."
        : error instanceof Error
          ? error.message
          : "Market status update failed.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
