import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import Shell from "@/components/Shell";
import "./globals.css";

const outfit = Outfit({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-sans", display: "swap" });

export const metadata: Metadata = {
  title: "Studio · Limelight",
  description: "One brief in. Prompts for every AI tool, social content, and a posting calendar.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#0A0A0B" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={outfit.variable}>
      <body><Shell>{children}</Shell></body>
    </html>
  );
}
