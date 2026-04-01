import { NextResponse } from "next/server";
import { requestSlackVerificationCode } from "@/lib/auth/slack";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string };
    const result = await requestSlackVerificationCode(body.email ?? "");
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not send a Slack verification code.",
      },
      { status: 400 },
    );
  }
}
