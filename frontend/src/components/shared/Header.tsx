"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import {
  assets,
  menuLinks,
  investorMenuLinks,
  rentorMenuLinks,
  renterMenuLinks,
  adminMenuLinks,
} from "@/constants/menuLinks";
import { useUserStore } from "@/store";
import { UserRole } from "@/types";
import { UserMenu } from "./UserMenu";
import { NotificationBell } from "./NotificationBell";
import { UserGuideModal } from "./UserGuideModal";
import { useAppContext } from "@/context/AppContext";

// Dynamically import WalletConnectButton to avoid SSR issues
const WalletConnectButton = dynamic(
  () => import("./WalletConnectButton").then((mod) => mod.WalletConnectButton),
  { ssr: false }
);

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  // Use both Zustand and Context during migration
  const { user: zustandUser } = useUserStore();
  const { user: contextUser } = useAppContext();

  // Prefer Zustand user if available, fallback to context
  const user = zustandUser || contextUser;

  // Determine which navigation links to show based on user role
  const navigationLinks = useMemo(() => {
    if (!user || !user.role) {
      // Not logged in - show public menu
      return menuLinks;
    }

    // Show role-specific navigation
    switch (user.role) {
      case "admin":
        return adminMenuLinks;
      case UserRole.INVESTOR:
        return investorMenuLinks;
      case UserRole.RENTOR:
        return rentorMenuLinks;
      case UserRole.RENTER:
        return renterMenuLinks;
      default:
        return menuLinks;
    }
  }, [user]);

  // On home page, only show first link (Dashboard) for logged-in users
  const displayLinks = useMemo(() => {
    if (pathname === "/" && user) {
      return navigationLinks.slice(0, 1); // Only show Dashboard
    }
    return navigationLinks;
  }, [pathname, user, navigationLinks]);

  return (
    <nav className="flex items-center justify-between px-6 md:px-16 lg:px-24 xl:px-32 py-4 text-gray-600 border-b border-borderColor relative transition-all bg-light">
      {/* Logo */}
      <Link href="/">
        <Image
          src={assets.logo}
          alt="RegShield Logo"
          className="h-8"
          width={120}
          height={32}
        />
      </Link>

      {/* Desktop Navigation */}
      <div className="hidden md:flex items-center gap-8">
        {displayLinks.map(link => {
          const isActive =
            pathname === link.path || pathname.startsWith(link.path + "/");

          return (
            <Link
              key={link.path}
              href={link.path}
              className={`transition-colors ${
                isActive
                  ? "text-gray-900 font-semibold"
                  : "text-gray-600 hover:text-primary"
              }`}
            >
              {link.name}
            </Link>
          );
        })}

        {/* User Guide Button */}
        <button
          onClick={() => setShowGuide(true)}
          className="text-gray-600 hover:text-primary transition-colors font-medium"
        >
          User Guide
        </button>

        {/* Wallet Connect Button (Client-side only) */}
        <WalletConnectButton />

        {/* Notifications */}
        <NotificationBell />

        {/* User Menu with Role Switcher */}
        <UserMenu />
      </div>

      {/* Mobile Menu Toggle */}
      <button
        className="md:hidden cursor-pointer"
        aria-label="Menu"
        onClick={() => setOpen(!open)}
      >
        <Image
          src={open ? assets.close_icon : assets.menu_icon}
          alt="Menu"
          width={24}
          height={24}
        />
      </button>

      {/* Mobile Drawer */}
      <nav
        className={`md:hidden fixed top-16 right-0 h-screen w-full border-t border-borderColor
        flex flex-col items-start gap-4 p-4 transition-all duration-300 z-50 bg-white
        ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        {displayLinks.map(link => {
          const isActive =
            pathname === link.path || pathname.startsWith(link.path + "/");

          return (
            <Link
              key={link.path}
              href={link.path}
              onClick={() => setOpen(false)}
              className={`transition-colors ${
                isActive ? "text-gray-900 font-semibold" : "text-gray-600"
              }`}
            >
              {link.name}
            </Link>
          );
        })}

        {/* Mobile User Guide Button */}
        <button
          onClick={() => {
            setShowGuide(true);
            setOpen(false);
          }}
          className="text-gray-600 font-medium"
        >
          User Guide
        </button>

        {/* Mobile Wallet Connect (Client-side only) */}
        <div onClick={() => setOpen(false)}>
          <WalletConnectButton compact />
        </div>

        {/* Mobile User Menu */}
        <div onClick={() => setOpen(false)}>
          <UserMenu />
        </div>
      </nav>

      {/* User Guide Modal */}
      <UserGuideModal isOpen={showGuide} onClose={() => setShowGuide(false)} />
    </nav>
  );
}
