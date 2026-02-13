# 🚀 Quick Setup: Wallet Authentication

## What Was Installed

1. **Packages** (700 new packages):
   - `thirdweb` - Enhanced Web3 tooling
   - `wagmi` - React hooks for Ethereum
   - `viem` - TypeScript Ethereum library
   - `@tanstack/react-query` - Data fetching (dependency)

## What Was Created

### Backend Files (3 modified)

1. **`backend/controllers/userController.js`** - Added 3 new endpoints:
   - `getWalletNonce()` - Generate nonce for signing
   - `verifyWalletSignature()` - Verify and login/register
   - `bindWallet()` - Bind wallet to existing account

2. **`backend/routes/userRoutes.js`** - Added 3 new routes:
   - `POST /user/wallet/nonce`
   - `POST /user/wallet/verify`
   - `POST /user/wallet/bind`

3. **`backend/models/User.js`** - Already had wallet support!
   - `walletAddress` field exists
   - `onchainIdAddress` field exists

### Frontend Files (6 new files)

1. **`src/config/wagmi.ts`** - Enhanced with Thirdweb
2. **`src/hooks/useWalletAuth.ts`** - Complete wallet auth hooks
3. **`src/lib/api/authApi.ts`** - Added wallet API methods
4. **`src/components/web3/WalletAuthModal.tsx`** - Login/Register modal
5. **`src/components/web3/BindWalletButton.tsx`** - Bind wallet component
6. **`.env.example`** - Environment variable template

### Documentation (2 files)

1. **`WALLET_AUTH_GUIDE.md`** - Complete implementation guide
2. **`WALLET_AUTH_SETUP.md`** - This file!

## ⚡ Quick Start (5 Steps)

### Step 1: Get API Keys

1. **WalletConnect** - https://cloud.walletconnect.com/
   - Sign up (free)
   - Create new project
   - Copy Project ID

2. **Thirdweb** - https://thirdweb.com/dashboard
   - Sign up (free)
   - Create new project
   - Copy Client ID

3. **Alchemy** (optional) - https://www.alchemy.com/
   - Sign up (free)
   - Create Sepolia app
   - Copy API key

### Step 2: Configure Environment

Create `/frontend/.env.local`:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_id
NEXT_PUBLIC_THIRDWEB_CLIENT_ID=your_thirdweb_id
NEXT_PUBLIC_SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/your_key
```

### Step 3: Wrap App with Providers

Update `/frontend/app/layout.tsx`:

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

### Step 4: Use Wallet Auth in Your Pages

**Login/Register Page:**

```tsx
import { WalletAuthModal } from "@/components/web3/WalletAuthModal";
import { useState } from "react";

function AuthPage() {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button onClick={() => setShowModal(true)}>
        Login with Wallet
      </button>

      <WalletAuthModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        mode="login" // or "register"
        onSuccess={(token, user) => {
          // Redirect to dashboard
          window.location.href = "/dashboard";
        }}
      />
    </>
  );
}
```

**Profile Page (Bind Wallet):**

```tsx
import { BindWalletButton } from "@/components/web3/BindWalletButton";

function ProfilePage() {
  return (
    <div>
      <h2>Connect Your Wallet</h2>
      <BindWalletButton
        onSuccess={(user) => {
          alert("Wallet bound successfully!");
        }}
      />
    </div>
  );
}
```

### Step 5: Start Backend & Frontend

```bash
# Terminal 1 - Backend
cd backend
npm run server

# Terminal 2 - Frontend
cd frontend
npm run dev
```

Visit http://localhost:3000 and test wallet authentication!

## 🎯 How It Works

### Traditional Auth (Already Working)
```
Email + Password → JWT Token → Access
```

### Wallet Auth (NEW!)
```
Wallet Address → Sign Message → Verify Signature → JWT Token → Access
```

### Hybrid Auth (NEW!)
```
Email + Password → Login → Bind Wallet → Can login with either
```

## 🔑 Authentication Methods

### 1. Wallet-Only Authentication

User registers/logs in **without email/password**, only wallet:

```tsx
// Register
<WalletAuthModal mode="register" />
// User enters: name, role
// System: connects wallet, signs message, creates account

// Login
<WalletAuthModal mode="login" />
// System: connects wallet, signs message, logs in
```

### 2. Bind Wallet to Existing Account

User already has email/password account, wants to add wallet:

```tsx
// In profile page after login
<BindWalletButton />
// System: connects wallet, binds to current user
// Now user can login with either email OR wallet
```

## 📁 File Structure

```
backend/
├── controllers/
│   └── userController.js      ← Added wallet auth functions
├── routes/
│   └── userRoutes.js          ← Added wallet routes
└── models/
    └── User.js                ← Already has walletAddress field

