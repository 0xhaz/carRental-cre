"use client";

/**
 * Wallet Connect Component
 * Handles wallet connection with multiple providers
 */

import { useAccount, useConnect, useDisconnect, useChainId } from "wagmi";
import { useEffect, useState } from "react";
import { SEPOLIA_CHAIN_ID } from "@/constants";

export function WalletConnect() {
  const { address, isConnected, connector } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const [isClient, setIsClient] = useState(false);

  // Handle hydration
  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return null;
  }

  // Wrong network warning
  const isWrongNetwork = isConnected && chainId !== SEPOLIA_CHAIN_ID;

  if (isConnected) {
    return (
      <div className="flex flex-col gap-2">
        {isWrongNetwork && (
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-2 rounded">
            ⚠️ Please switch to Sepolia network
          </div>
        )}
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <span className="text-sm text-gray-600">Connected with {connector?.name}</span>
            <span className="font-mono text-sm">
              {address?.slice(0, 6)}...{address?.slice(-4)}
            </span>
          </div>
          <button
            onClick={() => disconnect()}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
          >
            Disconnect
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-lg font-semibold">Connect Your Wallet</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {connectors.map((connector) => (
          <button
            key={connector.id}
            onClick={() => connect({ connector })}
            disabled={isPending}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-primary hover:bg-primary-dull text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {getConnectorIcon(connector.name)}
            <span>{connector.name}</span>
          </button>
        ))}
      </div>
      <p className="text-sm text-gray-600 mt-2">
        By connecting, you agree to our Terms of Service
      </p>
    </div>
  );
}

/**
 * Simple connector icons (replace with actual icons/images)
 */
function getConnectorIcon(name: string) {
  const icons: Record<string, string> = {
    MetaMask: "🦊",
    WalletConnect: "🔗",
    "Coinbase Wallet": "💼",
    Injected: "🔌",
  };
  return <span className="text-xl">{icons[name] || "💳"}</span>;
}
