import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LUXY - Exclusive Social Platform",
  description: "An invitation-only social platform for discerning individuals who value privacy, sophistication, and meaningful connections.",
  keywords: "luxury social network, exclusive community, high-end networking, private social platform",
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
        {children}
      </body>
    </html>
  );
}
