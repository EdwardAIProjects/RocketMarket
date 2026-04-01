import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { updateAdminUser } from "@/lib/data/service";

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
    const user = await updateAdminUser(id, body, actor.id);
    return NextResponse.json({ user });
  } catch (error) {
    const message =
      error instanceof ZodError
        ? error.issues[0]?.message ?? "User update failed."
        : error instanceof Error
          ? error.message
          : "User update failed.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
