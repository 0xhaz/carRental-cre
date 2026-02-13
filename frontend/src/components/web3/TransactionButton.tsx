"use client";

import { useState } from "react";
import { Button, ButtonProps } from "@/components/ui";
import { sleep } from "@/lib/utils";
import { toast } from "react-hot-toast";

export interface TransactionButtonProps extends Omit<ButtonProps, "onClick"> {
  onClick: () => Promise<void> | void;
  loadingText?: string;
  successText?: string;
  errorText?: string;
}

export function TransactionButton({
  onClick,
  loadingText = "Processing transaction...",
  successText = "Transaction successful!",
  errorText = "Transaction failed",
  children,
  ...props
}: TransactionButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    setIsLoading(true);

    try {
      // Simulate transaction delay (1-3 seconds)
      const delay = 1000 + Math.random() * 2000;
      await sleep(delay);

      // Call the actual onClick handler
      await onClick();

      // Simulate 10% transaction failure rate
      if (Math.random() < 0.1) {
        throw new Error("Mock transaction failed");
      }

      // Generate mock transaction hash
      const mockTxHash = `0x${Math.random().toString(16).slice(2)}`;

      toast.success(
        <div>
          <p>{successText}</p>
          <p className="text-xs mt-1">Tx: {mockTxHash.slice(0, 10)}...</p>
        </div>
      );
    } catch (error) {
      console.error("Transaction error:", error);
      toast.error(errorText);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button onClick={handleClick} isLoading={isLoading} {...props}>
      {isLoading ? loadingText : children}
    </Button>
  );
}
