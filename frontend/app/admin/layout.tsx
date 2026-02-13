"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/store";
import { Header } from "@/components/shared";
import Link from "next/link";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useUserStore();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Check if user is admin
    if (!isLoading) {
      if (!isAuthenticated || user?.role !== "admin") {
        router.push("/");
      } else {
        setIsChecking(false);
      }
    }
  }, [isAuthenticated, user, isLoading, router]);

  // Show loading state while checking authentication
  if (isLoading || isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Only render admin content if user is admin
  if (user?.role !== "admin") {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <Link href="/admin" className="text-xl font-bold text-primary">
                RegShield Admin
              </Link>
              <nav className="hidden md:flex gap-6">
                <Link
                  href="/admin/kyc"
                  className="text-gray-700 hover:text-primary transition-colors"
                >
                  KYC Management
                </Link>
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                Admin: <span className="font-medium">{user?.name}</span>
              </span>
              <Link
                href="/"
                className="text-sm text-primary hover:text-primary-dull transition-colors"
              >
                Exit Admin
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="min-h-[calc(100vh-4rem)]">{children}</main>
    </div>
  );
}
