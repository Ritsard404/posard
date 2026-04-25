import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "POSard POS System",
    short_name: "POSard",
    description:
      "POSard is a mobile-first POS system for checkout, inventory, receipts, discounts, and sales reports.",
    start_url: "/",
    display: "standalone",
    background_color: "#071a3d",
    theme_color: "#1447e6",
    icons: [
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
