## RegShield Smart Contracts - Frontend Integration Guide

All 27 smart contracts have been successfully deployed to Sepolia testnet and integrated with the frontend!

### 📁 New Files Created

**Constants & Configuration:**
- `/src/constants/contracts.ts` - All deployed contract addresses
- `/src/constants/chains.ts` - Chain configuration (Sepolia)
- `/src/constants/index.ts` - Application constants

**Contract ABIs:**
- `/src/contracts/abis/` - Compiled contract ABIs (8 key contracts)
- `/src/contracts/abis.ts` - ABI exports for TypeScript

**Web3 Configuration:**
- `/src/config/wagmi.ts` - Wagmi configuration with Sepolia
- `/src/providers/Web3Provider.tsx` - Web3 provider component

**Custom Hooks:**
- `/src/hooks/useContracts.ts` - Contract address/ABI hooks
- `/src/hooks/useVehicleData.ts` - Vehicle NFT read hooks
- `/src/hooks/usePaymentToken.ts` - Payment token interaction hooks

---

## 🚀 Quick Start

### 1. Install Required Dependencies

```bash
npm install wagmi viem @tanstack/react-query
```

### 2. Update Root Layout

Update `app/layout.tsx` to wrap the app with Web3Provider:

```tsx
import { Web3Provider } from "@/providers/Web3Provider";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Web3Provider>
          {children}
        </Web3Provider>
      </body>
    </html>
  );
}
```

### 3. Environment Variables

Create `.env.local` with:

```bash
# Sepolia RPC URL (get from Alchemy, Infura, etc.)
NEXT_PUBLIC_SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY

# WalletConnect Project ID (get from https://cloud.walletconnect.com/)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id_here
```

---

## 📝 Usage Examples

### Connect Wallet

```tsx
import { useAccount, useConnect, useDisconnect } from "wagmi";

function ConnectButton() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected) {
    return (
      <div>
        <p>Connected: {address}</p>
        <button onClick={() => disconnect()}>Disconnect</button>
      </div>
    );
  }

  return (
    <div>
      {connectors.map((connector) => (
        <button key={connector.id} onClick={() => connect({ connector })}>
          Connect {connector.name}
        </button>
      ))}
    </div>
  );
}
```

### Read Vehicle Data

```tsx
import { useTotalVehicles, useVehicleDetails } from "@/hooks/useVehicleData";

function VehicleList() {
  const { data: totalVehicles } = useTotalVehicles();
  const { data: vehicleDetails } = useVehicleDetails(1n); // Token ID 1

  return (
    <div>
      <p>Total Vehicles: {totalVehicles?.toString()}</p>
      {vehicleDetails && (
        <div>
          <h3>Vehicle Details:</h3>
          <pre>{JSON.stringify(vehicleDetails, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
```

### Check Token Balance

```tsx
import { useMyTokenBalance } from "@/hooks/usePaymentToken";

function TokenBalance() {
  const { data: balance, formatted, isLoading } = useMyTokenBalance();

  if (isLoading) return <p>Loading balance...</p>;

  return (
    <div>
      <p>Your Balance: {formatted} Tokens</p>
    </div>
  );
}
```

### Approve & Transfer Tokens

```tsx
import { useApproveToken, useTransferToken } from "@/hooks/usePaymentToken";
import { useState } from "react";

function TokenActions() {
  const [amount, setAmount] = useState("");
  const [recipient, setRecipient] = useState("");

  const { approve, isConfirming: isApproving } = useApproveToken();
  const { transfer, isConfirming: isTransferring } = useTransferToken();

  return (
    <div>
      <input
        type="text"
        placeholder="Amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />

      {/* Approve spending */}
      <button
        onClick={() => approve("0xSPENDER_ADDRESS", amount)}
        disabled={isApproving}
      >
        {isApproving ? "Approving..." : "Approve"}
      </button>

      {/* Transfer tokens */}
      <input
        type="text"
        placeholder="Recipient Address"
        value={recipient}
        onChange={(e) => setRecipient(e.target.value)}
      />
      <button
        onClick={() => transfer(recipient as `0x${string}`, amount)}
        disabled={isTransferring}
      >
        {isTransferring ? "Transferring..." : "Transfer"}
      </button>
    </div>
  );
}
```

### Write to Contract (Generic)

