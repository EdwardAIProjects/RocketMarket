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

function combineDateAndTime(dateValue: FormDataEntryValue | null, timeValue: FormDataEntryValue | null) {
  if (typeof dateValue !== "string" || dateValue.length === 0) {
    return "";
  }

  if (typeof timeValue !== "string" || timeValue.length === 0) {
    return "";
  }

  return new Date(`${dateValue}T${timeValue}`).toISOString();
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
  const contentType = request.headers.get("content-type") ?? "";
  const isJsonRequest = contentType.includes("application/json");

  try {
    const actor = await getCurrentUser();

    if (!actor) {
      if (isJsonRequest) {
        return NextResponse.json({ error: "Sign in required." }, { status: 401 });
      }

      return new NextResponse(null, {
        status: 303,
        headers: {
          Location: "/login?callbackUrl=%2Fmarkets%2Fcreate",
        },
      });
    }

    const input =
      isJsonRequest
        ? await request.json()
        : await request.formData().then((formData) => ({
            question: String(formData.get("question") ?? ""),
            description: String(formData.get("description") ?? ""),
            category: String(formData.get("category") ?? ""),
            closeTime:
              normalizeDateTime(formData.get("closeTime")) ||
              combineDateAndTime(formData.get("closeDate"), formData.get("closeTimeOnly")),
            resolveByTime:
              normalizeDateTime(formData.get("resolveByTime")) ||
              combineDateAndTime(
                formData.get("resolveByDate"),
                formData.get("resolveByTimeOnly"),
              ),
            resolutionCriteria: String(formData.get("resolutionCriteria") ?? ""),
            resolutionSource: String(formData.get("resolutionSource") ?? ""),
          }));

    const market = await createMarket(input, actor.id);

    if (isJsonRequest) {
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

    if (isJsonRequest) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return new NextResponse(null, {
      status: 303,
      headers: {
        Location: `/markets/create?error=${encodeURIComponent(message)}`,
      },
    });
  }
}
