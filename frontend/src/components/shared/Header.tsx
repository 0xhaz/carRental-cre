"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  assets,
  menuLinks,
  investorMenuLinks,
  rentorMenuLinks,
  renterMenuLinks,
} from "@/public/assets/assets";
import { useUserStore } from "@/src/store";
import { UserRole } from "@/src/types";
import { UserMenu } from "./UserMenu";
import { NotificationBell } from "./NotificationBell";
import { useAppContext } from "@/context/AppContext";

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

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

  return (
    <nav className="flex items-center justify-between px-6 md:px-16 lg:px-24 xl:px-32 py-4 text-gray-600 border-b border-borderColor relative transition-all bg-light">
      {/* Logo */}
      <Link href="/">
        <Image src={assets.logo} alt="RegShield Logo" className="h-8" />
      </Link>

      {/* Desktop Navigation */}
      <div className="hidden md:flex items-center gap-8">
        {navigationLinks.map(link => {
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

        {/* Search Input (Desktop) */}
        <div className="hidden lg:flex items-center text-sm gap-2 border border-borderColor px-3 rounded-full max-w-56">
          <input
            type="text"
            className="py-1.5 w-full bg-transparent outline-none placeholder-gray-500"
            placeholder="Search vehicles"
          />
          <Image src={assets.search_icon} alt="Search" />
        </div>

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
        <Image src={open ? assets.close_icon : assets.menu_icon} alt="Menu" />
      </button>

      {/* Mobile Drawer */}
      <nav
        className={`md:hidden fixed top-16 right-0 h-screen w-full border-t border-borderColor
        flex flex-col items-start gap-4 p-4 transition-all duration-300 z-50 bg-white
        ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        {navigationLinks.map(link => {
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

        {/* Mobile User Menu */}
        <div onClick={() => setOpen(false)}>
          <UserMenu />
        </div>
      </nav>
    </nav>
  );
}