```tsx
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useRentalBooking } from "@/hooks/useContracts";

function BookVehicle() {
  const { address, abi } = useRentalBooking();
  const { data: hash, writeContract } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const bookVehicle = (vehicleId: bigint, startDate: bigint, endDate: bigint) => {
    writeContract({
      address,
      abi,
      functionName: "createBooking",
      args: [vehicleId, startDate, endDate],
    });
  };

  return (
    <div>
      <button onClick={() => bookVehicle(1n, 1000n, 2000n)}>Book Vehicle</button>
      {isConfirming && <p>Waiting for confirmation...</p>}
      {isSuccess && <p>Booking successful!</p>}
    </div>
  );
}
```

---

## 📋 Deployed Contracts Reference

### Core Infrastructure
- **OnchainID Factory:** `0xEfed83f5f401ac4f7E42b7cC5bCF81F93f9849C2`
- **Identity Registry:** `0x3887543D50Cbf9C7867fC992197Ecfd47f8F9874`

### Vehicle & Rental
- **Vehicle NFT:** `0x9D320c2f688198E801994399f1bA7510eDd88B7F`
- **Rental Booking:** `0x2C9f61F4Af0909580B955B6f74173Ef743350B66`
- **Rental Operations:** `0xf125c25958150664dA8d54B8CCF72D0F320c7996`

### Payment System
- **Payment Token:** `0x394942c35ef615d36d734834a41C50b99174D906`
- **Rental Payment Protocol:** `0x3f064Adfb28df708279B5f159E744dCC3ecC1951`
- **Rental Escrow:** `0x34Ca8A80F426Cda8DF6Ce24335a258ad19ecd8eb`

### Investment & Revenue
- **Investor Request Manager:** `0xe32a4d2390f28Dc7052A2d854Acedb470A8099Dc`
- **Revenue Distributor:** `0x1AeFd9AED1883eDa8B41650be9c78591800Ee6E8`
- **MultiSig Wallet:** `0x9633e623769CfFc23A03fA0DDB09749eCc246C5E`

**Full list:** See `/src/constants/contracts.ts`

---

## 🔗 Useful Links

- **Sepolia Etherscan:** https://sepolia.etherscan.io
- **Sepolia Faucet:** https://sepoliafaucet.com
- **Wagmi Docs:** https://wagmi.sh
- **Viem Docs:** https://viem.sh

---

## 🧪 Testing

### Get Test ETH
1. Visit https://sepoliafaucet.com
2. Connect your wallet
3. Request test ETH

### Get Test Tokens
The PaymentToken contract has a `mint()` function for testing:

```tsx
import { useWriteContract } from "wagmi";
import { usePaymentToken } from "@/hooks/useContracts";
import { parseUnits } from "viem";

function MintTokens() {
  const { address, abi } = usePaymentToken();
  const { writeContract } = useWriteContract();

  const mintTokens = () => {
    writeContract({
      address,
      abi,
      functionName: "mint",
      args: [parseUnits("1000", 18)], // Mint 1000 tokens
    });
  };

  return <button onClick={mintTokens}>Mint Test Tokens</button>;
}
```

---

## 📚 Next Steps

1. **Install dependencies:** `npm install wagmi viem @tanstack/react-query`
2. **Add Web3Provider** to root layout
3. **Set up environment variables** (`.env.local`)
4. **Test wallet connection** on the UI
5. **Implement contract interactions** in your components
6. **Test on Sepolia** with real transactions

---

## 🛠️ Troubleshooting

**Wallet won't connect:**
- Check that you're on Sepolia network
- Clear browser cache and try again
- Ensure WalletConnect Project ID is valid

**Contract reads failing:**
- Verify RPC URL is working
- Check contract addresses in `/src/constants/contracts.ts`
- Ensure wallet is connected to Sepolia

**Transactions failing:**
- Check you have enough Sepolia ETH
- Verify token approvals for payment operations
- Review contract requirements (e.g., KYC status)

---

## 🎯 Ready to Build!

All contracts are deployed, verified, and ready for integration. The frontend now has:
- ✅ All contract addresses in constants
- ✅ Contract ABIs exported for TypeScript
- ✅ Wagmi configuration set up
- ✅ Custom hooks for common operations
- ✅ Web3 provider ready to use

Start building your features! 🚀
