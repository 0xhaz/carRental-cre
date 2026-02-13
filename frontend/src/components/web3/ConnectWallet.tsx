"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { generateMockAddress } from "@/lib/utils";
import { toast } from "react-hot-toast";

export interface ConnectWalletProps {
  onConnect?: (address: string) => void;
  onDisconnect?: () => void;
  className?: string;
}

export function ConnectWallet({
  onConnect,
  onDisconnect,
  className,
}: ConnectWalletProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
    setIsConnecting(true);

    // Simulate wallet connection delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const mockAddress = generateMockAddress();
    setAddress(mockAddress);
    setIsConnected(true);
    setIsConnecting(false);

    toast.success("Wallet connected (mock)");
    onConnect?.(mockAddress);
  };

  const handleDisconnect = () => {
    setAddress(null);
    setIsConnected(false);
    toast.success("Wallet disconnected");
    onDisconnect?.();
  };

  if (isConnected && address) {
    return (
      <div className={className}>
        <Button variant="outline" onClick={handleDisconnect}>
          {address.slice(0, 6)}...{address.slice(-4)}
        </Button>
      </div>
    );
  }

  return (
    <div className={className}>
      <Button onClick={handleConnect} isLoading={isConnecting}>
        {isConnecting ? "Connecting..." : "Connect Wallet"}
      </Button>
    </div>
  );
}
