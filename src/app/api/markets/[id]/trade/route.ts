import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { executeTrade } from "@/lib/data/service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await getCurrentUser();
    if (!actor) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }

    const body = await request.json();
    const { id } = await params;
    const result = await executeTrade({
      marketId: id,
      side: body.side,
      amount: Number(body.amount),
      actorUserId: actor.id,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof ZodError
        ? error.issues[0]?.message ?? "Trade failed."
        : error instanceof Error
          ? error.message
          : "Trade failed.";

    return NextResponse.json(
      {
        error: message,
      },
      { status: 400 },
    );
  }
}
