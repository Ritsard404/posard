import type { Metadata } from "next";

import { createProtectedPageMetadata } from "@/lib/seo";
import { POSTerminalManager } from "./_components/POSTerminalManager";

export const metadata: Metadata = createProtectedPageMetadata("pos");

export default async function POSPage() {
  return (
    <div className="h-full min-h-0 overflow-hidden">
      <POSTerminalManager />
    </div>
  );
}
