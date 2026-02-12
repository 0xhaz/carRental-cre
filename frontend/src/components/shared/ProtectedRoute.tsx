"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useUserStore } from "@/src/store";
import { UserRole } from "@/src/types";
import { toast } from "react-hot-toast";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
  redirectTo?: string;
}

export function ProtectedRoute({
  children,
  allowedRoles,
  redirectTo = "/",
}: ProtectedRouteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useUserStore();

  useEffect(() => {
    // If no user, redirect to home
    if (!user) {
      toast.error("Please login to access this page");
      router.push("/");
      return;
    }

    // If user doesn't have an allowed role, redirect silently
    if (user.role && !allowedRoles.includes(user.role)) {
      // Redirect to appropriate portal based on current role (no error toast)
      switch (user.role) {
        case UserRole.INVESTOR:
          router.push("/investor/dashboard");
          break;
        case UserRole.RENTOR:
          router.push("/rentor/dashboard");
          break;
        case UserRole.RENTER:
          router.push("/renter/browse");
          break;
        default:
          router.push(redirectTo);
      }
    }
  }, [user, allowedRoles, router, redirectTo, pathname]);

  // If user doesn't have permission, don't render children
  if (!user || (user.role && !allowedRoles.includes(user.role))) {
    return null;
  }

  return <>{children}</>;
}
