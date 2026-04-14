import type { Metadata } from "next";
import { Nunito_Sans, Rubik } from "next/font/google";
import { AppProviders } from "./providers";
import "./globals.css";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: {
    default: "Baisard POS | Professional Retail Solutions",
    template: "%s | Baisard POS",
  },
  description:
    "Baisard POS is a premium, all-in-one point-of-sale system designed for modern retail. Manage sales, inventory, and analytics with ease and style.",
  applicationName: "Baisard POS",
  keywords: ["POS", "Point of Sale", "Retail Management", "Inventory Control", "Business Analytics", "Baisard"],
  authors: [{ name: "Ritsard" }],
  openGraph: {
    title: "Baisard POS | Professional Retail Solutions",
    description: "Steamline your business with our modern point-of-sale system.",
    type: "website",
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
      <body className={`${nunitoSans.variable} ${rubik.variable} font-sans antialiased`}>
        <AppProviders>
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
