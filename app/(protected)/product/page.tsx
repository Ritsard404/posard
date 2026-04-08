import { Suspense } from "react";
import { findAllProducts } from "@/app/(protected)/product/_actions/product.actions";
import { findAllCategoriesByCompany } from "@/app/(protected)/product/_actions/category.actions";
import { InventoryPageClient } from "./_components/InventoryPageClient";
import { InventoryPageSkeleton } from "./_components/InventoryPageSkeleton";

// ─────────────────────────────────────────────
// Página del inventario (Server Component)
// Envuelve la carga async en Suspense para no bloquear la navegación
// ─────────────────────────────────────────────

export default function InventoryPage() {
  return (
    <Suspense fallback={<InventoryPageSkeleton />}>
      <InventoryContent />
    </Suspense>
  );
}

// ─────────────────────────────────────────────
// Componente interno que ejecuta la carga async
// ─────────────────────────────────────────────

async function InventoryContent() {
  const [initialProducts, initialCategories] = await Promise.all([
    findAllProducts({ page: 0, size: 10 }),
    findAllCategoriesByCompany(),
  ]);

  return (
    <InventoryPageClient
      initialProducts={initialProducts}
      initialCategories={initialCategories}
    />
  );
}
