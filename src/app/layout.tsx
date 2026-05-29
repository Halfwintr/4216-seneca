import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import { LenisProvider } from "@/components/LenisProvider";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "4216 Seneca Ave — St. Elmo, Chattanooga",
  description:
    "A historic home in St. Elmo. Nearly half an acre, original woodwork, a backyard that grows quiet as you move through it.",
  openGraph: {
    title: "4216 Seneca Ave — St. Elmo, Chattanooga",
    description:
      "A house that has held a hundred years of morning light.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${cormorant.variable} ${inter.variable} h-full`}
    >
      <head>
        <link rel="preload" href="/scenes/arrival-001/frame-00.webp" as="image" />
      </head>
      <body className="min-h-full bg-stone-950 text-stone-100 font-sans antialiased">
        <LenisProvider>{children}</LenisProvider>
      </body>
    </html>
  );
}