frontend/
├── src/
│   ├── config/
│   │   └── wagmi.ts           ← Wagmi + Thirdweb config
│   ├── hooks/
│   │   └── useWalletAuth.ts   ← Wallet auth hooks
│   ├── lib/api/
│   │   └── authApi.ts         ← Added wallet API methods
│   └── components/web3/
│       ├── WalletAuthModal.tsx      ← Login/Register modal
│       ├── BindWalletButton.tsx     ← Bind wallet button
│       ├── WalletConnect.tsx        ← Basic wallet connect (existing)
│       └── TokenBalance.tsx         ← Token balance display (existing)
└── .env.local                 ← Environment variables
```

## 🧪 Testing Checklist

### Test Wallet Registration
- [ ] Click "Login with Wallet"
- [ ] Switch to "Register" mode
- [ ] Connect MetaMask
- [ ] Enter name and role
- [ ] Sign message
- [ ] Verify user created in database
- [ ] Verify JWT token received
- [ ] Verify redirect to dashboard

### Test Wallet Login
- [ ] Register user with wallet (above)
- [ ] Logout
- [ ] Click "Login with Wallet"
- [ ] Connect same wallet
- [ ] Sign message
- [ ] Verify successful login

### Test Bind Wallet
- [ ] Login with email/password
- [ ] Go to profile
- [ ] Click "Bind Wallet"
- [ ] Connect MetaMask
- [ ] Verify wallet bound
- [ ] Logout
- [ ] Login with wallet
- [ ] Verify successful login

### Test Error Cases
- [ ] Try to bind wallet already bound to another account
- [ ] Try to login with unregistered wallet
- [ ] Try expired nonce (wait 5+ minutes)
- [ ] Cancel wallet connection

## 🔒 Security Notes

### Development (Current)
- ✅ Nonce-based signature verification
- ✅ 5-minute nonce expiration
- ✅ JWT token authentication
- ⚠️ Signature verification on frontend only

### Production (Recommended)
- ✅ Add server-side signature verification
- ✅ Use Redis for nonce storage
- ✅ Implement rate limiting
- ✅ Add token refresh mechanism
- ✅ Use httpOnly cookies for tokens

## 🎨 Customization

### Add More Wallet Connectors

Edit `/frontend/src/config/wagmi.ts`:

```typescript
import { safe } from "wagmi/connectors";

connectors: [
  injected(),
  walletConnect({ projectId }),
  coinbaseWallet({ appName: "RegShield" }),
  safe(), // Gnosis Safe
],
```

### Customize Signing Message

Edit `/frontend/src/hooks/useWalletAuth.ts`:

```typescript
const signature = await signMessageAsync({
  message: `Your custom message here\n\nNonce: ${nonce}`,
});
```

### Add More User Roles

Edit `/backend/models/User.js`:

```javascript
role: {
  type: String,
  enum: ["renter", "rentor", "investor", "admin", "moderator"],
  default: "renter"
}
```

## 📚 API Endpoints

### Wallet Authentication

```bash
# Get nonce for signing
POST /user/wallet/nonce
Body: { walletAddress: "0x..." }
Response: { success: true, nonce: "abc123...", message: "Sign this..." }

# Verify signature and login/register
POST /user/wallet/verify
Body: {
  walletAddress: "0x...",
  signature: "0x...",
  name: "John Doe",      // Optional, for registration
  role: "renter"         // Optional, for registration
}
Response: { success: true, token: "jwt...", user: {...} }

# Bind wallet to existing account (requires JWT)
POST /user/wallet/bind
Headers: { Authorization: "Bearer jwt..." }
Body: { walletAddress: "0x..." }
Response: { success: true, user: {...}, message: "Wallet bound successfully" }
```

## 🎉 You're All Set!

Your wallet authentication system is ready! Users can now:

- ✅ Register with just their wallet (no email needed)
- ✅ Login using their wallet
- ✅ Bind wallet to existing email/password accounts
- ✅ Switch between authentication methods seamlessly

For more details, see **WALLET_AUTH_GUIDE.md**

## ❓ Common Questions

**Q: Do users need both email and wallet?**
A: No! Users can:
- Register with email only (traditional)
- Register with wallet only (no email)
- Have both (hybrid)

**Q: Can I login with wallet if I registered with email?**
A: Yes, if you bind your wallet to your account using `<BindWalletButton />`

**Q: Is the password stored for wallet-only users?**
A: Yes, but it's a random hash. Wallet-only users can't login with password.

**Q: Can one wallet be bound to multiple accounts?**
A: No, each wallet can only be bound to one account (enforced by unique constraint).

**Q: Do I need all three API keys?**
A: You need WalletConnect for production. Thirdweb and Alchemy are optional but recommended.

## 🐛 Need Help?

1. Check **WALLET_AUTH_GUIDE.md** for detailed documentation
2. Review the troubleshooting section
3. Check backend logs: `cd backend && npm run server`
4. Check frontend errors in browser console
5. Verify environment variables are set correctly

## 📞 Support

If you encounter issues:
1. Verify all environment variables are set
2. Ensure backend is running on port 4000
3. Ensure frontend is running on port 3000
4. Check MetaMask is connected to Sepolia testnet
5. Clear browser cache and restart dev server
