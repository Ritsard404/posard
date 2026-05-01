"use client";

import Image from "next/image";
import { useState } from "react";
import { getPosardImagePublicUrl, isAbsoluteImageUrl } from "@/lib/storage/image-storage";
import { cn } from "@/lib/utils";

interface StorageImageProps {
  src: string | null | undefined;
  alt: string;
  fill?: boolean;
  width?: number;
  height?: number;
  sizes?: string;
  className?: string;
  fallback: React.ReactNode;
  containerClassName?: string;
}

export function StorageImage({
  src,
  alt,
  fill,
  width,
  height,
  sizes,
  className,
  fallback,
  containerClassName,
}: StorageImageProps) {
  const [failed, setFailed] = useState(false);
  const resolvedSrc = failed ? null : getPosardImagePublicUrl(src);

  if (!resolvedSrc) {
    return <>{fallback}</>;
  }

  if (isAbsoluteImageUrl(resolvedSrc) && !resolvedSrc.includes("/storage/v1/object/public/")) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={resolvedSrc}
        alt={alt}
        className={cn(className, fill ? "absolute inset-0 h-full w-full" : undefined, containerClassName)}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <Image
      src={resolvedSrc}
      alt={alt}
      fill={fill}
      width={fill ? undefined : width}
      height={fill ? undefined : height}
      sizes={sizes}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
