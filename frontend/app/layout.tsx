import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/context/AppContext";
import { MotionConfig } from "motion/react";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "Car Rental Service",
  description: "A simple car rental service application built with Next.js",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${outfit.variable} antialiased`}>
        <AppProvider>
          <MotionConfig>{children}</MotionConfig>
        </AppProvider>
      </body>
    </html>
  );
}
