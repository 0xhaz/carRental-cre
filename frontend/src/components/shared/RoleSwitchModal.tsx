"use client";

import { useRouter } from "next/navigation";
import { Button, Heading, Paragraph } from "@/components/ui";
import { useUserStore } from "@/store";
import { UserRole } from "@/types";
import { toast } from "react-hot-toast";

interface RoleSwitchModalProps {
  targetRole: UserRole;
  targetRoute: string;
  onClose: () => void;
  title?: string;
  message?: string;
}

export function RoleSwitchModal({
  targetRole,
  targetRoute,
  onClose,
  title = "Switch Role Required",
  message = "To access this feature, you need to switch to a different role.",
}: RoleSwitchModalProps) {
  const router = useRouter();
  const { user, setUser } = useUserStore();

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case UserRole.INVESTOR:
        return "Investor";
      case UserRole.RENTOR:
        return "Rentor";
      case UserRole.RENTER:
        return "Renter";
      default:
        return role;
    }
  };

  const handleConfirm = () => {
    if (!user) return;

    // Update user role
    setUser({ ...user, role: targetRole });

    toast.success(`Switched to ${getRoleLabel(targetRole)} role`);

    // Navigate to target route
    router.push(targetRoute);

    // Close modal
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        {/* Header */}
        <div className="mb-4">
          <Heading as="h2" className="mb-2">
            {title}
          </Heading>
          <Paragraph className="text-gray-600">{message}</Paragraph>
        </div>

        {/* Role Switch Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Current Role:</span>
            <span className="font-semibold text-gray-900">
              {user?.role ? getRoleLabel(user.role) : "Unknown"}
            </span>
          </div>
          <div className="flex items-center justify-center my-2">
            <span className="text-blue-600">↓</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Switch To:</span>
            <span className="font-semibold text-blue-600">{getRoleLabel(targetRole)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleConfirm} className="flex-1">
            Switch & Continue
          </Button>
        </div>
      </div>
    </div>
  );
}
