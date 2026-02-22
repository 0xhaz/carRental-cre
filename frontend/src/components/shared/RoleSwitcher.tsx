"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserRole } from "@/types";
import { useUserStore } from "@/store";
import { useAppContext } from "@/context/AppContext";
import { toast } from "react-hot-toast";

export function RoleSwitcher() {
  const router = useRouter();
  const { user, setUser, logout: zustandLogout } = useUserStore();
  const { logout: contextLogout } = useAppContext();
  const [isOpen, setIsOpen] = useState(false);

  if (!user) return null;

  const roles = [
    {
      role: UserRole.INVESTOR,
      label: "Investor",
      icon: "💰",
      route: "/investor/dashboard",
      description: "Invest & earn",
    },
    {
      role: UserRole.RENTOR,
      label: "Rentor",
      icon: "🚗",
      route: "/rentor/dashboard",
      description: "Manage fleet",
    },
    {
      role: UserRole.RENTER,
      label: "Renter",
      icon: "🔑",
      route: "/renter/browse",
      description: "Book vehicles",
    },
  ];

  const currentRoleData = roles.find((r) => r.role === user.role);

  const handleRoleChange = (newRole: UserRole, route: string) => {
    if (newRole === user.role) {
      setIsOpen(false);
      return;
    }

    // Update user role
    setUser({
      ...user,
      role: newRole,
      updatedAt: new Date(),
    });

    toast.success(`Switched to ${newRole} mode`);
    setIsOpen(false);

    // Navigate to the new portal
    router.push(route);
  };

  const handleLogout = () => {
    // Clear both stores
    zustandLogout();
    contextLogout();

    // Clear persisted Zustand storage
    localStorage.removeItem("regshield-user-storage");

    setIsOpen(false);
    router.push("/");
    toast.success("Logged out successfully");
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <span className="text-lg">{currentRoleData?.icon}</span>
        <div className="text-left hidden sm:block">
          <p className="text-sm font-semibold text-gray-900">
            {currentRoleData?.label}
          </p>
          <p className="text-xs text-gray-500">{currentRoleData?.description}</p>
        </div>
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
            <div className="p-2">
              <p className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
                Switch Role
              </p>
              {roles.map((roleData) => (
                <button
                  key={roleData.role}
                  onClick={() => handleRoleChange(roleData.role, roleData.route)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                    user.role === roleData.role
                      ? "bg-blue-50 text-blue-700"
                      : "hover:bg-gray-100 text-gray-700"
                  }`}
                >
                  <span className="text-xl">{roleData.icon}</span>
                  <div className="text-left flex-1">
                    <p className="text-sm font-medium">{roleData.label}</p>
                    <p className="text-xs text-gray-500">
                      {roleData.description}
                    </p>
                  </div>
                  {user.role === roleData.role && (
                    <svg
                      className="w-4 h-4 text-blue-600"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </button>
              ))}
            </div>

            <div className="border-t border-gray-200 p-2">
              <button
                onClick={() => {
                  setIsOpen(false);
                  router.push("/onboarding");
                }}
                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
              >
                View all roles
              </button>
              <button
                onClick={handleLogout}
                className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md font-medium"
              >
                Logout
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
