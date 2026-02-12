"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, Skeleton } from "@/src/components/ui";
import { formatCurrency } from "@/src/lib/utils";

export interface TokenBalanceProps {
  tokenSymbol?: string;
  tokenName?: string;
  className?: string;
}

export function TokenBalance({
  tokenSymbol = "AST",
  tokenName = "Asset Token",
  className,
}: TokenBalanceProps) {
  const [balance, setBalance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate fetching token balance
    const fetchBalance = async () => {
      setIsLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Generate random mock balance
      const mockBalance = Math.floor(Math.random() * 10000);
      setBalance(mockBalance);
      setIsLoading(false);
    };

    fetchBalance();
  }, []);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-6 w-32" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardContent className="p-4">
        <p className="text-sm text-gray-600 mb-1">{tokenName}</p>
        <div className="flex items-baseline gap-2">
          <p className="text-2xl font-bold">
            {balance?.toLocaleString() || "0"}
          </p>
          <span className="text-sm text-gray-500">{tokenSymbol}</span>
        </div>
      </CardContent>
    </Card>
  );
}

export interface MultiTokenBalanceProps {
  tokens: Array<{
    symbol: string;
    name: string;
    balance?: number;
  }>;
  className?: string;
}

export function MultiTokenBalance({ tokens, className }: MultiTokenBalanceProps) {
  return (
    <div className={className}>
      <h3 className="text-lg font-semibold mb-4">Token Balances</h3>
      <div className="grid gap-4 md:grid-cols-2">
        {tokens.map((token) => (
          <Card key={token.symbol}>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600 mb-1">{token.name}</p>
              <div className="flex items-baseline gap-2">
                <p className="text-xl font-bold">
                  {token.balance?.toLocaleString() || "0"}
                </p>
                <span className="text-sm text-gray-500">{token.symbol}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
