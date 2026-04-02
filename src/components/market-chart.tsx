"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatChartDate, formatProbability } from "@/lib/format";
import type { ChartPoint } from "@/lib/types";

export function MarketChart({ points }: { points: ChartPoint[] }) {
  const data = points.map((point) => ({
    ...point,
    label: formatChartDate(point.timestamp),
  }));

  return (
    <div className="panel rounded-[28px] p-5">
      <div className="eyebrow">Probability History</div>
      <div className="mt-4 h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="rocketGradient" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#65a7ff" stopOpacity={0.58} />
                <stop offset="100%" stopColor="#65a7ff" stopOpacity={0.06} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(148, 182, 255, 0.08)" vertical={false} />
            <XAxis dataKey="label" axisLine={false} tickLine={false} />
            <YAxis
              axisLine={false}
              tickLine={false}
              domain={[0, 1]}
              tickFormatter={(value) => formatProbability(Number(value))}
            />
            <Tooltip
              formatter={(value) => formatProbability(Number(value ?? 0))}
              contentStyle={{
                borderRadius: 18,
                border: "1px solid rgba(148, 182, 255, 0.14)",
                background: "rgba(14, 24, 41, 0.96)",
                color: "#eef4ff",
              }}
            />
            <Area
              type="monotone"
              dataKey="probability"
              stroke="#65a7ff"
              strokeWidth={3}
              fill="url(#rocketGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
