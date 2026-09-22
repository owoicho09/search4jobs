import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Falls back to the known production domain rather than inventing one —
// NEXT_PUBLIC_APP_URL is set in Vercel to https://www.search4jobs.site.
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.search4jobs.site";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "Search4Jobs",
    template: "%s | Search4Jobs",
  },
  description:
    "AI-powered job search and matching — search real job listings matched to your skills, from the dashboard or your own Telegram bot.",
};

export const viewport: Viewport = {
  themeColor: "#4f46e5",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
