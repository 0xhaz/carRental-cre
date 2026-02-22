"use client";

import { useState, useEffect } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { Button } from "@/components/ui";

interface WalletConnectButtonProps {
  compact?: boolean;
}

export function WalletConnectButton({ compact = false }: WalletConnectButtonProps) {
  const [mounted, setMounted] = useState(false);
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render until client-side hydration is complete
  if (!mounted) {
    return (
      <div className={compact ? "h-10" : "h-10 w-32"}>
        {/* Placeholder to prevent layout shift */}
      </div>
    );
  }

  // Get MetaMask connector (injected)
  const metaMaskConnector = connectors.find((c) => c.id === "injected" || c.id === "metaMask");

  if (isConnected && address) {
    return (
      <Button
        onClick={() => disconnect()}
        variant="outline"
        size={compact ? "default" : "default"}
        className={compact ? "" : ""}
      >
        {address.slice(0, 6)}...{address.slice(-4)}
      </Button>
    );
  }

  return (
    <Button
      onClick={() => metaMaskConnector && connect({ connector: metaMaskConnector })}
      size={compact ? "default" : "default"}
      className={compact ? "" : ""}
    >
      Connect Wallet
    </Button>
  );
}
