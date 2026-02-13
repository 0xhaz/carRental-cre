"use client";

import { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { rentorMenuLinks } from '@/constants/menuLinks';
import { RoleSwitcher, ProtectedRoute } from '@/components/shared';
import { UserRole } from '@/types';

export default function RentorLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <ProtectedRoute allowedRoles={[UserRole.RENTOR]}>
      <div className="min-h-screen bg-gray-50">
        {/* Rentor-specific layout */}
        <nav className="bg-white shadow-sm border-b">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold text-green-600">Rentor Portal</h1>
              <div className="flex items-center gap-6">
                {rentorMenuLinks.map((link) => {
                  const isActive = pathname === link.path;
                  return (
                    <Link
                      key={link.path}
                      href={link.path}
                      className={`transition-colors ${
                        isActive
                          ? 'text-green-600 font-semibold'
                          : 'text-gray-600 hover:text-green-600'
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
