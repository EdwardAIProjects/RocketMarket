import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { updateAdminMarket } from "@/lib/data/service";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await getCurrentUser();

    if (!actor) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const market = await updateAdminMarket(id, body, actor.id);
    return NextResponse.json({ market });
  } catch (error) {
    const message =
      error instanceof ZodError
        ? error.issues[0]?.message ?? "Market update failed."
        : error instanceof Error
          ? error.message
          : "Market update failed.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
