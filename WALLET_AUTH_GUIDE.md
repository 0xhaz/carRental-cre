# Wallet Authentication System Guide

This guide explains how the wallet-based authentication system works in RegShield, allowing users to login/register using their crypto wallets.

## 🎯 Overview

RegShield supports **three authentication methods**:

1. **Traditional Email/Password** - Standard authentication
2. **Wallet-Only Authentication** - Login/register using only a wallet (no email/password)
3. **Hybrid Authentication** - Bind a wallet to an existing email/password account

## 🏗️ Architecture

### Backend Components

#### 1. User Model (`backend/models/User.js`)
- `walletAddress` - Stores the user's wallet address (unique, optional)
- `onchainIdAddress` - For ERC-3643 identity binding
- Supports both email/password and wallet authentication

#### 2. Wallet Authentication Endpoints (`backend/controllers/userController.js`)

**POST /user/wallet/nonce**
- Request a nonce for wallet signature
- Input: `{ walletAddress: string }`
- Output: `{ success: boolean, nonce: string, message: string }`

**POST /user/wallet/verify**
- Verify wallet signature and login/register
- Input: `{ walletAddress: string, signature: string, name?: string, role?: string }`
- Output: `{ success: boolean, token: string, user: User }`

**POST /user/wallet/bind** (Protected)
- Bind wallet to existing account
- Input: `{ walletAddress: string }`
- Output: `{ success: boolean, user: User, message: string }`

### Frontend Components

#### 1. Configuration Files

**`src/config/wagmi.ts`**
- Wagmi configuration with Sepolia testnet
- Thirdweb client setup
- Wallet connectors: MetaMask, WalletConnect, Coinbase Wallet

#### 2. Hooks

**`src/hooks/useWalletAuth.ts`**
- `useWalletAuth()` - Main wallet authentication hook
- `useWalletLogin()` - Login existing wallet users
- `useWalletRegister()` - Register new wallet users
- `useBindWallet()` - Bind wallet to existing account

#### 3. Components

**`src/components/web3/WalletAuthModal.tsx`**
- Complete login/register modal for wallet authentication
- Handles wallet connection, message signing, and verification

**`src/components/web3/BindWalletButton.tsx`**
- Simple button to bind wallet to logged-in account

**`src/components/web3/WalletConnect.tsx`**
- Basic wallet connection component (already exists)

**`src/components/web3/TokenBalance.tsx`**
- Display user's token balance (already exists)

## 🔐 Authentication Flow

### Wallet Login Flow

```
1. User clicks "Login with Wallet"
   ↓
2. User connects wallet (MetaMask, WalletConnect, etc.)
   ↓
3. Frontend requests nonce from backend
   ↓
4. User signs message with wallet (proves ownership)
   ↓
5. Frontend sends signature to backend
   ↓
6. Backend verifies signature
   ↓
7. If wallet exists in DB → Login
   If wallet doesn't exist → Error (must register first)
   ↓
8. Backend returns JWT token
   ↓
9. Frontend stores token and redirects
```

### Wallet Registration Flow

```
1. User clicks "Register with Wallet"
   ↓
2. User connects wallet
   ↓
3. User enters name and selects role
   ↓
4. Frontend requests nonce from backend
   ↓
5. User signs message with wallet
   ↓
6. Frontend sends signature + name + role to backend
   ↓
7. Backend creates new user with wallet address
   ↓
8. Backend returns JWT token
   ↓
9. Frontend stores token and redirects
```

### Bind Wallet Flow (Hybrid Auth)

```
1. User logs in with email/password (already authenticated)
   ↓
2. User navigates to settings/profile
   ↓
3. User clicks "Bind Wallet"
   ↓
4. User connects wallet
   ↓
5. Frontend sends walletAddress + JWT token to backend
   ↓
6. Backend verifies:
   - Token is valid (user is authenticated)
   - Wallet is not already bound to another account
   ↓
7. Backend updates user record with walletAddress
   ↓
8. User can now login with either email or wallet
```

## 🚀 Usage Examples

### 1. Wallet Login Modal

