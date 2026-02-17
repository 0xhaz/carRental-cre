"use client";

import { useWorldID } from "@/hooks/useWorldID";
import { Button, Badge } from "@/components/ui";
import { ShieldCheck, Globe, Loader2 } from "lucide-react";

interface WorldIDVerifyButtonProps {
  className?: string;
  onVerified?: () => void;
}

export function WorldIDVerifyButton({
  className,
  onVerified,
}: WorldIDVerifyButtonProps) {
  const {
    isMiniApp,
    isWorldIDVerified,
    isLoading,
    isVerifying,
    verifyError,
    verifyWithWorldID,
  } = useWorldID();

  const handleVerify = async () => {
    const success = await verifyWithWorldID();
    if (success && onVerified) {
      onVerified();
    }
  };

  if (isLoading) {
    return (
      <div className={className}>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 size={16} className="animate-spin" />
          Checking World ID status...
        </div>
      </div>
    );
  }

  // Already verified
  if (isWorldIDVerified) {
    return (
      <div className={className}>
        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
          <ShieldCheck size={20} className="text-green-600" />
          <div>
            <p className="text-sm font-medium text-green-800">
              World ID Verified
            </p>
            <p className="text-xs text-green-600">
              Proof of personhood confirmed
            </p>
          </div>
          <Badge variant="success" className="ml-auto">
            Verified
          </Badge>
        </div>
      </div>
    );
  }

  // Not running inside World App
  if (!isMiniApp) {
    return (
      <div className={className}>
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <Globe size={20} className="text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-800">
                World ID Verification
              </p>
              <p className="text-xs text-blue-600 mt-1">
                Open RegShield inside the World App to verify your identity with
                World ID for enhanced Sybil resistance.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Ready to verify (inside World App)
  return (
    <div className={className}>
      <div className="space-y-4">
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="flex items-start gap-3">
            <ShieldCheck size={20} className="text-primary mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-900">
                Verify with World ID
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Prove you are a unique human using World ID&apos;s
                zero-knowledge proof. This enhances platform security and
                prevents Sybil attacks.
              </p>
            </div>
          </div>
        </div>

        <Button
          onClick={handleVerify}
          disabled={isVerifying}
          className="w-full gap-2"
          size="lg"
        >
          {isVerifying ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Verifying...
            </>
          ) : (
            <>
              <ShieldCheck size={18} />
              Verify with World ID
            </>
          )}
        </Button>

        {verifyError && (
          <p className="text-sm text-red-600 text-center">{verifyError}</p>
        )}
      </div>
    </div>
  );
}
