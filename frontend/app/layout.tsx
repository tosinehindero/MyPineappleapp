import type { Metadata } from "next";
import "./globals.css";
import ClientProviders from "@/components/ClientProviders";

export const metadata: Metadata = {
  title: "PineapplePlay - Exclusive Social Platform",
  description: "Where luxury meets lifestyle. A premium lifestyle social platform for discerning individuals who value privacy, sophistication, and meaningful connections. Come and connect with your TRIBE",
  keywords: "luxury social network, exclusive community, high-end networking, private social platform, pineapple play",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="antialiased">
        <ClientProviders>
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}
