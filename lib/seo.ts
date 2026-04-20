export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://posard.vercel.app"
).replace(/\/$/, "");

export const siteConfig = {
  name: "POSard",
  url: siteUrl,
  title: "Small Business POS Software",
  description:
    "POSard is cloud-based small business POS software for faster checkout, inventory control, sales reporting, and secure retail operations.",
  creator: "Ritsard",
  keywords: [
    "small business POS software",
    "point of sale system",
    "retail POS",
    "inventory management POS",
    "sales reporting software",
  ],
};

export function absoluteUrl(path = "/") {
  return `${siteConfig.url}${path.startsWith("/") ? path : `/${path}`}`;
}

export function jsonLdScript(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
