"use client";

import { useState } from "react";
import { Card, CardContent, Badge, Button, Separator } from "@/components/ui";
import { ExplorerLink } from "@/components/web3";
import { formatCurrency } from "@/lib/utils";
import { Investment } from "@/types";

type TransactionType = "investment" | "revenue_claim";

interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  amountEth?: number;
  vehicleName: string;
  timestamp: number;
  txHash?: string;
  status: "pending" | "confirmed" | "cancelled";
}

interface TransactionItemProps {
  transaction: Transaction;
}

function TransactionItem({ transaction }: TransactionItemProps) {
  const getTypeIcon = (type: TransactionType) => {
    switch (type) {
      case "investment":
        return "💰";
      case "revenue_claim":
        return "🎁";
      default:
        return "📝";
    }
  };

  const getTypeColor = (type: TransactionType) => {
    switch (type) {
      case "investment":
        return "text-blue-600 bg-blue-50";
      case "revenue_claim":
        return "text-green-600 bg-green-50";
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
      case "cancelled":
        return <Badge variant="error">Cancelled</Badge>;
    }
  };

  const getTypeLabel = (type: TransactionType) => {
    switch (type) {
      case "investment":
        return "Investment";
      case "revenue_claim":
        return "Revenue Claim";
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

  return (
    <div className="border-b border-gray-200 last:border-0 py-4 hover:bg-gray-50 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4 flex-1">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl shrink-0 ${getTypeColor(transaction.type)}`}>
            {getTypeIcon(transaction.type)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold text-gray-900">{getTypeLabel(transaction.type)}</h4>
              {getStatusBadge(transaction.status)}
            </div>
            <p className="text-sm text-gray-600 mb-1">{transaction.vehicleName}</p>
            <p className="text-xs text-gray-500">{formatDate(transaction.timestamp)}</p>
            {transaction.txHash && (
              <div className="mt-2">
                <ExplorerLink value={transaction.txHash} type="tx" label="View on Etherscan" className="text-xs" />
              </div>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className={`text-lg font-bold ${transaction.type === "revenue_claim" ? "text-green-600" : "text-blue-600"}`}>
            {transaction.type === "revenue_claim" ? "+" : ""}{formatCurrency(transaction.amount)}
          </p>
          {transaction.amountEth !== undefined && transaction.amountEth > 0 && (
            <p className="text-xs text-gray-500">{transaction.amountEth} ETH</p>
          )}
        </div>
      </div>
    </div>
  );
}

/** Build transaction list from real investment records */
function buildTransactions(investments: Investment[]): Transaction[] {
  const transactions: Transaction[] = [];

  for (const inv of investments) {
    const v = inv.vehicle as any;
    const vehicleName =
      v && typeof v === "object"
        ? `${v.brand || "Vehicle"} ${v.model || ""}`.trim()
        : "Vehicle";

    // Investment transaction
    transactions.push({
      id: `inv-${inv._id}`,
      type: "investment",
      amount: inv.amount,
      amountEth: (inv as any).amountEth,
      vehicleName,
      timestamp: new Date(inv.investedAt).getTime(),
      txHash: (inv as any).txHash,
      status:
        inv.status === "cancelled"
          ? "cancelled"
          : inv.status === "pending"
            ? "pending"
            : "confirmed",
    });

    // Revenue earned (if any)
    if (inv.totalRevenueEarned > 0) {
      transactions.push({
        id: `rev-${inv._id}`,
        type: "revenue_claim",
        amount: inv.totalRevenueEarned,
        vehicleName,
        timestamp: inv.lastDistribution
          ? new Date(inv.lastDistribution).getTime()
          : new Date(inv.investedAt).getTime() + 86400000,
        status: "confirmed",
      });
    }
  }

  return transactions.sort((a, b) => b.timestamp - a.timestamp);
}

export interface TransactionHistoryProps {
  investments?: Investment[];
  className?: string;
  limit?: number;
}

export function TransactionHistory({ investments = [], className, limit }: TransactionHistoryProps) {
  const [filterType, setFilterType] = useState<TransactionType | "all">("all");
  const [showAll, setShowAll] = useState(false);

  const allTransactions = buildTransactions(investments);

  const filteredTransactions =
    filterType === "all"
      ? allTransactions
      : allTransactions.filter((tx) => tx.type === filterType);

  const displayedTransactions =
    limit && !showAll
      ? filteredTransactions.slice(0, limit)
      : filteredTransactions;

  const hasMore = limit && filteredTransactions.length > limit && !showAll;

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
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Transaction History</h2>
            <Badge variant="default">
              {filteredTransactions.length} {filteredTransactions.length === 1 ? "Transaction" : "Transactions"}
            </Badge>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2">
            {(["all", "investment", "revenue_claim"] as const).map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  filterType === type
                    ? "bg-primary text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {type === "all" ? "All" : type === "investment" ? "Investments" : "Revenue Claims"}
              </button>
            ))}
          </div>
        </div>

        <Separator className="mb-4" />

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

        {hasMore && (
          <div className="mt-6 text-center">
            <Button onClick={() => setShowAll(true)} variant="outline">
              Show All ({filteredTransactions.length} transactions)
            </Button>
          </div>
        )}

        {allTransactions.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-xs text-gray-600 mb-1">Total Investments</p>
                <p className="text-lg font-bold text-blue-600">
                  {allTransactions.filter((tx) => tx.type === "investment" && tx.status !== "cancelled").length}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-600 mb-1">Total Invested</p>
                <p className="text-lg font-bold text-blue-600">
                  {formatCurrency(
                    allTransactions
                      .filter((tx) => tx.type === "investment" && tx.status !== "cancelled")
                      .reduce((sum, tx) => sum + tx.amount, 0)
                  )}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-600 mb-1">Total Revenue</p>
                <p className="text-lg font-bold text-green-600">
                  {formatCurrency(
                    allTransactions
                      .filter((tx) => tx.type === "revenue_claim")
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
