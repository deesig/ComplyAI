
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
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
  title: "ComplyAI",
  description: "The Compliance Tool of the Future",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>ComplyAI</title>
        <link
            href="//netdna.bootstrapcdn.com/font-awesome/3.2.1/css/font-awesome.css"
            rel="stylesheet"
          />
    </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased layout-body`}
      >
        {children}
        <Script
          src="https://kit.fontawesome.com/a1cd2dbedf.js"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
