import type { Metadata } from "next";
import { Nunito_Sans, Rubik } from "next/font/google";
import { absoluteUrl, siteConfig } from "@/lib/seo";
import { AppProviders } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.name,
    template: "%s | POSard",
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  manifest: "/manifest.webmanifest",
  keywords: siteConfig.keywords,
  authors: [{ name: siteConfig.creator }],
  creator: siteConfig.creator,
  publisher: siteConfig.name,
  category: "business",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: `${siteConfig.name} | ${siteConfig.title}`,
    description: siteConfig.description,
    url: absoluteUrl("/"),
    siteName: siteConfig.name,
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "POSard small business POS software",
      },
    ],
    locale: "en_PH",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteConfig.name} | ${siteConfig.title}`,
    description: siteConfig.description,
    images: ["/opengraph-image"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32" },
      { url: "/pwa-icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/pwa-icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: siteConfig.name,
    statusBarStyle: "black-translucent",
  },
};

const nunitoSans = Nunito_Sans({
  variable: "--font-nunito-sans",
  display: "swap",
  subsets: ["latin"],
  weight: ["300", "400", "600", "700", "800"],
});

const rubik = Rubik({
  variable: "--font-rubik",
  display: "swap",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${nunitoSans.variable} ${rubik.variable} font-sans antialiased`}
      >
        <AppProviders>
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
