"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/src/store";
import { useAppContext } from "@/context/AppContext";
import { UserRole } from "@/src/types";
import { Button } from "@/src/components/ui";
import { toast } from "react-hot-toast";

export function UserMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Use both stores during migration
  const { user: zustandUser, logout: zustandLogout } = useUserStore();
  const { user: contextUser, logout: contextLogout, setShowLogin, axios } = useAppContext();

  // Prefer Zustand user if available
  const user = zustandUser || contextUser;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

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

  const handleRoleChange = async (newRole: UserRole) => {
    try {
      const { data } = await axios.post("/api/user/update-role", { role: newRole });

      if (data.success) {
        // Update user in Zustand store
        const { setUser } = useUserStore.getState();
        setUser(data.user);

        toast.success(`Role switched to ${newRole}`);
        setIsOpen(false);

        // Redirect to appropriate portal
        switch (newRole) {
          case UserRole.INVESTOR:
            router.push("/investor/dashboard");
            break;
          case UserRole.RENTOR:
            router.push("/rentor/dashboard");
            break;
          case UserRole.RENTER:
            router.push("/renter/browse");
            break;
        }
      } else {
        toast.error(data.message || "Failed to switch role");
      }
    } catch (error) {
      console.error("Error switching role:", error);
      toast.error("Failed to switch role");
    }
  };

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case UserRole.INVESTOR:
        return "bg-blue-100 text-blue-700";
      case UserRole.RENTOR:
        return "bg-green-100 text-green-700";
      case UserRole.RENTER:
        return "bg-purple-100 text-purple-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const roleOptions = [
    { value: UserRole.RENTER, label: "Renter", description: "Book vehicles" },
    { value: UserRole.INVESTOR, label: "Investor", description: "Invest in vehicles" },
    { value: UserRole.RENTOR, label: "Rentor", description: "List vehicles" },
  ];

  // If not logged in, show login button
  if (!user) {
    return (
      <Button onClick={() => setShowLogin(true)}>
        Login
      </Button>
    );
  }

  // If logged in, show user menu dropdown
  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
      >
        {/* User Avatar */}
        <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-semibold">
          {user.name?.charAt(0).toUpperCase() || "U"}
        </div>

        {/* User Info - Desktop only */}
        <div className="hidden md:block text-left">
          <p className="text-sm font-medium text-gray-900">{user.name}</p>
          {user.role && (
            <p className={`text-xs px-2 py-0.5 rounded-full inline-block ${getRoleBadgeColor(user.role)}`}>
              {user.role}
            </p>
          )}
        </div>

        {/* Dropdown Arrow */}
        <svg
          className={`w-4 h-4 text-gray-600 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
          {/* User Info Section */}
          <div className="px-4 py-3 border-b border-gray-200">
            <p className="text-sm font-semibold text-gray-900">{user.name}</p>
            <p className="text-xs text-gray-500">{user.email}</p>
            {user.role && (
              <span className={`inline-block mt-2 text-xs px-2 py-1 rounded-full ${getRoleBadgeColor(user.role)}`}>
                Current Role: {user.role}
              </span>
            )}
          </div>

          {/* Role Switcher Section */}
          <div className="px-4 py-3 border-b border-gray-200">
            <p className="text-xs font-semibold text-gray-600 uppercase mb-2">Switch Role</p>
            <div className="space-y-2">
              {roleOptions.map((roleOption) => (
                <button
                  key={roleOption.value}
                  onClick={() => handleRoleChange(roleOption.value)}
                  disabled={user.role === roleOption.value}
                  className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                    user.role === roleOption.value
                      ? "bg-gray-100 cursor-not-allowed opacity-50"
                      : "hover:bg-gray-50"
                  }`}
                >
                  <p className="text-sm font-medium text-gray-900">{roleOption.label}</p>
                  <p className="text-xs text-gray-500">{roleOption.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Logout Button */}
          <div className="px-4 py-2">
            <button
              onClick={handleLogout}
              className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
