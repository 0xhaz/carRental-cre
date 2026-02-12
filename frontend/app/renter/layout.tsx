"use client";

import { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { renterMenuLinks } from '@/public/assets/assets';
import { RoleSwitcher, ProtectedRoute } from '@/src/components/shared';
import { UserRole } from '@/src/types';

export default function RenterLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <ProtectedRoute allowedRoles={[UserRole.RENTER]}>
      <div className="min-h-screen bg-gray-50">
        {/* Renter-specific layout */}
        <nav className="bg-white shadow-sm border-b">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold text-purple-600">Renter Portal</h1>
              <div className="flex items-center gap-6">
                {renterMenuLinks.map((link) => {
                  const isActive = pathname === link.path;
                  return (
                    <Link
                      key={link.path}
                      href={link.path}
                      className={`transition-colors ${
                        isActive
                          ? 'text-purple-600 font-semibold'
                          : 'text-gray-600 hover:text-purple-600'
                      }`}
                    >
                      {link.name}
                    </Link>
                  );
                })}
                <RoleSwitcher />
              </div>
            </div>
          </div>
        </nav>
        <main>{children}</main>
      </div>
    </ProtectedRoute>
  );
}
