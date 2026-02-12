"use client";

import { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { investorMenuLinks } from '@/public/assets/assets';
import { RoleSwitcher, ProtectedRoute } from '@/src/components/shared';
import { UserRole } from '@/src/types';

export default function InvestorLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <ProtectedRoute allowedRoles={[UserRole.INVESTOR]}>
      <div className="min-h-screen bg-gray-50">
        {/* Investor-specific layout */}
        <nav className="bg-white shadow-sm border-b">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold text-blue-600">Investor Portal</h1>
              <div className="flex items-center gap-6">
                {investorMenuLinks.map((link) => {
                  const isActive = pathname === link.path;
                  return (
                    <Link
                      key={link.path}
                      href={link.path}
                      className={`transition-colors ${
                        isActive
                          ? 'text-blue-600 font-semibold'
                          : 'text-gray-600 hover:text-blue-600'
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
