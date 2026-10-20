import type { Metadata } from "next";
import localFont from "next/font/local";
import type { ReactNode } from "react";
import { Shell } from "@/components/shell";
import { ThemeProvider } from "@/components/theme-provider";
import { PRODUCT_DESCRIPTION, PRODUCT_NAME, PRODUCT_TAGLINE } from "@/config/brand";
import { getAppData } from "@/lib/data";
import "./globals.css";

// Self-hosted (latin subset from @fontsource) so builds never fetch Google Fonts.
const sans = localFont({
  src: [
    { path: "./fonts/roboto-latin-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/roboto-latin-500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/roboto-latin-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-roboto",
  display: "swap",
});

const mono = localFont({
  src: [
    { path: "./fonts/roboto-mono-latin-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/roboto-mono-latin-500.woff2", weight: "500", style: "normal" },
  ],
  variable: "--font-roboto-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: `${PRODUCT_NAME} · ${PRODUCT_TAGLINE}`,
    template: `%s · ${PRODUCT_NAME}`,
  },
  description: PRODUCT_DESCRIPTION,
  openGraph: {
    title: `${PRODUCT_NAME} · ${PRODUCT_TAGLINE}`,
    description: PRODUCT_DESCRIPTION,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${PRODUCT_NAME} · ${PRODUCT_TAGLINE}`,
    description: PRODUCT_DESCRIPTION,
  },
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const data = await getAppData();
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable} dark h-full antialiased`} suppressHydrationWarning>
      <body className="flex min-h-full flex-col font-sans">
        <ThemeProvider>
          <Shell data={data}>{children}</Shell>
        </ThemeProvider>
      </body>
    </html>
  );
}