```tsx
import { WalletAuthModal } from "@/components/web3/WalletAuthModal";
import { useState } from "react";

function LoginPage() {
  const [showModal, setShowModal] = useState(false);

  const handleSuccess = (token: string, user: any) => {
    console.log("Logged in!", { token, user });
    // Redirect to dashboard
  };

  return (
    <>
      <button onClick={() => setShowModal(true)}>
        Login with Wallet
      </button>

      <WalletAuthModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        mode="login"
        onSuccess={handleSuccess}
      />
    </>
  );
}
```

### 2. Wallet Registration Modal

```tsx
<WalletAuthModal
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  mode="register"
  onSuccess={handleSuccess}
/>
```

### 3. Bind Wallet Button

```tsx
import { BindWalletButton } from "@/components/web3/BindWalletButton";

function ProfilePage() {
  const handleBindSuccess = (user: any) => {
    console.log("Wallet bound!", user);
  };

  return (
    <div>
      <h2>Bind Your Wallet</h2>
      <p>Connect your wallet to enable Web3 features</p>
      <BindWalletButton onSuccess={handleBindSuccess} />
    </div>
  );
}
```

### 4. Using Wallet Auth Hook Directly

```tsx
import { useWalletAuth } from "@/hooks/useWalletAuth";

function CustomAuthComponent() {
  const {
    authenticateWithWallet,
    isLoading,
    error,
    isWalletConnected
  } = useWalletAuth();

  const handleAuth = async () => {
    const result = await authenticateWithWallet({
      name: "John Doe",
      role: "renter",
      onSuccess: (token, user) => {
        console.log("Success!", { token, user });
      },
      onError: (error) => {
        console.error("Error:", error);
      },
    });
  };

  return (
    <button onClick={handleAuth} disabled={!isWalletConnected || isLoading}>
      {isLoading ? "Authenticating..." : "Login with Wallet"}
    </button>
  );
}
```

## 🔧 Setup Instructions

### 1. Environment Variables

Create `.env.local` in the frontend directory:

```bash
# Backend API
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000

# WalletConnect Project ID (get from https://cloud.walletconnect.com/)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id

# Thirdweb Client ID (get from https://thirdweb.com/dashboard)
NEXT_PUBLIC_THIRDWEB_CLIENT_ID=your_client_id

# Sepolia RPC URL (get from https://www.alchemy.com/)
NEXT_PUBLIC_SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/your_key
```

### 2. Backend Setup

The backend is already configured! No additional setup needed.

The User model already includes:
- `walletAddress` field
- Wallet authentication endpoints
- Signature verification logic

### 3. Frontend Setup

1. **Install Dependencies** (Already done!)
   ```bash
   npm install thirdweb wagmi viem @tanstack/react-query
   ```

2. **Wrap App with Providers**

   Update your `app/layout.tsx`:

   ```tsx
   import { WagmiProvider } from "wagmi";
   import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
   import { config } from "@/config/wagmi";

   const queryClient = new QueryClient();

   export default function RootLayout({ children }) {
     return (
       <html>
         <body>
           <WagmiProvider config={config}>
             <QueryClientProvider client={queryClient}>
               {children}
             </QueryClientProvider>
           </WagmiProvider>
         </body>
       </html>
     );
   }
   ```

3. **Add Wallet Auth to Your App**

   Use the components in your login/register pages!

## 🔒 Security Considerations

### 1. Signature Verification

**Current Implementation (Development)**:
- Signature verification is handled by the frontend
- Backend trusts the signature was verified correctly

**Production Recommendation**:
- Add server-side signature verification using `ethers` or `viem`
- Verify the signature matches the wallet address and nonce

```javascript
import { verifyMessage } from "viem";

// In backend controller
const isValid = await verifyMessage({
  address: walletAddress,
  message: `Sign this message to authenticate:\n\nNonce: ${nonce}`,
  signature: signature,
});

if (!isValid) {
  throw new Error("Invalid signature");
}
```

### 2. Nonce Management

**Current Implementation**:
- In-memory Map (good for development)
- 5-minute expiration

**Production Recommendation**:
- Use Redis or database for nonce storage
- Implement rate limiting per wallet address
- Add anti-replay protection

### 3. Token Security

