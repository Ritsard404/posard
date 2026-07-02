"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { DashboardDataDto } from "../_services/_dto/dashboard.dto";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2,
  }).format(value);
}

function DeferredChart({
  children,
  height = 220,
}: {
  children: ReactNode;
  height?: number;
}) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const scheduleIdle = globalThis.requestIdleCallback;

    if (scheduleIdle) {
      const id = scheduleIdle(() => setReady(true), {
        timeout: 1200,
      });

      return () => globalThis.cancelIdleCallback(id);
    }

    const id = setTimeout(() => setReady(true), 120);
    return () => clearTimeout(id);
  }, []);

  if (!ready) {
    return (
      <div
        aria-label="Loading chart"
        role="status"
        className="rounded-xl border border-dashed border-border/70 bg-muted/20"
        style={{ height }}
      />
    );
  }

  return <>{children}</>;
}

export function DashboardTrendChart({ data }: { data: DashboardDataDto["trend"] }) {
  const chartConfig = {
    sales: { label: "Sales", color: "#0f766e" },
    transactions: { label: "Transactions", color: "#06b6d4" },
  } satisfies ChartConfig;

  return (
    <DeferredChart>
      <ChartContainer config={chartConfig} height={220}>
        <AreaChart accessibilityLayer data={data} margin={{ left: 8, right: 8, top: 12 }}>
          <defs>
            <linearGradient id="fillSales" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-sales)" stopOpacity={0.35} />
              <stop offset="95%" stopColor="var(--color-sales)" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="fillTransactions" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-transactions)" stopOpacity={0.25} />
              <stop offset="95%" stopColor="var(--color-transactions)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} strokeDasharray="4 4" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={10} />
          <YAxis hide />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value, name) =>
                  name === "sales" ? formatCurrency(Number(value)) : `${value} txns`
                }
              />
            }
          />
          <ChartLegend content={<ChartLegendContent />} />
          <Area
            type="monotone"
            dataKey="sales"
            stroke="var(--color-sales)"
            strokeWidth={2.5}
            fill="url(#fillSales)"
          />
          <Area
            type="monotone"
            dataKey="transactions"
            stroke="var(--color-transactions)"
            strokeWidth={2}
            fill="url(#fillTransactions)"
          />
        </AreaChart>
      </ChartContainer>
    </DeferredChart>
  );
}

export function DashboardRankedBarsChart({
  items,
  metricLabel,
}: {
  items: Array<{ id: string; name: string; secondaryLabel: string; sales: number; transactions: number; statusLabel: string }>;
  metricLabel: string;
}) {
  const chartConfig = {
    sales: { label: metricLabel, color: "#0ea5e9" },
  } satisfies ChartConfig;

  return (
    <DeferredChart>
      <ChartContainer config={chartConfig} height={220}>
        <BarChart accessibilityLayer data={items} layout="vertical" margin={{ left: 8, right: 12 }}>
          <CartesianGrid horizontal={false} strokeDasharray="4 4" />
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} width={90} />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value) => formatCurrency(Number(value))}
              />
            }
          />
          <Bar dataKey="sales" fill="var(--color-sales)" radius={10} />
        </BarChart>
      </ChartContainer>
    </DeferredChart>
  );
}

export function DashboardPaymentMixChart({ items }: { items: DashboardDataDto["paymentMix"] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-border/60 bg-muted/20 p-4 text-sm text-muted-foreground">
        No reference payment activity recorded for this view today.
      </div>
    );
  }

  const palette = ["#0f766e", "#0891b2", "#2563eb", "#7c3aed", "#ea580c", "#dc2626"];
  const chartConfig = Object.fromEntries(
    items.map((item, index) => [
      item.label,
      { label: item.label, color: palette[index % palette.length] },
    ]),
  ) satisfies ChartConfig;

  const data = items.map((item) => ({
    ...item,
    fill: chartConfig[item.label].color,
  }));

  return (
    <DeferredChart>
      <ChartContainer config={chartConfig} height={220}>
        <PieChart>
          <ChartTooltip
            content={
              <ChartTooltipContent
                hideLabel
                formatter={(value) => formatCurrency(Number(value))}
              />
            }
          />
          <ChartLegend content={<ChartLegendContent />} />
          <Pie
            data={data}
            dataKey="amount"
            nameKey="label"
            innerRadius={70}
            outerRadius={110}
            paddingAngle={3}
            strokeWidth={2}
          >
            {data.map((entry) => (
              <Cell key={entry.label} fill={entry.fill} />
            ))}
          </Pie>
        </PieChart>
      </ChartContainer>
    </DeferredChart>
  );
}
