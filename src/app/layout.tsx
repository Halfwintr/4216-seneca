import type { Metadata } from "next";
import { Cormorant_Garamond, Figtree, Inter } from "next/font/google";
import { LenisProvider } from "@/components/LenisProvider";
import "./globals.css";

// Figtree stands in for Gibson (the licensed Monotype face used in the Figma
// design) — a close, free geometric-humanist sans. It's the primary UI face.
const figtree = Figtree({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-figtree",
  display: "swap",
});

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
  title: {
    default: "Love That For You — Property Story Engine",
    template: "%s · Love That For You",
  },
  description:
    "Transform ordinary listing photos into immersive cinematic property stories.",
  openGraph: {
    title: "Love That For You — Property Story Engine",
    description:
      "High-end property marketing from assets agents already have.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${figtree.variable} ${cormorant.variable} ${inter.variable} h-full`}
    >
      <body className="min-h-full bg-stone-950 text-stone-100 font-sans antialiased">
        <LenisProvider>{children}</LenisProvider>
      </body>
    </html>
  );
}
