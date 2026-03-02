"use client";

import { useAccount, useConnect, useDisconnect } from "wagmi";
import { Button } from "@/components/ui";

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
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  const handleConnect = () => {
    const connector = connectors[0];
    if (connector) {
      connect({ connector }, {
        onSuccess: (data) => {
          onConnect?.(data.accounts[0]);
        },
      });
    }
  };

  const handleDisconnect = () => {
    disconnect();
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
      <Button onClick={handleConnect} isLoading={isPending}>
        {isPending ? "Connecting..." : "Connect Wallet"}
      </Button>
    </div>
  );
}
