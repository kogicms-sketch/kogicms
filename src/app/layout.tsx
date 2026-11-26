import type { Metadata, Viewport } from "next";
import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "YMD CMS - Kogi State",
  description: "Official Campaign Management System for Allied Peoples' Movement (APM), Kogi State",
  icons: {
    icon: "/parties/apm-logo.png",
    apple: "/parties/apm-logo.png",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "YMD CMS - Kogi State",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#059669",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="overflow-x-hidden">
      <body className="antialiased overflow-x-hidden min-h-screen bg-background text-foreground touch-pan-y">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
