import type { Metadata } from "next";
import { Roboto, Roboto_Mono } from "next/font/google";
import type { ReactNode } from "react";
import { Shell } from "@/components/shell";
import { ThemeProvider } from "@/components/theme-provider";
import { PRODUCT_DESCRIPTION, PRODUCT_NAME, PRODUCT_TAGLINE } from "@/config/brand";
import { getAppData } from "@/lib/data";
import "./globals.css";

const sans = Roboto({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-roboto",
  display: "swap",
});

const mono = Roboto_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-roboto-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: `${PRODUCT_NAME} · ${PRODUCT_TAGLINE}`,
    template: `%s · ${PRODUCT_NAME}`,
  },
  description: PRODUCT_DESCRIPTION,
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