- JWT tokens are stored in `localStorage`
- Consider using `httpOnly` cookies for production
- Implement token refresh mechanism
- Add token expiration (currently tokens don't expire)

## 🎨 Customization

### Custom Wallet Connectors

Add more connectors in `src/config/wagmi.ts`:

```typescript
import { safe } from "wagmi/connectors";

connectors: [
  injected(),
  walletConnect({ projectId }),
  coinbaseWallet({ appName: "RegShield" }),
  safe(), // Gnosis Safe
  // Add more connectors
],
```

### Custom Signing Message

Modify the message in `useWalletAuth.ts`:

```typescript
const signature = await signMessageAsync({
  message: `Welcome to RegShield!\n\nSign this message to authenticate securely.\n\nNonce: ${nonce}\nTimestamp: ${Date.now()}`,
});
```

### Custom User Roles

Add/modify roles in the backend `User.js` model:

```javascript
role: {
  type: String,
  enum: ["renter", "rentor", "investor", "admin", "moderator"],
  default: "renter"
}
```

## 📊 Database Schema

### User Model Fields

```javascript
{
  name: String,
  email: String (unique, but can be temporary for wallet-only users),
  password: String (hashed, random for wallet-only users),
  walletAddress: String (unique, sparse, optional),
  onchainIdAddress: String (for ERC-3643),
  role: ["renter", "rentor", "investor", "admin"],
  compliance: {
    kycVerified: Boolean,
    accreditedInvestor: Boolean,
    driverLicenseVerified: Boolean,
    insuranceVerified: Boolean,
  },
  timestamps: true
}
```

### Wallet-Only Users

For users who register with only a wallet:
- `email` is set to `${walletAddress}@wallet.local`
- `password` is a random hash (user can't login with password)
- `walletAddress` is the primary identifier

## 🧪 Testing

### Test Wallet Registration

1. Open MetaMask
2. Click "Login with Wallet"
3. Switch to "Register" mode
4. Enter name and role
5. Connect MetaMask
6. Sign the message
7. Verify user is created in database

### Test Wallet Login

1. Register a user with wallet (see above)
2. Logout
3. Click "Login with Wallet"
4. Connect same wallet
5. Sign the message
6. Verify successful login

### Test Bind Wallet

1. Register with email/password
2. Login
3. Navigate to profile
4. Click "Bind Wallet"
5. Connect MetaMask
6. Verify wallet is bound to account
7. Logout and login with wallet

## 🐛 Troubleshooting

### "No nonce found" Error
- Nonce expired (5 minutes)
- Request a new nonce

### "Wallet already bound" Error
- Wallet is already linked to another account
- Use a different wallet or login to the existing account

### "Please connect your wallet first"
- MetaMask not connected
- Click connect wallet button first

### Signature Verification Fails
- Check that the signing message matches exactly
- Ensure nonce hasn't expired
- Verify wallet address is lowercase

## 📚 API Reference

### Frontend Hooks

#### `useWalletAuth()`

Returns:
- `authenticateWithWallet(options)` - Main auth function
- `logoutWallet()` - Disconnect and logout
- `isLoading` - Loading state
- `error` - Error message
- `isWalletConnected` - Connection status
- `walletAddress` - Current wallet address

#### `useWalletLogin()`

Returns:
- `loginWithWallet(onSuccess)` - Login function
- `isLoading` - Loading state
- `error` - Error message

#### `useWalletRegister()`

Returns:
- `registerWithWallet(name, role, onSuccess)` - Register function
- `isLoading` - Loading state
- `error` - Error message

#### `useBindWallet()`

Returns:
- `bindWallet(onSuccess)` - Bind function
- `isLoading` - Loading state
- `error` - Error message
- `isWalletConnected` - Connection status
- `walletAddress` - Current wallet address

## 🎉 Success!

Your wallet authentication system is now fully integrated! Users can:
- ✅ Register with just their wallet
- ✅ Login using their wallet
- ✅ Bind wallet to existing email/password accounts
- ✅ Seamlessly switch between authentication methods

## 📝 Next Steps

1. **Get API Keys**: Sign up for WalletConnect and Thirdweb to get your API keys
2. **Add Server-Side Signature Verification**: Implement proper signature verification in production
3. **Implement Token Refresh**: Add refresh token mechanism
4. **Add Multi-Chain Support**: Support other chains beyond Sepolia
5. **Add Social Recovery**: Allow users to recover account with wallet
6. **Implement Session Management**: Better session handling and expiration
