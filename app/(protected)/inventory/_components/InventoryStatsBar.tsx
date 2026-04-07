"use client";

import { Package, Layers, AlertTriangle, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { ProductDto } from "@/app/(protected)/inventory/_services/_dto/product.dto";
import type { CategoryDto } from "@/app/(protected)/inventory/_services/_dto/category.dto";

// ─────────────────────────────────────────────
// Tipos de props para las tarjetas de resumen
// ─────────────────────────────────────────────

interface InventoryStatsBarProps {
  products: ProductDto[];
  totalElements: number;
  categories: CategoryDto[];
}

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  accentClass: string;
}

// ─────────────────────────────────────────────
// Tarjeta individual de estadísticas
// ─────────────────────────────────────────────

function StatCard({ label, value, icon, accentClass }: StatCardProps) {
  return (
    <Card className="relative overflow-hidden transition-shadow hover:shadow-md">
      <CardContent className="flex items-center gap-4 p-4">
        {/* Ícono con fondo de acento */}
        <div
          className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${accentClass}`}
        >
          {icon}
        </div>

        <div className="min-w-0">
          <p className="text-2xl font-bold tracking-tight">{value}</p>
          <p className="truncate text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────
// Barra de estadísticas del inventario
// ─────────────────────────────────────────────

export function InventoryStatsBar({
  products,
  totalElements,
  categories,
}: InventoryStatsBarProps) {
  // Calcular los conteos derivados de los productos cargados en la página actual
  const lowStockCount = products.filter(
    (p) => p.quantity !== null && p.quantity <= 5
  ).length;

  const unavailableCount = products.filter((p) => !p.isAvailable).length;

  const stats: StatCardProps[] = [
    {
      label: "Total Products",
      value: totalElements,
      icon: <Package className="size-5 text-blue-600 dark:text-blue-400" />,
      accentClass: "bg-blue-100 dark:bg-blue-900/40",
    },
    {
      label: "Categories",
      value: categories.length,
      icon: <Layers className="size-5 text-violet-600 dark:text-violet-400" />,
      accentClass: "bg-violet-100 dark:bg-violet-900/40",
    },
    {
      label: "Low Stock",
      value: lowStockCount,
      icon: (
        <AlertTriangle className="size-5 text-amber-600 dark:text-amber-400" />
      ),
      accentClass: "bg-amber-100 dark:bg-amber-900/40",
    },
    {
      label: "Unavailable",
      value: unavailableCount,
      icon: <XCircle className="size-5 text-red-600 dark:text-red-400" />,
      accentClass: "bg-red-100 dark:bg-red-900/40",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {stats.map((s) => (
        <StatCard key={s.label} {...s} />
      ))}
    </div>
  );
}
