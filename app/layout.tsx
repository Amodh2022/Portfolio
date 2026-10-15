import type { Metadata } from "next";
import { IBM_Plex_Mono, Pixelify_Sans } from "next/font/google";
import "./globals.css";

const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-mono" });
const pixel = Pixelify_Sans({ subsets: ["latin"], weight: ["500", "700"], variable: "--font-pixel" });

export const metadata: Metadata = {
  title: "Amodh Nadiger · Software Engineer",
  description: "Amodh Nadiger, Software Engineer with 3.5+ years of Flutter experience. Creator of fitgrid_table and flutter-bridge-mcp.",
};

// Applies the saved theme and accent before first paint so there is no flash.
const initSettings = `try{var s=JSON.parse(localStorage.getItem('pf-settings')||'{}'),d=document.documentElement;if(s.theme==='light')d.dataset.theme='light';if(/^#[0-9a-f]{6}$/i.test(s.accent||''))d.style.setProperty('--ac',s.accent)}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${mono.variable} ${pixel.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: initSettings }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
