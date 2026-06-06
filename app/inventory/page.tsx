import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Inventory",
  description:
    "Manage POSard products, categories, pricing, barcode details, stock tracking, and inventory availability.",
  alternates: {
    canonical: "/product",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function InventoryAliasPage() {
  redirect("/product");
}
