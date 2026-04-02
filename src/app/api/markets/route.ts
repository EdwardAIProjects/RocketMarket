import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { createMarket, listMarkets } from "@/lib/data/service";

function normalizeDateTime(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.length === 0) {
    return "";
  }

  return new Date(value).toISOString();
}

export async function GET() {
  const markets = await listMarkets();
  return NextResponse.json({
    markets: markets.map((market) => ({
      ...market,
      resolver: {
        ...market.resolver,
        email: undefined,
      },
      createdBy: {
        ...market.createdBy,
        email: undefined,
      },
    })),
  });
}

export async function POST(request: Request) {
  try {
    const actor = await getCurrentUser();

    if (!actor) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }

    const contentType = request.headers.get("content-type") ?? "";

    const input =
      contentType.includes("application/json")
        ? await request.json()
        : await request.formData().then((formData) => ({
            question: String(formData.get("question") ?? ""),
            description: String(formData.get("description") ?? ""),
            category: String(formData.get("category") ?? ""),
            closeTime: normalizeDateTime(formData.get("closeTime")),
            resolveByTime: normalizeDateTime(formData.get("resolveByTime")),
            resolutionCriteria: String(formData.get("resolutionCriteria") ?? ""),
            resolutionSource: String(formData.get("resolutionSource") ?? ""),
          }));

    const market = await createMarket(input, actor.id);

    if (contentType.includes("application/json")) {
      return NextResponse.json({ market }, { status: 201 });
    }

    return new NextResponse(null, {
      status: 303,
      headers: {
        Location: `/markets/${market.slug}`,
      },
    });
  } catch (error) {
    const message =
      error instanceof ZodError
        ? error.issues[0]?.message ?? "Market creation failed."
        : error instanceof Error
          ? error.message
          : "Market creation failed.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
