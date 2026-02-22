import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import DevToolbar from "@/components/DevToolbar";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });

export const metadata: Metadata = {
  title: "Spin & Win",
  description: "Scan, spin, and win rewards at your favourite restaurants.",
  robots: "noindex",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geist.variable} font-sans antialiased bg-[#F8F5F0] text-[#1F2937]`}>
        {children}
        <DevToolbar />
      </body>
    </html>
  );
}
