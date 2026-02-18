"use client";

import { useRouter } from "next/navigation";
import { UserRole } from "@/types";
import { useUserStore } from "@/store";
import { useAppContext } from "@/context/AppContext";
import { toast } from "react-hot-toast";
import { useState } from "react";

export default function Onboarding() {
  const router = useRouter();
  const { setUser, user } = useUserStore();
  const { axios } = useAppContext();
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const roles = [
    {
      role: UserRole.INVESTOR,
      title: "Investor",
      description: "Invest in rental vehicles and earn passive income",
      color: "blue",
      icon: (
        <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      benefits: [
        "Low minimum investment",
        "Monthly revenue distributions",
        "Transparent returns",
      ],
      route: "/investor/dashboard",
    },
    {
      role: UserRole.RENTOR,
      title: "Rentor",
      description: "List your vehicles and raise capital through crowdfunding",
      color: "green",
      icon: (
        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      benefits: [
        "Access to capital",
        "Automated revenue sharing",
        "Scale your fleet",
      ],
      route: "/rentor/dashboard",
    },
    {
      role: UserRole.RENTER,
      title: "Renter",
      description: "Book vehicles for your travel needs",
      color: "purple",
      icon: (
        <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      benefits: [
        "Instant booking",
        "Transparent pricing",
        "Verified vehicles",
      ],
      route: "/renter/browse",
    },
  ];

  const handleRoleSelect = async (role: UserRole, route: string) => {
    if (isLoading) return;

    setSelectedRole(role);
    setIsLoading(true);

    try {
      // Call backend to update user role
      const { data } = await axios.post("/api/user/update-role", { role });

      if (data.success) {
        // Update local user state with the response from backend
        const updatedUser = {
          ...user,
          ...data.user,
          role: role,
          updatedAt: new Date(),
        };

        setUser(updatedUser);
        toast.success(`Welcome! You're now a ${role}`);

        // Redirect based on role
        setTimeout(() => {
          // For investor/rentor, go to verification wizard
          // For renter, go directly to browse
          if (role === UserRole.INVESTOR || role === UserRole.RENTOR || role === UserRole.RENTER) {
            router.push(`/verification?role=${role}`);
          } else {
            router.push(route);
          }
        }, 500);
      } else {
        toast.error(data.message || "Failed to update role");
        setSelectedRole(null);
      }
    } catch (error) {
      console.error("Error updating role:", error);
      toast.error("Failed to update role. Please try again.");
      setSelectedRole(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-4xl w-full mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Welcome to RegShield</h1>
          <p className="text-gray-600 text-lg">
            Choose your role to get started
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {roles.map((roleData) => (
            <button
              key={roleData.role}
              onClick={() => handleRoleSelect(roleData.role, roleData.route)}
              disabled={isLoading}
              className={`bg-white rounded-lg shadow-lg p-8 text-center hover:shadow-xl transition border-2
                ${selectedRole === roleData.role ? `border-${roleData.color}-500` : "border-transparent"}
                hover:border-${roleData.color}-500 cursor-pointer
                ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <div className={`w-16 h-16 bg-${roleData.color}-100 rounded-full flex items-center justify-center mx-auto mb-4`}>
                {roleData.icon}
              </div>
              <h3 className="text-xl font-bold mb-2">{roleData.title}</h3>
              <p className="text-gray-600 mb-4">{roleData.description}</p>
              <ul className="text-sm text-gray-600 space-y-2 text-left">
                {roleData.benefits.map((benefit, idx) => (
                  <li key={idx}>✓ {benefit}</li>
                ))}
              </ul>
            </button>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-sm text-gray-500">
            You can switch roles anytime from your profile settings
          </p>
        </div>
      </div>
    </div>
  );
}
