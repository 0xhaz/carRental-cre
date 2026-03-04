"use client";

import { useWorldID } from "@/hooks/useWorldID";
import { Button, Badge } from "@/components/ui";
import { ShieldCheck, Globe, Loader2, Smartphone } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

const WORLD_APP_ID = process.env.NEXT_PUBLIC_WORLD_APP_ID || "";
const WORLD_MINI_APP_URL = `https://worldcoin.org/mini-app?app_id=${WORLD_APP_ID}`;

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

  // Not running inside World App — show QR code to open in World App
  if (!isMiniApp) {
    return (
      <div className={className}>
        <div className="p-6 bg-gradient-to-b from-blue-50 to-white border border-blue-200 rounded-xl">
          <div className="flex items-center gap-2 mb-4">
            <Globe size={20} className="text-blue-600" />
            <p className="text-sm font-semibold text-blue-800">
              World ID Verification
            </p>
          </div>

          <div className="flex flex-col items-center gap-4">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <QRCodeSVG
                value={WORLD_MINI_APP_URL}
                size={180}
                level="M"
                includeMargin={false}
              />
            </div>

            <div className="text-center space-y-2">
              <div className="flex items-center justify-center gap-2 text-sm font-medium text-gray-800">
                <Smartphone size={16} />
                Scan with your phone camera
              </div>
              <p className="text-xs text-gray-500 max-w-[280px]">
                This opens RegShield inside the World App where you can verify
                your identity with zero-knowledge proof for Sybil resistance.
              </p>
            </div>

            <div className="w-full pt-3 border-t border-gray-100">
              <div className="flex items-center gap-3 text-xs text-gray-400">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  Scan QR
                </div>
                <span>&rarr;</span>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                  Open World App
                </div>
                <span>&rarr;</span>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                  Verify Identity
                </div>
              </div>
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
