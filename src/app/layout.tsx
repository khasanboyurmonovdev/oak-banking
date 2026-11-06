import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { AppShell } from "@/components/shell/app-shell";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Oak Banking",
    template: "%s · Oak Banking",
  },
  description: "Business banking dashboard demo with simulated data.",
};

export const viewport: Viewport = {
  themeColor: "#f6f8f6",
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      <body className="min-h-dvh">
        <TooltipProvider>
          <Toaster>
            <AppShell>{children}</AppShell>
          </Toaster>
        </TooltipProvider>
      </body>
    </html>
  );
}
