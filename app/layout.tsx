import type { Metadata, Viewport } from "next";
import { Roboto, Roboto_Mono } from "next/font/google";
import Shell from "@/components/Shell";
import "./globals.css";

const roboto = Roboto({ subsets: ["latin"], weight: ["400", "500", "700", "900"], variable: "--font-sans", display: "swap" });
const robotoMono = Roboto_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  title: "Prompt studio · Limelight",
  description: "One brief in. Prompts for every AI tool, social content, and a posting calendar.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#070b11" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${roboto.variable} ${robotoMono.variable}`}>
      <body><Shell>{children}</Shell></body>
    </html>
  );
}
