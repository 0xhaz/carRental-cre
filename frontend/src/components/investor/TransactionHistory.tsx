"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { formatUnits } from "viem";
import { Card, CardContent, Badge, Button, Separator } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";
import { useMyTotalInvestment, useMyInvestorRequest } from "@/hooks/useInvestment";

// Transaction types
type TransactionType = "investment" | "withdrawal" | "revenue_claim" | "token_transfer";

interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  vehicleId: string;
  vehicleName?: string;
  timestamp: number;
  txHash?: string;
  status: "pending" | "confirmed" | "failed";
  details?: string;
}

interface TransactionItemProps {
  transaction: Transaction;
}

/**
 * Individual Transaction Item
 */
function TransactionItem({ transaction }: TransactionItemProps) {
  const getTypeIcon = (type: TransactionType) => {
    switch (type) {
      case "investment":
        return "💰";
      case "withdrawal":
        return "↩️";
      case "revenue_claim":
        return "🎁";
      case "token_transfer":
        return "🔄";
      default:
        return "📝";
    }
  };

  const getTypeColor = (type: TransactionType) => {
    switch (type) {
      case "investment":
        return "text-blue-600 bg-blue-50";
      case "withdrawal":
        return "text-orange-600 bg-orange-50";
      case "revenue_claim":
        return "text-green-600 bg-green-50";
      case "token_transfer":
        return "text-purple-600 bg-purple-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  const getStatusBadge = (status: Transaction["status"]) => {
    switch (status) {
      case "confirmed":
        return <Badge variant="success">Confirmed</Badge>;
      case "pending":
        return <Badge variant="default">Pending</Badge>;
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
    }
  };

  const getTypeLabel = (type: TransactionType) => {
    switch (type) {
      case "investment":
        return "Investment";
      case "withdrawal":
        return "Withdrawal";
      case "revenue_claim":
        return "Revenue Claim";
      case "token_transfer":
        return "Token Transfer";
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const openBlockExplorer = () => {
    if (transaction.txHash) {
      // Sepolia Etherscan
      window.open(`https://sepolia.etherscan.io/tx/${transaction.txHash}`, "_blank");
    }
  };

  return (
    <div className="border-b border-gray-200 last:border-0 py-4 hover:bg-gray-50 transition-colors">
      <div className="flex items-start justify-between">
        {/* Left side - Icon, Type, Details */}
        <div className="flex items-start gap-4 flex-1">
          {/* Icon */}
          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${getTypeColor(transaction.type)}`}>
            {getTypeIcon(transaction.type)}
          </div>

          {/* Details */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold text-gray-900">{getTypeLabel(transaction.type)}</h4>
              {getStatusBadge(transaction.status)}
            </div>

            <p className="text-sm text-gray-600 mb-1">
              {transaction.vehicleName || `Vehicle #${transaction.vehicleId}`}
            </p>

            <p className="text-xs text-gray-500">
              {formatDate(transaction.timestamp)}
            </p>

            {transaction.details && (
              <p className="text-xs text-gray-500 mt-1">{transaction.details}</p>
            )}

            {/* Transaction Hash */}
            {transaction.txHash && (
              <button
                onClick={openBlockExplorer}
                className="text-xs text-blue-600 hover:text-blue-800 mt-2 flex items-center gap-1"
              >
                <span>View on Etherscan</span>
                <span>↗</span>
              </button>
            )}
          </div>
        </div>

        {/* Right side - Amount */}
        <div className="text-right">
          <p className={`text-lg font-bold ${
            transaction.type === "revenue_claim" || transaction.type === "withdrawal"
              ? "text-green-600"
              : "text-blue-600"
          }`}>
            {transaction.type === "revenue_claim" || transaction.type === "withdrawal" ? "+" : "-"}
            {formatCurrency(transaction.amount)}
          </p>
        </div>
      </div>
    </div>
  );
}

export interface TransactionHistoryProps {
  className?: string;
  limit?: number; // Limit number of transactions to show
}

/**
 * TransactionHistory Component
 * Displays investment transaction history with filtering and pagination
 */
export function TransactionHistory({ className, limit }: TransactionHistoryProps) {
  const { address: userAddress, isConnected } = useAccount();
  const { data: totalInvestment, isLoading: totalLoading } = useMyTotalInvestment();
  const { data: investorRequest, isLoading: requestLoading } = useMyInvestorRequest();
  const isLoading = totalLoading || requestLoading;

  const [filterType, setFilterType] = useState<TransactionType | "all">("all");
  const [showAll, setShowAll] = useState(false);

  // Transaction data will come from blockchain events in production.
  // For now, derive basic info from on-chain investment state.
  const generateMockTransactions = (): Transaction[] => {
    const transactions: Transaction[] = [];

    // If we have investment data, create a summary transaction entry
    if (totalInvestment && (totalInvestment as bigint) > BigInt(0)) {
      transactions.push({
        id: "inv-total",
        type: "investment",
        amount: Number(totalInvestment) / 1e18, // Convert wei to ETH
        vehicleId: "portfolio",
        vehicleName: "Portfolio Total",
        timestamp: Date.now() - 86400000,
        status: "confirmed",
        details: "Total portfolio investment (on-chain)",
      });
    }

    return transactions.sort((a, b) => b.timestamp - a.timestamp);
  };

  const allTransactions = generateMockTransactions();

  // Filter transactions
  const filteredTransactions =
    filterType === "all"
      ? allTransactions
      : allTransactions.filter((tx) => tx.type === filterType);

  // Apply limit
  const displayedTransactions = limit && !showAll
    ? filteredTransactions.slice(0, limit)
    : filteredTransactions;

  const hasMore = limit && filteredTransactions.length > limit && !showAll;

  // Wallet not connected
  if (!isConnected || !userAddress) {
    return (
      <Card className={className}>
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto flex items-center justify-center mb-4">
            <span className="text-3xl">🔌</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Connect Your Wallet</h3>
          <p className="text-sm text-gray-600">
            Connect your wallet to view transaction history
          </p>
        </CardContent>
      </Card>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-200 rounded w-1/3" />
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-4 py-4">
                <div className="w-12 h-12 bg-gray-200 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/3" />
                </div>
                <div className="h-6 bg-gray-200 rounded w-20" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // No transactions
  if (allTransactions.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto flex items-center justify-center mb-4">
            <span className="text-3xl">📜</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Transactions Yet</h3>
          <p className="text-sm text-gray-600">
            Your investment transactions will appear here
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardContent className="p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Transaction History</h2>
            <Badge variant="default">
              {filteredTransactions.length} {filteredTransactions.length === 1 ? "Transaction" : "Transactions"}
            </Badge>
          </div>

          {/* Filters */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {["all", "investment", "revenue_claim", "withdrawal", "token_transfer"].map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type as TransactionType | "all")}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  filterType === type
                    ? "bg-primary text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {type === "all" ? "All" : type.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}
              </button>
            ))}
          </div>
        </div>

        <Separator className="mb-4" />

        {/* Transactions List */}
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No transactions found for this filter</p>
          </div>
        ) : (
          <div className="space-y-0">
            {displayedTransactions.map((transaction) => (
              <TransactionItem key={transaction.id} transaction={transaction} />
            ))}
          </div>
        )}

        {/* Show More Button */}
        {hasMore && (
          <div className="mt-6 text-center">
            <Button onClick={() => setShowAll(true)} variant="outline">
              Show All ({filteredTransactions.length} transactions)
            </Button>
          </div>
        )}

        {/* Summary Stats */}
        {allTransactions.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-xs text-gray-600 mb-1">Total Investments</p>
                <p className="text-lg font-bold text-blue-600">
                  {allTransactions.filter(tx => tx.type === "investment").length}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-600 mb-1">Revenue Claims</p>
                <p className="text-lg font-bold text-green-600">
                  {allTransactions.filter(tx => tx.type === "revenue_claim").length}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-600 mb-1">Withdrawals</p>
                <p className="text-lg font-bold text-orange-600">
                  {allTransactions.filter(tx => tx.type === "withdrawal").length}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-600 mb-1">Total Earned</p>
                <p className="text-lg font-bold text-purple-600">
                  {formatCurrency(
                    allTransactions
                      .filter(tx => tx.type === "revenue_claim")
                      .reduce((sum, tx) => sum + tx.amount, 0)
                  )}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
