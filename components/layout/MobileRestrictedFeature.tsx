import Link from "next/link";
import { Monitor, Printer, ShoppingCart, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type PosardAppMode } from "@/lib/mobile-app-mode";

function getModeLabel(mode: PosardAppMode) {
  switch (mode) {
    case "capacitor-android":
      return "Android app";
    case "capacitor-ios":
      return "iOS app";
    case "phone-browser":
      return "Phone browser";
    case "tablet-browser":
      return "Tablet browser";
    default:
      return "Desktop browser";
  }
}

export function MobileRestrictedFeature({
  title,
  reason,
  mode,
  companyId,
}: {
  title: string;
  reason: string;
  mode: PosardAppMode;
  companyId?: string | null;
}) {
  const printerHref = companyId
    ? `/companies/${companyId}/terminals?view=printer`
    : null;

  return (
    <div className="flex min-h-full items-center justify-center p-3">
      <section className="w-full max-w-2xl rounded-lg border bg-card p-4 shadow-sm sm:p-6">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-lg border bg-background">
            <Monitor className="size-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
              {getModeLabel(mode)}
            </p>
            <h2 className="mt-1 text-lg font-bold text-foreground md:text-2xl">
              {title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {reason}
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-3">
          <Button asChild className="h-12 justify-start rounded-lg">
            <Link href="/pos">
              <ShoppingCart className="size-4" />
              Point of Sale
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="h-12 justify-start rounded-lg"
          >
            <Link href="/sync">
              <Wifi className="size-4" />
              Sync Center
            </Link>
          </Button>
          {printerHref ? (
            <Button
              asChild
              variant="outline"
              className="h-12 justify-start rounded-lg"
            >
              <Link href={printerHref}>
                <Printer className="size-4" />
                Printer Setup
              </Link>
            </Button>
          ) : null}
        </div>

        <p className="mt-4 rounded-lg border bg-background px-3 py-2 text-xs leading-5 text-muted-foreground">
          Managers and admins can open this area from a desktop browser when
          they need reports, imports, company setup, permissions, or other deep
          management work.
        </p>
      </section>
    </div>
  );
}
