"use client";

import { useState, FormEvent } from "react";
import { Card, Button, Input } from "@/components/ui";
import { toast } from "react-hot-toast";

export interface TransferTokensModalProps {
  onClose: () => void;
}

export function TransferTokensModal({ onClose }: TransferTokensModalProps) {
  const [recipientAddress, setRecipientAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Mock token balance
  const balance = 10000; // RST tokens

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate inputs
      if (!recipientAddress || !amount) {
        toast.error("Please fill in all fields");
        return;
      }

      const transferAmount = parseFloat(amount);
      if (isNaN(transferAmount) || transferAmount <= 0) {
        toast.error("Please enter a valid amount");
        return;
      }

      if (transferAmount > balance) {
        toast.error("Insufficient balance");
        return;
      }

      // Validate Ethereum address format (basic check)
      if (!recipientAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
        toast.error("Invalid wallet address format");
        return;
      }

      // Simulate token transfer (mock implementation)
      await new Promise((resolve) => setTimeout(resolve, 2000));

      toast.success(
        `Successfully transferred ${transferAmount} RST tokens to ${recipientAddress.slice(0, 6)}...${recipientAddress.slice(-4)}`
      );
      onClose();
    } catch (error) {
      console.error("Transfer error:", error);
      toast.error("Transfer failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackdropClick = () => {
    if (!isLoading) {
      onClose();
    }
  };

  return (
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
    >
      <Card
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md p-8 relative"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isLoading}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 transition-colors disabled:opacity-50"
          aria-label="Close"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {/* Title */}
        <h2 className="text-2xl font-semibold text-center mb-2">
          Transfer <span className="text-blue-600">RST Tokens</span>
        </h2>
        <p className="text-sm text-gray-600 text-center mb-6">
          Send tokens to another wallet address
        </p>

        {/* Balance Display */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-gray-600">Available Balance</p>
          <p className="text-2xl font-bold text-blue-600">
            {balance.toLocaleString()} RST
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Recipient Wallet Address"
            type="text"
            placeholder="0x..."
            value={recipientAddress}
            onChange={(e) => setRecipientAddress(e.target.value)}
            required
            disabled={isLoading}
          />

          <div>
            <Input
              label="Amount (RST)"
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              disabled={isLoading}
              min="0"
              step="0.01"
            />
            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={() => setAmount((balance * 0.25).toString())}
                disabled={isLoading}
                className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded transition-colors disabled:opacity-50"
              >
                25%
              </button>
              <button
                type="button"
                onClick={() => setAmount((balance * 0.5).toString())}
                disabled={isLoading}
                className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded transition-colors disabled:opacity-50"
              >
                50%
              </button>
              <button
                type="button"
                onClick={() => setAmount((balance * 0.75).toString())}
                disabled={isLoading}
                className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded transition-colors disabled:opacity-50"
              >
                75%
              </button>
              <button
                type="button"
                onClick={() => setAmount(balance.toString())}
                disabled={isLoading}
                className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded transition-colors disabled:opacity-50"
              >
                Max
              </button>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-xs text-yellow-800">
              <strong>Note:</strong> This is a mock implementation. In production, this
              would interact with the blockchain via smart contracts.
            </p>
          </div>

          {/* Submit Button */}
          <Button type="submit" className="w-full" isLoading={isLoading}>
            {isLoading ? "Processing..." : "Transfer Tokens"}
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isLoading}
            className="w-full"
          >
            Cancel
          </Button>
        </form>
      </Card>
    </div>
  );
}
