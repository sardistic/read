import type { Metadata } from "next";
import Script from "next/script";
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

export const metadata: Metadata = {
  title: "read",
  description: "Personal reading tracker",
  icons: {
    icon: '/images/logo.webp'
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {children}
        {/* Self-hosted analytics. No cookies, no cross-site identifiers, and
            the data never leaves our own box. */}
        <Script
          src="https://analytics.sardistic.com/script.js"
          data-website-id="82259345-a4a1-49f7-aa69-6d69e0867d48"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
