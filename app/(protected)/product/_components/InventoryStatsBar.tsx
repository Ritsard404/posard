"use client";

import { Package, Layers, AlertTriangle, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { ProductDto } from "@/app/(protected)/product/_services/_dto/product.dto";
import type { CategoryDto } from "@/app/(protected)/product/_services/_dto/category.dto";

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
    <Card className="glass-card relative overflow-hidden transition-all hover:scale-[1.02] active:scale-[0.98] border-white/5">
      <CardContent className="flex items-center gap-4 p-5">
        {/* Ícono con fondo de acento */}
        <div
          className={`flex size-12 shrink-0 items-center justify-center rounded-xl shadow-lg ${accentClass}`}
        >
          {icon}
        </div>

        <div className="min-w-0">
          <p className="font-heading text-2xl font-extrabold tracking-tight">{value}</p>
          <p className="truncate text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
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
      icon: <Package className="size-6 text-accent" />,
      accentClass: "bg-accent/10 border border-accent/20",
    },
    {
      label: "Categories",
      value: categories.length,
      icon: <Layers className="size-6 text-indigo-400" />,
      accentClass: "bg-indigo-500/10 border border-indigo-500/20",
    },
    {
      label: "Low Stock",
      value: lowStockCount,
      icon: (
        <AlertTriangle className="size-6 text-amber-500" />
      ),
      accentClass: "bg-amber-500/10 border border-amber-500/20",
    },
    {
      label: "Unavailable",
      value: unavailableCount,
      icon: <XCircle className="size-6 text-red-500" />,
      accentClass: "bg-red-500/10 border border-red-500/20",
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
