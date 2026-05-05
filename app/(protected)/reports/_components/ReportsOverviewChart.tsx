"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { ReportTrendPointDto } from "@/app/(protected)/report/_services/_dto/report.dto";

export function ReportsOverviewChart({ data }: { data: ReportTrendPointDto[] }) {
  return (
    <ChartContainer
      config={{ sales: { label: "Sales", color: "hsl(var(--primary))" } }}
      className="h-[170px]"
      height={170}
      minHeight={150}
    >
      <AreaChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="report-sales-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-sales)" stopOpacity={0.28} />
            <stop offset="95%" stopColor="var(--color-sales)" stopOpacity={0.03} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          fontSize={11}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          fontSize={11}
          width={34}
        />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              formatter={(value) =>
                new Intl.NumberFormat("en-PH", {
                  style: "currency",
                  currency: "PHP",
                  maximumFractionDigits: 0,
                }).format(value)
              }
            />
          }
        />
        <Area
          type="monotone"
          dataKey="sales"
          stroke="var(--color-sales)"
          fill="url(#report-sales-fill)"
          strokeWidth={2}
        />
      </AreaChart>
    </ChartContainer>
  );
}
