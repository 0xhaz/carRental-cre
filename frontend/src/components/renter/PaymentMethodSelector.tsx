"use client";

import { useState } from "react";
import { Card, CardContent, Input, Badge } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";

export type PaymentMethod = "offline" | "bank_transfer" | "crypto";

export interface CryptoPaymentDetails {
  selectedToken: "ETH" | "USDC" | "USDT" | "DAI";
  walletAddress?: string;
}

export interface BankTransferDetails {
  bankName: string;
  accountNumber: string;
  accountName: string;
}

export interface PaymentDetails {
  method: PaymentMethod;
  cryptoDetails?: CryptoPaymentDetails;
  bankDetails?: BankTransferDetails;
}

export interface PaymentMethodSelectorProps {
  totalAmount: number;
  onChange: (payment: PaymentDetails) => void;
}

export function PaymentMethodSelector({ totalAmount, onChange }: PaymentMethodSelectorProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [cryptoToken, setCryptoToken] = useState<CryptoPaymentDetails["selectedToken"]>("USDC");
  const [walletAddress, setWalletAddress] = useState("");
  const [bankDetails, setBankDetails] = useState<BankTransferDetails>({
    bankName: "",
    accountNumber: "",
    accountName: "",
  });

  const handleMethodSelect = (method: PaymentMethod) => {
    setSelectedMethod(method);

    if (method === "offline") {
      onChange({ method });
    } else if (method === "crypto") {
      onChange({
        method,
        cryptoDetails: {
          selectedToken: cryptoToken,
          walletAddress: walletAddress || undefined,
        },
      });
    } else if (method === "bank_transfer") {
      onChange({
        method,
        bankDetails,
      });
    }
  };

  const handleCryptoChange = (token: CryptoPaymentDetails["selectedToken"], wallet?: string) => {
    setCryptoToken(token);
    if (wallet !== undefined) setWalletAddress(wallet);

    onChange({
      method: "crypto",
      cryptoDetails: {
        selectedToken: token,
        walletAddress: wallet || walletAddress || undefined,
      },
    });
  };

  const handleBankDetailsChange = (field: keyof BankTransferDetails, value: string) => {
    const updated = { ...bankDetails, [field]: value };
    setBankDetails(updated);

    onChange({
      method: "bank_transfer",
      bankDetails: updated,
    });
  };

  // Mock exchange rates (in production, fetch from API)
  const exchangeRates = {
    ETH: 0.0005,
    USDC: totalAmount,
    USDT: totalAmount,
    DAI: totalAmount,
  };

  const cryptoAmount = exchangeRates[cryptoToken] || 0;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Select Payment Method</h3>
        <div className="grid grid-cols-1 gap-4">
          {/* Option 1: Offline Payment */}
          <Card
            className={`cursor-pointer transition-all ${
              selectedMethod === "offline"
                ? "border-2 border-primary bg-blue-50"
                : "border border-gray-300 hover:border-primary"
            }`}
            onClick={() => handleMethodSelect("offline")}
          >
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    selectedMethod === "offline"
                      ? "border-primary bg-primary"
                      : "border-gray-300"
                  }`}
                >
                  {selectedMethod === "offline" && (
                    <div className="w-3 h-3 bg-white rounded-full" />
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-semibold text-lg">💵 Cash / In-Person Payment</h4>
                    <Badge variant="default">Most Common</Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    Pay with cash or card when you pick up the vehicle. No online payment required.
                  </p>

                  {selectedMethod === "offline" && (
                    <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200">
                      <p className="text-sm font-medium mb-2">Payment Instructions:</p>
                      <ul className="text-sm text-gray-700 space-y-1 ml-4 list-disc">
                        <li>Bring the total amount of <strong>{formatCurrency(totalAmount)}</strong></li>
                        <li>Payment accepted: Cash, Credit/Debit Card</li>
                        <li>Present your driver's license and booking confirmation</li>
                        <li>Receipt will be provided upon payment</li>
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Option 2: Bank Transfer */}
          <Card
            className={`cursor-pointer transition-all ${
              selectedMethod === "bank_transfer"
                ? "border-2 border-primary bg-blue-50"
                : "border border-gray-300 hover:border-primary"
            }`}
            onClick={() => handleMethodSelect("bank_transfer")}
          >
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    selectedMethod === "bank_transfer"
                      ? "border-primary bg-primary"
                      : "border-gray-300"
                  }`}
                >
                  {selectedMethod === "bank_transfer" && (
                    <div className="w-3 h-3 bg-white rounded-full" />
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-semibold text-lg">🏦 Bank Transfer</h4>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    Transfer funds directly to the vehicle owner's bank account.
                  </p>

                  {selectedMethod === "bank_transfer" && (
                    <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200 space-y-4">
                      <div>
                        <p className="text-sm font-medium mb-2">Owner's Bank Details:</p>
                        <div className="bg-gray-50 p-3 rounded space-y-1">
                          <p className="text-sm">
                            <strong>Bank:</strong> First National Bank
                          </p>
                          <p className="text-sm">
                            <strong>Account Name:</strong> RegShield Holdings
                          </p>
                          <p className="text-sm">
                            <strong>Account Number:</strong> 1234-5678-9012-3456
                          </p>
                          <p className="text-sm">
                            <strong>Routing Number:</strong> 021000021
                          </p>
                          <p className="text-sm">
                            <strong>Amount:</strong> {formatCurrency(totalAmount)}
                          </p>
                        </div>
                      </div>

                      <div>
                        <p className="text-sm font-medium mb-3">Your Bank Details (for verification):</p>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-medium mb-1">Bank Name *</label>
                            <Input
                              type="text"
                              value={bankDetails.bankName}
                              onChange={(e) => handleBankDetailsChange("bankName", e.target.value)}
                              placeholder="First National Bank"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium mb-1">Account Number *</label>
                            <Input
                              type="text"
                              value={bankDetails.accountNumber}
                              onChange={(e) =>
                                handleBankDetailsChange("accountNumber", e.target.value)
                              }
                              placeholder="1234-5678-9012"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium mb-1">Account Holder Name *</label>
                            <Input
                              type="text"
                              value={bankDetails.accountName}
                              onChange={(e) => handleBankDetailsChange("accountName", e.target.value)}
                              placeholder="John Doe"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                        </div>

                        <p className="text-xs text-gray-500 mt-3">
                          ⚠️ Please include your booking reference in the transfer memo/notes
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Option 3: Crypto Payment */}
          <Card
            className={`cursor-pointer transition-all ${
              selectedMethod === "crypto"
                ? "border-2 border-primary bg-blue-50"
                : "border border-gray-300 hover:border-primary"
            }`}
            onClick={() => handleMethodSelect("crypto")}
          >
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    selectedMethod === "crypto"
                      ? "border-primary bg-primary"
                      : "border-gray-300"
                  }`}
                >
                  {selectedMethod === "crypto" && (
                    <div className="w-3 h-3 bg-white rounded-full" />
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-semibold text-lg">₿ Cryptocurrency Payment</h4>
                    <Badge variant="success">On-Chain</Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    Pay with USDC, USDT, DAI, or ETH on Ethereum network. Instant and secure.
                  </p>

                  {selectedMethod === "crypto" && (
                    <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200 space-y-4">
                      {/* Token Selection */}
                      <div>
                        <p className="text-sm font-medium mb-3">Select Token:</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {(["ETH", "USDC", "USDT", "DAI"] as const).map((token) => (
                            <button
                              key={token}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCryptoChange(token);
                              }}
                              className={`p-3 rounded-lg border-2 transition-colors ${
                                cryptoToken === token
                                  ? "border-primary bg-primary text-white"
                                  : "border-gray-200 hover:border-primary"
                              }`}
                            >
                              <p className="font-semibold text-sm">{token}</p>
                              <p className="text-xs mt-1">
                                {token === "ETH"
                                  ? cryptoAmount.toFixed(6)
                                  : cryptoAmount.toFixed(2)}
                              </p>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Payment Info */}
                      <div className="bg-gray-50 p-4 rounded space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Amount (USD):</span>
                          <span className="font-semibold">{formatCurrency(totalAmount)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Amount ({cryptoToken}):</span>
                          <span className="font-semibold">
                            {cryptoToken === "ETH"
                              ? cryptoAmount.toFixed(6)
                              : cryptoAmount.toFixed(2)}{" "}
                            {cryptoToken}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Network:</span>
                          <span className="font-semibold">Ethereum (Sepolia Testnet)</span>
                        </div>
                      </div>

                      {/* Wallet Address (Optional) */}
                      <div>
                        <label className="block text-xs font-medium mb-1">
                          Your Wallet Address (Optional)
                        </label>
                        <Input
                          type="text"
                          value={walletAddress}
                          onChange={(e) => {
                            handleCryptoChange(cryptoToken, e.target.value);
                          }}
                          placeholder="0x..."
                          onClick={(e) => e.stopPropagation()}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          If provided, payment will be sent from this address
                        </p>
                      </div>

                      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                        <p className="text-xs text-yellow-800">
                          <strong>⚡ Note:</strong> Smart contract payment will be triggered on confirmation.
                          Make sure you have sufficient {cryptoToken} in your wallet.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Selected Payment Summary */}
      {selectedMethod && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <p className="text-sm text-green-800">
              ✅ <strong>Payment Method Selected:</strong>{" "}
              {selectedMethod === "offline"
                ? "Cash/In-Person"
                : selectedMethod === "bank_transfer"
                ? "Bank Transfer"
                : `Cryptocurrency (${cryptoToken})`}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
