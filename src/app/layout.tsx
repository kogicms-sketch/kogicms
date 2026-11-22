import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kogi State APM CMS",
  description: "Official Campaign Management System for Allied Peoples' Movement (APM), Kogi State",
  icons: {
    icon: "/parties/apm-logo.png",
    apple: "/parties/apm-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
