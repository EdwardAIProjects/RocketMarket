import { ImageResponse } from "next/og";
import { buildMarketDescription, getMarketForRoute } from "./market-metadata";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value < 100 ? 2 : 0,
  }).format(value);
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Vancouver",
  }).format(new Date(value));
}

function summarize(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function buildChartGeometry(points: Array<{ probability: number }>, width: number, height: number) {
  const safePoints =
    points.length > 0
      ? points
      : [
          {
            probability: 0.5,
          },
        ];

  const graphPoints = safePoints.map((point, index) => {
    const x = safePoints.length === 1 ? width / 2 : (index / (safePoints.length - 1)) * width;
    const y = height - point.probability * height;
    return `${x},${y}`;
  });

  return {
    area: `0,${height} ${graphPoints.join(" ")} ${width},${height}`,
    line: graphPoints.join(" "),
    lastPoint: graphPoints.at(-1) ?? `${width / 2},${height / 2}`,
  };
}

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const market = await getMarketForRoute(slug);

  if (!market) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background:
              "linear-gradient(135deg, rgb(8, 17, 31) 0%, rgb(12, 20, 36) 55%, rgb(10, 17, 32) 100%)",
            color: "rgb(238, 244, 255)",
            fontSize: 52,
            fontWeight: 700,
          }}
        >
          RocketMarket
        </div>
      ),
      size,
    );
  }

  const yesPercent = Math.round(market.currentProbability * 100);
  const noPercent = 100 - yesPercent;
  const chart = buildChartGeometry(market.chart, 940, 235);
  const description = summarize(buildMarketDescription(market), 146);
  const impliedYesPrice = formatMoney(market.currentProbability);
  const impliedNoPrice = formatMoney(1 - market.currentProbability);
  const [lastX, lastY] = chart.lastPoint.split(",");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background:
            "radial-gradient(circle at top left, rgba(50,90,160,0.38), transparent 26%), radial-gradient(circle at 85% 10%, rgba(101,167,255,0.22), transparent 20%), linear-gradient(180deg, rgb(8, 17, 31) 0%, rgb(12, 20, 36) 50%, rgb(10, 17, 32) 100%)",
          color: "rgb(238, 244, 255)",
          padding: "44px 48px",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 26,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                display: "flex",
                borderRadius: 999,
                padding: "10px 18px",
                background: "rgba(101, 167, 255, 0.14)",
                border: "1px solid rgba(101, 167, 255, 0.3)",
                fontSize: 20,
                fontWeight: 700,
                letterSpacing: 1.2,
                textTransform: "uppercase",
              }}
            >
              {market.category}
            </div>
            <div
              style={{
                display: "flex",
                borderRadius: 999,
                padding: "10px 18px",
                background: "rgba(255, 255, 255, 0.07)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                fontSize: 20,
                fontWeight: 600,
                textTransform: "capitalize",
              }}
            >
              {market.status}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 22,
              color: "rgba(214, 225, 255, 0.92)",
              letterSpacing: 0.6,
            }}
          >
            RocketMarket
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", maxWidth: 1120 }}>
          <div
            style={{
              display: "flex",
              fontSize: 48,
              fontWeight: 800,
              lineHeight: 1.08,
              letterSpacing: -1.8,
            }}
          >
            {summarize(market.question, 126)}
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 14,
              fontSize: 22,
              lineHeight: 1.35,
              color: "rgba(214, 225, 255, 0.78)",
            }}
          >
            {description}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 18,
            marginTop: 26,
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              width: 206,
              borderRadius: 28,
              padding: "22px 24px",
              background: "rgba(58, 214, 156, 0.12)",
              border: "1px solid rgba(58, 214, 156, 0.22)",
            }}
          >
            <div style={{ display: "flex", fontSize: 19, color: "rgba(188, 255, 225, 0.82)" }}>
              YES
            </div>
            <div style={{ display: "flex", marginTop: 10, fontSize: 60, fontWeight: 800 }}>
              {yesPercent}%
            </div>
            <div style={{ display: "flex", marginTop: 8, fontSize: 22, color: "rgba(188, 255, 225, 0.88)" }}>
              Implied price {impliedYesPrice}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              width: 206,
              borderRadius: 28,
              padding: "22px 24px",
              background: "rgba(255, 112, 112, 0.12)",
              border: "1px solid rgba(255, 112, 112, 0.22)",
            }}
          >
            <div style={{ display: "flex", fontSize: 19, color: "rgba(255, 206, 206, 0.82)" }}>
              NO
            </div>
            <div style={{ display: "flex", marginTop: 10, fontSize: 60, fontWeight: 800 }}>
              {noPercent}%
            </div>
            <div style={{ display: "flex", marginTop: 8, fontSize: 22, color: "rgba(255, 206, 206, 0.88)" }}>
              Implied price {impliedNoPrice}
            </div>
          </div>

          {[
            { label: "Volume", value: formatMoney(market.volume) },
            { label: "Traders", value: `${market.tradersCount}` },
            {
              label: market.status === "open" ? "Closes" : "Resolve by",
              value: formatDateTime(
                market.status === "open" ? market.closeTime : market.resolveByTime,
              ),
            },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                display: "flex",
                flexDirection: "column",
                width: stat.label === "Traders" ? 150 : 268,
                borderRadius: 24,
                padding: "18px 20px",
                background: "rgba(255, 255, 255, 0.06)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
              }}
            >
              <div style={{ display: "flex", fontSize: 17, color: "rgba(214, 225, 255, 0.66)" }}>
                {stat.label}
              </div>
              <div style={{ display: "flex", marginTop: 10, fontSize: 28, fontWeight: 700, lineHeight: 1.15 }}>
                {stat.value}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: 22,
            flex: 1,
            borderRadius: 30,
            padding: "22px 24px 18px",
            background: "rgba(9, 21, 39, 0.86)",
            border: "1px solid rgba(101, 167, 255, 0.18)",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", fontSize: 24, fontWeight: 700 }}>Probability History</div>
              <div style={{ display: "flex", fontSize: 17, color: "rgba(214, 225, 255, 0.66)" }}>
                {market.chart.length > 0
                  ? `${formatShortDate(market.chart[0].timestamp)} to ${formatShortDate(
                      market.chart[market.chart.length - 1].timestamp,
                    )}`
                  : "Latest market state"}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flex: 1,
                marginTop: 18,
                borderRadius: 22,
                padding: "20px 20px 16px",
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
              }}
            >
              <svg width="100%" height="100%" viewBox="0 0 940 235">
                <defs>
                  <linearGradient id="rocketOgGradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#65a7ff" stopOpacity="0.58" />
                    <stop offset="100%" stopColor="#65a7ff" stopOpacity="0.06" />
                  </linearGradient>
                </defs>
                <line x1="0" y1="0" x2="940" y2="0" stroke="rgba(148,182,255,0.14)" strokeWidth="1" />
                <line x1="0" y1="58.75" x2="940" y2="58.75" stroke="rgba(148,182,255,0.08)" strokeWidth="1" />
                <line x1="0" y1="117.5" x2="940" y2="117.5" stroke="rgba(148,182,255,0.08)" strokeWidth="1" />
                <line x1="0" y1="176.25" x2="940" y2="176.25" stroke="rgba(148,182,255,0.08)" strokeWidth="1" />
                <line x1="0" y1="235" x2="940" y2="235" stroke="rgba(148,182,255,0.14)" strokeWidth="1" />
                <polygon points={chart.area} fill="url(#rocketOgGradient)" />
                <polyline
                  points={chart.line}
                  fill="none"
                  stroke="rgb(101, 167, 255)"
                  strokeWidth="8"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                <circle
                  cx={lastX}
                  cy={lastY}
                  r="11"
                  fill="rgb(101, 167, 255)"
                />
                <circle
                  cx={lastX}
                  cy={lastY}
                  r="21"
                  fill="rgba(101, 167, 255, 0.18)"
                />
              </svg>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: 16,
                fontSize: 18,
                color: "rgba(214, 225, 255, 0.68)",
              }}
            >
              <div style={{ display: "flex", gap: 18 }}>
                <div style={{ display: "flex" }}>100%</div>
                <div style={{ display: "flex" }}>50%</div>
                <div style={{ display: "flex" }}>0%</div>
              </div>
              <div style={{ display: "flex", gap: 22 }}>
                {market.chart.length > 0 && (
                  <div style={{ display: "flex" }}>{formatShortDate(market.chart[0].timestamp)}</div>
                )}
                {market.chart.length > 1 && (
                  <div style={{ display: "flex" }}>
                    {formatShortDate(market.chart[market.chart.length - 1].timestamp)}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
