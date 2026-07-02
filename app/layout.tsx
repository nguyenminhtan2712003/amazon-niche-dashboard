import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Amazon Niche & ASIN Dashboard",
  description: "Niche browser, top ASINs, and growth analysis",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
