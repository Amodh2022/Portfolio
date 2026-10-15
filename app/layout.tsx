import type { Metadata } from "next";
import { IBM_Plex_Mono, Pixelify_Sans } from "next/font/google";
import "./globals.css";

const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-mono" });
const pixel = Pixelify_Sans({ subsets: ["latin"], weight: ["500", "700"], variable: "--font-pixel" });

export const metadata: Metadata = {
  title: "Amodh Nadiger · Flutter Developer",
  description: "Portfolio of Amodh Nadiger. Open quests, level up skills, unlock every badge.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${mono.variable} ${pixel.variable}`}>
      <body>{children}</body>
    </html>
  );
}
