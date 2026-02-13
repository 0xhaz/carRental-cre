import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/context/AppContext";
import { MotionConfig } from "motion/react";
import RootLayoutContent from "./RootLayoutContent";
import { Providers } from "./providers";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "RegShield - Car Rental & Investment Platform",
  description: "A decentralized car rental and investment platform built with Next.js",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${outfit.variable} antialiased`}>
        <Providers>
          <AppProvider>
            <MotionConfig>
              <RootLayoutContent>{children}</RootLayoutContent>
            </MotionConfig>
          </AppProvider>
        </Providers>
      </body>
    </html>
  );
}
