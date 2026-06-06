import type { Metadata } from "next";

import { createProtectedPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createProtectedPageMetadata("settings");

export default function SettingPage() {
  return (
    <div>
      <div className=" rounded-lg border border-zinc-200 bg-white p-4 sm:p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
          Manage your POS system settings here.
        </p>
      </div>
    </div>
  );
}
