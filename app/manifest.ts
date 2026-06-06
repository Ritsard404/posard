import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "POSard",
    short_name: "POSard",
    description:
      "POSard is a modern point-of-sale system for small businesses, restaurants, and retail stores.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#071a3d",
    theme_color: "#1447e6",
    categories: ["business", "productivity", "finance"],
    icons: [
      {
        src: "/pwa-icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/pwa-icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/pwa-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    screenshots: [
      {
        src: "/images/pos-mobile.png",
        sizes: "1084x2046",
        type: "image/png",
        form_factor: "narrow",
        label: "POSard mobile checkout",
      },
      {
        src: "/images/pos-desktop.png",
        sizes: "1672x941",
        type: "image/png",
        form_factor: "wide",
        label: "POSard desktop point of sale",
      },
    ],
  };
}
