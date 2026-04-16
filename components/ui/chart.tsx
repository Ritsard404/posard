"use client";

import * as React from "react";
import type { TooltipContentProps } from "recharts";
import { Legend, ResponsiveContainer, Tooltip } from "recharts";
import { cn } from "@/lib/utils";

export type ChartConfig = Record<
  string,
  {
    label: string;
    color: string;
  }
>;

const ChartContext = React.createContext<ChartConfig | null>(null);

function useChart() {
  const context = React.useContext(ChartContext);

  if (!context) {
    throw new Error("Chart components must be used inside ChartContainer.");
  }

  return context;
}

function getPayloadKey(item: unknown) {
  if (!item || typeof item !== "object") {
    return null;
  }

  if ("dataKey" in item && typeof item.dataKey === "string") {
    return item.dataKey;
  }

  if ("name" in item && typeof item.name === "string") {
    return item.name;
  }

  return null;
}

export function ChartContainer({
  config,
  className,
  children,
}: {
  config: ChartConfig;
  className?: string;
  children: React.ReactNode;
}) {
  const style = Object.entries(config).reduce<Record<string, string>>(
    (acc, [key, value]) => {
      acc[`--color-${key}`] = value.color;
      return acc;
    },
    {},
  );

  return (
    <ChartContext.Provider value={config}>
      <div
        className={cn("h-[320px] w-full min-w-0 min-h-[240px]", className)}
        style={style as React.CSSProperties}
      >
        <ResponsiveContainer
          width="100%"
          height="100%"
          minWidth={0}
          minHeight={240}
          debounce={50}
        >
          {children as React.ReactElement}
        </ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
}

export const ChartTooltip = Tooltip;

export function ChartTooltipContent({
  active,
  payload,
  label,
  hideLabel = false,
  formatter,
}: Partial<TooltipContentProps<number, string>> & {
  hideLabel?: boolean;
  formatter?: (value: number, name: string) => React.ReactNode;
}) {
  const config = useChart();

  if (!active || !payload || payload.length === 0) {
    return null;
  }

  return (
    <div className="min-w-40 rounded-2xl border border-border/60 bg-background/95 px-3 py-2 shadow-xl backdrop-blur">
      {!hideLabel && label ? (
        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {String(label)}
        </div>
      ) : null}
      <div className="space-y-1.5">
        {payload.map((entry, index) => {
          const key = getPayloadKey(entry) ?? `item-${index}`;
          const meta = config[key];
          const value = Number(entry.value ?? 0);

          return (
            <div
              key={`${key}-${index}`}
              className="flex items-center justify-between gap-3 text-sm"
            >
              <div className="flex items-center gap-2">
                <span
                  className="size-2.5 rounded-full"
                  style={{
                    backgroundColor: meta?.color ?? entry.color ?? "#0f172a",
                  }}
                />
                <span className="text-muted-foreground">
                  {meta?.label ?? entry.name ?? key}
                </span>
              </div>
              <span className="font-semibold text-foreground">
                {formatter ? formatter(value, key) : value.toLocaleString()}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const ChartLegend = Legend;

export function ChartLegendContent({
  payload,
}: {
  payload?: Array<{ value?: string; color?: string; dataKey?: string }>;
}) {
  const config = useChart();

  if (!payload || payload.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
      {payload.map((entry, index) => {
        const key = entry.dataKey ?? entry.value ?? `legend-${index}`;
        const meta = config[key];

        return (
          <div
            key={`${key}-${index}`}
            className="flex items-center gap-2 text-xs text-muted-foreground"
          >
            <span
              className="size-2.5 rounded-full"
              style={{
                backgroundColor: meta?.color ?? entry.color ?? "#0f172a",
              }}
            />
            <span>{meta?.label ?? entry.value ?? key}</span>
          </div>
        );
      })}
    </div>
  );
}
