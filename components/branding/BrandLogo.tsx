import Image from "next/image";

import { cn } from "@/lib/utils";

type BrandLogoProps = {
  className?: string;
  markClassName?: string;
  titleClassName?: string;
  subtitleClassName?: string;
  subtitle?: string;
  showSubtitle?: boolean;
  compact?: boolean;
};

export function BrandLogo({
  className,
  markClassName,
  titleClassName,
  subtitleClassName,
  subtitle = "Mobile-first business suite",
  showSubtitle = false,
  compact = false,
}: BrandLogoProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span
        className={cn(
          "relative flex shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/95 shadow-[0_18px_48px_rgba(20,71,230,0.18)] ring-1 ring-primary/10",
          compact ? "size-10 rounded-xl" : "size-11",
          markClassName,
        )}
      >
        <Image
          src="/branding/posard-logo.png"
          alt="POSard logo"
          fill
          sizes={compact ? "40px" : "44px"}
          className="object-cover"
          priority
        />
      </span>
      <span className="grid min-w-0 text-left leading-tight">
        <span
          className={cn(
            "truncate font-heading font-extrabold tracking-tight text-foreground",
            compact ? "text-lg" : "text-xl",
            titleClassName,
          )}
        >
          POSard
        </span>
        {showSubtitle ? (
          <span
            className={cn(
              "truncate text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground",
              subtitleClassName,
            )}
          >
            {subtitle}
          </span>
        ) : null}
      </span>
    </div>
  );
}
