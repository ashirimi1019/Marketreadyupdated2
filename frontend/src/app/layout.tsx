import type { Metadata } from "next";
import { Space_Grotesk, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space",
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
  fallback: ["Segoe UI", "Arial", "sans-serif"],
  subsets: ["latin"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  display: "swap",
  weight: ["400", "600"],
  fallback: ["Consolas", "Courier New", "monospace"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Market Ready | Become Undeniable",
  description:
    "Proof-first career acceleration for CS students. Build your Market-Ready Index with real market signals, GitHub proof, and AI-driven insights.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        {/* Material Symbols */}
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
          rel="stylesheet"
        />
      </head>
      <body
        className={`${spaceGrotesk.variable} ${ibmPlexMono.variable} antialiased`}
        style={{ fontFamily: "var(--font-space), 'Space Grotesk', sans-serif" }}
      >
        {children}
      </body>
    </html>
  );
}
