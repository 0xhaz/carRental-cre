# Phase 3: Web3 Frontend Integration - Implementation Plan

## Overview
Integrate the existing ERC-3643 smart contract architecture with the frontend, ensuring all compliance features, dual-token system, and Chainlink CRE integrations are properly represented in the user interface.

---

## Architecture Analysis

### Smart Contract Components (from ARCHITECTURE.md)

1. **OnchainID System (ERC-734/735)** - Identity & Compliance
2. **ERC-3643 Dual Token System** - AssetToken + RevenueToken
3. **Compliance Rules Engine** - Multi-layer validation
4. **Payment Protocols** - Investment & Rental payments
5. **VehicleNFT Registry** - Vehicle tokenization
6. **Rental Management** - Booking lifecycle
7. **Chainlink CRE Integration** - Off-chain data & automation
8. **Revenue Distribution** - Waterfall mechanism

### User Roles & Their Web3 Features

#### **Investor Portal** (Web3 Features)
- Wallet connection (MetaMask, WalletConnect, Coinbase Wallet)
- OnchainID creation & claim management
- Investor type selection (Retail, Institutional, Strategic, Regional)
- Whitelist tier verification (Tier 1-4)
- Investment in vehicles (RevenueToken acquisition)
- AssetToken trading (secondary market)
- Revenue distribution tracking
- Compliance status dashboard
- Token portfolio management

#### **Rentor Portal** (Web3 Features)
- Wallet connection
- OnchainID with business claims
- Vehicle NFT minting (VIN-linked)
- Fundraising campaign creation
- AssetToken & RevenueToken deployment
- Investment milestone management
- Revenue distribution configuration
- Vehicle telemetry integration
- Maintenance tracking on-chain

#### **Renter Portal** (Web3 Features)
- Wallet connection
- OnchainID with driver claims (license, insurance, credit)
- Booking creation (on-chain)
- Security deposit escrow
- Payment processing
- Condition report submission (IPFS)
- Dispute initiation
- Rental history on-chain

---

## UI Component Mapping

### 1. Web3 Infrastructure Components

#### A. Wallet Connection Components (NEW)
**Location**: `/frontend/src/components/web3/wallet/`

1. **ConnectWalletButton.tsx**
   - Multi-wallet support (MetaMask, WalletConnect, Coinbase)
   - Network detection & switching
   - Wallet disconnection
   - Balance display
   - Connected address display

2. **NetworkSelector.tsx**
   - Chain selection (Ethereum, Polygon, Arbitrum)
   - Network switching prompt
   - Testnet/Mainnet toggle
   - Unsupported network warning

3. **WalletModal.tsx**
   - Wallet provider selection grid
   - Installation prompts
   - Connection status
   - Error handling

4. **AddressDisplay.tsx**
   - Formatted address (0x1234...5678)
   - Copy to clipboard
   - ENS name resolution
   - QR code generator

#### B. OnchainID Components (NEW)
**Location**: `/frontend/src/components/web3/identity/`

1. **OnchainIDSetup.tsx**
   - Identity creation wizard
   - Claim type selection
   - Document upload interface
   - CRE verification status

2. **ClaimsList.tsx**
   - Active claims display
   - Claim expiration warnings
   - Verification status badges
   - Renewal prompts

3. **VerificationFlow.tsx**
   - KYC document upload
   - Accreditation verification (investors)
   - Driver license verification (renters)
   - Business registration (rentors)
   - Real-time verification progress

4. **ComplianceStatus.tsx**
   - Overall compliance score
   - Missing claims alerts
   - Action items list
   - Tier status display

#### C. Token Management Components (NEW)
**Location**: `/frontend/src/components/web3/tokens/`

1. **AssetTokenCard.tsx**
   - Token balance display
   - Vehicle linkage info
   - Transfer functionality
   - Market value tracking

2. **RevenueTokenCard.tsx**
   - Token balance display
   - Revenue earned display
   - Distribution history
   - Yield percentage

3. **TokenTransferModal.tsx**
   - Recipient address input
   - Amount selection
   - Gas estimation
   - Compliance checks display
   - Transfer confirmation

4. **RevenueDistributionHistory.tsx**
   - Distribution timeline
   - Amount per distribution
   - Total earnings
   - Tax documentation download

### 2. Investor Portal UI Enhancements

#### A. Onboarding Flow (NEW)
**Location**: `/frontend/app/investor/onboarding/`

**Pages to Create**:
1. `/onboarding/wallet-connect` - Wallet connection
2. `/onboarding/identity-setup` - OnchainID creation
3. `/onboarding/investor-type` - Type selection (Retail/Institutional/Strategic/Regional)
4. `/onboarding/kyc-verification` - KYC upload & verification
5. `/onboarding/whitelist-tier` - Tier verification (Tier 1-4)
6. `/onboarding/compliance-review` - Final compliance check

**Components Needed**:
- `InvestorTypeSelector.tsx` - Radio/card selection with limits display
- `WhitelistTierCard.tsx` - Tier requirements & benefits
- `KYCUploadForm.tsx` - Document upload with validation
- `AccreditationForm.tsx` - Accredited investor verification
- `ComplianceCheckProgress.tsx` - Real-time CRE check status

#### B. Marketplace Enhancements
**Location**: `/frontend/app/investor/marketplace/`

**Components to Add/Modify**:

1. **InvestmentOpportunityCard.tsx** (UPDATE EXISTING)
   - Add: Blockchain status badge (on-chain/off-chain)
   - Add: RevenueToken address
   - Add: AssetToken address
   - Add: Investor type eligibility
   - Add: Whitelist tier requirement
   - Add: Investment limits (min/max)
   - Add: Lock-up period display
   - Add: Transfer restrictions

2. **InvestmentModal.tsx** (NEW)
   - Investor type validation
   - Investment amount input (with min/max enforcement)
   - Compliance check display
   - Gas estimation
   - Token approval flow
   - Investment confirmation
   - MetaMask transaction prompt
   - Transaction status tracker

3. **MilestoneTracker.tsx** (NEW)
   - Campaign milestones display
   - Completion percentage
   - Fund release schedule
   - CRE verification status
   - Evidence links (IPFS)

4. **ComplianceGate.tsx** (NEW)
   - Pre-investment compliance checks
   - Missing requirements alert
   - Blocked investment reasons
   - Action items to resolve

#### C. Portfolio Enhancements
**Location**: `/frontend/app/investor/portfolio/`

**Components to Add/Modify**:

1. **PortfolioOverview.tsx** (UPDATE)
   - Total AssetTokens held
   - Total RevenueTokens held
   - Total revenue earned (from blockchain)
   - Portfolio value (real-time from CRE valuation)
   - Yield percentage (APY)
   - Next distribution date

2. **AssetTokenList.tsx** (NEW)
   - Vehicle NFT info
   - Token balance
   - Ownership percentage
   - Transfer functionality
   - Market value
   - Trade button (secondary market)

3. **RevenueTokenList.tsx** (NEW)
   - Vehicle linkage
   - Token balance
   - Revenue earned to-date
   - Distribution schedule
   - Claim history

4. **RevenueChart.tsx** (UPDATE)
   - Historical revenue from blockchain events
   - Projected revenue from CRE
   - Distribution waterfall visualization
   - Per-vehicle breakdown

5. **TransactionHistory.tsx** (NEW)
   - Investment transactions
   - Revenue distributions
   - Token transfers
   - Gas costs
   - Etherscan links

### 3. Rentor Portal UI Enhancements

#### A. Vehicle Onboarding (Web3)
**Location**: `/frontend/app/rentor/vehicles/add/`

**Components to Create**:

1. **VehicleNFTMintingWizard.tsx** (NEW)
   - Step 1: Vehicle details input
   - Step 2: VIN verification (CRE integration)
   - Step 3: Photo upload (IPFS)
   - Step 4: Insurance verification (CRE)
   - Step 5: Registration verification (CRE)
   - Step 6: NFT minting transaction
   - Step 7: Minting confirmation

2. **VINVerificationForm.tsx** (NEW)
   - VIN input
   - DMV API check (via CRE)
   - Ownership proof upload
   - Verification status

3. **VehicleNFTCard.tsx** (NEW)
   - NFT image
   - Token ID
   - VIN display
   - Blockchain explorer link
   - Metadata display
   - Status badge

#### B. Fundraising Campaign Creation
**Location**: `/frontend/app/rentor/fundraising/create/`

**Components to Create**:

1. **CampaignCreationWizard.tsx** (NEW)
   - Step 1: Vehicle selection (must have NFT)
   - Step 2: Funding parameters (target, min/max, investor types)
   - Step 3: Token configuration (AssetToken + RevenueToken)
   - Step 4: Milestone setup
   - Step 5: Terms & compliance
   - Step 6: Campaign deployment (smart contract)

2. **TokenDeploymentForm.tsx** (NEW)
   - AssetToken parameters
   - RevenueToken parameters
   - Supply settings
   - Transfer restrictions
   - Deployment transaction

3. **MilestoneSetupForm.tsx** (NEW)
   - Milestone name & description
   - Release percentage
   - Evidence requirements
   - CRE verification type

4. **FundraisingTerms.tsx** (NEW)
   - Investment period
   - Lock-up period
   - Transfer restrictions
   - Revenue distribution schedule
   - Compliance requirements

#### C. Vehicle Management Enhancements
**Location**: `/frontend/app/rentor/vehicles/`

**Components to Add/Modify**:

1. **VehicleDetailsPage.tsx** (UPDATE)
   - Blockchain section:
     - NFT token ID
     - AssetToken address
     - RevenueToken address
     - Current investors
     - Revenue earned
   - Maintenance on-chain:
     - Scheduled maintenance (from blockchain)
     - Maintenance history (blockchain events)
     - Record new maintenance (transaction)
   - Telematics data:
     - Real-time location (from CRE)
     - Current mileage (auto-updated)
     - Status (on-chain)

2. **InvestorListTable.tsx** (NEW)
   - Investor addresses
   - RevenueToken holdings
   - Percentage ownership
   - Revenue distributed
   - Contact (if permissioned)

3. **RevenueDistributionDashboard.tsx** (NEW)
   - Gross rental income
   - Waterfall breakdown:
     - Platform fee (15%)
     - Maintenance reserve (10%)
     - Insurance (5%)
     - Operating costs (10%)
     - Net distributable (60%)
   - Distribution history
   - Manual distribution trigger (if needed)

4. **MaintenanceLogger.tsx** (NEW)
   - Maintenance type selection
   - Cost input
   - Evidence upload (IPFS)
   - On-chain recording transaction
   - Maintenance history display

### 4. Renter Portal UI Enhancements

#### A. Booking Flow (Web3)
**Location**: `/frontend/app/renter/book/`

**Components to Create/Modify**:

1. **BookingWizard.tsx** (UPDATE)
   - Step 1: Vehicle selection
   - Step 2: Dates selection
   - Step 3: **NEW** - OnchainID compliance check
   - Step 4: **NEW** - Security deposit escrow (MetaMask)
   - Step 5: **NEW** - Payment transaction (on-chain)
   - Step 6: Booking confirmation (with tx hash)

2. **ComplianceCheckStep.tsx** (NEW)
   - Driver license verification status
   - Insurance coverage check
   - Credit score check
   - CRE real-time verification
   - Approval/rejection display

3. **DepositEscrowStep.tsx** (NEW)
   - Security deposit amount display
   - Escrow smart contract explanation
   - MetaMask approval transaction
   - Transaction confirmation
   - Escrow address display

4. **OnChainPaymentStep.tsx** (NEW)
   - Rental fee breakdown
   - Payment scheduling (if applicable)
   - Token selection (ETH, USDC, DAI)
   - Gas estimation
   - Payment transaction
   - Receipt (tx hash)

#### B. Active Rental Management
**Location**: `/frontend/app/renter/bookings/[id]/`

**Components to Create**:

1. **ActiveRentalDashboard.tsx** (NEW)
   - Vehicle location (real-time from CRE)
   - Time remaining
   - Mileage tracked (from CRE)
   - Speed monitoring alerts
   - Geofencing status
   - Extend rental button (with additional payment)

2. **ConditionReportForm.tsx** (NEW)
   - Photo upload (IPFS)
   - Damage notes input
   - Fuel level input
   - Mileage confirmation
   - Submit to blockchain
   - Digital signature

3. **ReturnInitiationModal.tsx** (NEW)
   - Return location selection
   - Return time scheduling
   - Pre-return checklist
   - Condition report prompt
   - Initiate return transaction

4. **DepositSettlementDisplay.tsx** (NEW)
   - Original deposit amount
   - Deductions (if any):
     - Damage costs (CRE damage assessment)
     - Late fees
     - Fuel costs
     - Cleaning fees
   - Refund amount
   - Settlement transaction status
   - Dispute button

#### C. Dispute Resolution
**Location**: `/frontend/app/renter/disputes/`

**Components to Create**:

1. **DisputeForm.tsx** (NEW)
   - Dispute type selection
   - Evidence upload (photos, documents to IPFS)
   - Description input
   - Submit dispute transaction
   - Arbitration deposit

2. **DisputeStatusTracker.tsx** (NEW)
   - Dispute timeline
   - Evidence submission period countdown
   - CRE adjudication status
   - Arbitrator assignment
   - Resolution display

3. **EvidenceSubmissionForm.tsx** (NEW)
   - Additional evidence upload
   - Counter-argument input
   - Witness information
   - Submit to IPFS & blockchain

### 5. Shared UI Components (Cross-Portal)

#### A. Transaction Management
**Location**: `/frontend/src/components/web3/transactions/`

1. **TransactionButton.tsx** (NEW)
   - Loading states (awaiting signature, pending, confirming)
   - Success/error states
   - Gas estimation display
   - Retry functionality
   - Transaction hash display

2. **TransactionStatusModal.tsx** (NEW)
   - Transaction steps visualization
   - Current status
   - Block confirmations
   - Etherscan link
   - Error details (if failed)

3. **GasEstimator.tsx** (NEW)
   - Current gas price
   - Estimated cost in ETH & USD
   - Speed options (slow, normal, fast)
   - Gas limit adjustment

4. **TransactionHistory.tsx** (NEW)
   - All user transactions
   - Filters (type, status, date)
   - Export functionality
   - Etherscan links

#### B. Compliance UI
**Location**: `/frontend/src/components/web3/compliance/`

1. **ComplianceStatusBadge.tsx** (NEW)
   - Visual indicator (verified, pending, rejected)
   - Tooltip with details
   - Click to view full status

2. **ComplianceRequirementsList.tsx** (NEW)
   - Required claims
   - Completed claims
   - Missing claims
   - Action buttons

3. **CREVerificationProgress.tsx** (NEW)
   - API calls being made
   - Real-time progress
   - Estimated completion time
   - Results display

#### C. Token Display
**Location**: `/frontend/src/components/web3/display/`

1. **TokenBalance.tsx** (NEW)
   - Token symbol & name
   - Balance
   - USD value
   - Token icon

2. **TokenApprovalStatus.tsx** (NEW)
   - Approval status for spending
   - Approve button
   - Revoke button
   - Allowance amount

3. **ContractAddress.tsx** (NEW)
   - Formatted address
   - Copy button
   - Etherscan link
   - Contract verification badge

---

## Implementation Roadmap

### Phase 3.1: Web3 Infrastructure (Week 1-2)

**Tasks**:
1. Install dependencies
   ```bash
   npm install wagmi viem @rainbow-me/rainbowkit
   npm install @tanstack/react-query  # already installed
   ```

2. Setup WagmiConfig provider
   - Create `/frontend/src/providers/Web3Provider.tsx`
   - Configure chains (Ethereum, Polygon, Arbitrum)
   - Setup RainbowKit theme
   - Add provider to root layout

3. Create wallet connection components
   - ConnectWalletButton
   - NetworkSelector
   - WalletModal
   - AddressDisplay

4. Setup contract ABIs
   - Create `/frontend/src/contracts/abis/` folder
   - Import all contract ABIs from `/contracts/out/`
   - Create TypeScript types from ABIs

5. Create contract hooks
   - `/frontend/src/hooks/contracts/` folder
   - useAssetToken.ts
   - useRevenueToken.ts
   - useVehicleNFT.ts
   - useBookingContract.ts
   - usePaymentProtocol.ts

**Deliverables**:
- ✅ Wallet connection working in all portals
- ✅ Network switching functional
- ✅ Contract ABIs available
- ✅ Basic contract read hooks working

---

### Phase 3.2: OnchainID & Compliance (Week 3-4)

**Tasks**:
1. Create OnchainID components
   - OnchainIDSetup wizard
   - ClaimsList display
   - VerificationFlow components

2. Implement KYC/verification flows
   - Document upload to IPFS
   - CRE verification mock/integration
   - Claim issuance UI

3. Create compliance checking components
   - ComplianceStatus dashboard
   - ComplianceGate for transactions
   - CREVerificationProgress

4. Investor type & whitelist tier UI
   - InvestorTypeSelector
   - WhitelistTierCard
   - Tier verification flow

**Deliverables**:
- ✅ OnchainID creation working
- ✅ KYC upload functional
- ✅ Compliance status visible
- ✅ Investor onboarding complete

---

### Phase 3.3: Investor Portal Integration (Week 5-6)

**Tasks**:
1. Update marketplace with Web3 features
   - Add blockchain status to cards
   - Show token addresses
   - Display investor eligibility
   - Add compliance gates

2. Create investment flow
   - InvestmentModal with MetaMask
   - Token approval flow
   - Investment transaction
   - Milestone tracking

3. Update portfolio with token management
   - AssetToken display
   - RevenueToken display
   - Token transfer functionality
   - Revenue history from blockchain

4. Add revenue distribution tracking
   - Distribution history from events
   - Revenue charts from blockchain data
   - Waterfall visualization

**Deliverables**:
- ✅ Can invest in vehicles on-chain
- ✅ AssetTokens & RevenueTokens displayed
- ✅ Revenue distributions tracked
- ✅ Portfolio reflects blockchain state

---

### Phase 3.4: Rentor Portal Integration (Week 7-8)

**Tasks**:
1. Implement VehicleNFT minting
   - Minting wizard
   - VIN verification (CRE)
   - Photo upload to IPFS
   - NFT minting transaction

2. Create fundraising campaign creation
   - Campaign wizard
   - Token deployment
   - Milestone setup
   - Campaign contract deployment

3. Add blockchain features to vehicle management
   - Display NFT data
   - Show investor list
   - Revenue distribution dashboard
   - Maintenance logging on-chain

4. Implement telematics integration
   - Real-time location display
   - Auto-updating mileage
   - Maintenance alerts from CRE

**Deliverables**:
- ✅ Can mint VehicleNFTs
- ✅ Can create fundraising campaigns
- ✅ Token deployment working
- ✅ Vehicle data on-chain

---

### Phase 3.5: Renter Portal Integration (Week 9-10)

**Tasks**:
1. Add OnchainID verification to booking
   - Driver license verification
   - Insurance check
   - Credit score check
   - Real-time CRE compliance

2. Implement on-chain booking
   - Booking transaction
   - Deposit escrow
   - Payment processing
   - Booking confirmation

3. Create active rental features
   - Real-time tracking
   - Condition reports (IPFS)
   - Return initiation
   - Deposit settlement

4. Add dispute resolution
   - Dispute form
   - Evidence submission
   - Status tracking
   - Resolution display

**Deliverables**:
- ✅ Booking creates on-chain transaction
- ✅ Deposit escrowed properly
- ✅ Condition reports on IPFS
- ✅ Disputes can be created

---

### Phase 3.6: Testing & Optimization (Week 11-12)

**Tasks**:
1. End-to-end testing
   - Full investor journey
   - Full rentor journey
   - Full renter journey
   - Cross-portal interactions

2. Performance optimization
   - Reduce unnecessary contract reads
   - Implement caching
   - Optimize re-renders
   - Lazy load heavy components

3. Error handling
   - User-friendly error messages
   - Transaction failure recovery
   - Network error handling
   - Wallet disconnection handling

4. UI/UX polish
   - Loading states
   - Empty states
   - Success/error notifications
   - Responsive design fixes

**Deliverables**:
- ✅ All user flows tested
- ✅ No critical bugs
- ✅ Good UX for Web3 interactions
- ✅ Production-ready

---

## Technical Specifications

### Smart Contract Integration Points

#### 1. AssetToken (ERC-3643)
```typescript
// Read operations
- balanceOf(address): uint256
- totalSupply(): uint256
- isVerified(address): bool
- getInvestorType(address): uint8

// Write operations
- transfer(address to, uint256 amount): bool
- approve(address spender, uint256 amount): bool
```

#### 2. RevenueToken (ERC-3643)
```typescript
// Read operations
- balanceOf(address): uint256
- totalRevenue(address): uint256
- lastDistribution(): uint256
- distributionSchedule(): uint256

// Write operations
- claimRevenue(): uint256
- transfer(address to, uint256 amount): bool  // restricted
```

#### 3. VehicleNFT
```typescript
// Read operations
- ownerOf(uint256 tokenId): address
- getVehicleData(uint256 tokenId): VehicleData
- getMaintenanceHistory(uint256 tokenId): MaintenanceRecord[]
- getCurrentMileage(uint256 tokenId): uint256

// Write operations
- mintVehicle(VehicleData): uint256
- updateStatus(uint256 tokenId, Status): void
- recordMaintenance(uint256 tokenId, MaintenanceRecord): void
```

#### 4. RentalBooking
```typescript
// Read operations
- getBooking(uint256 bookingId): Booking
- getUserBookings(address user): uint256[]
- getBookingStatus(uint256 bookingId): Status

// Write operations
- requestBooking(BookingParams): uint256
- approveBooking(uint256 bookingId): void
- startRental(uint256 bookingId): void
- completeReturn(uint256 bookingId, ConditionReport): void
- initiateDispute(uint256 bookingId, string reason): void
```

#### 5. PaymentProtocol
```typescript
// Read operations
- getEscrowBalance(uint256 bookingId): uint256
- getPaymentStatus(uint256 paymentId): Status

// Write operations
- depositSecurityDeposit(uint256 bookingId): void
- processPayment(uint256 bookingId): void
- releaseDeposit(uint256 bookingId): void
- deductFromDeposit(uint256 bookingId, uint256 amount, string reason): void
```

### State Management

Create new Zustand store for Web3 state:

**`/frontend/src/store/web3Store.ts`**
```typescript
interface Web3State {
  // Wallet
  address: string | null;
  chainId: number | null;
  isConnected: boolean;

  // OnchainID
  onchainId: string | null;
  claims: Claim[];
  complianceStatus: ComplianceStatus;

  // Tokens
  assetTokens: AssetTokenBalance[];
  revenueTokens: RevenueTokenBalance[];

  // Transactions
  pendingTxs: Transaction[];

  // Actions
  setAddress: (address: string | null) => void;
  setOnchainId: (id: string) => void;
  addClaim: (claim: Claim) => void;
  updateComplianceStatus: (status: ComplianceStatus) => void;
  addPendingTx: (tx: Transaction) => void;
  removePendingTx: (hash: string) => void;
}
```

### Error Handling

Create centralized error handler for Web3 errors:

**`/frontend/src/lib/web3/errorHandler.ts`**
```typescript
export const handleWeb3Error = (error: any) => {
  // User rejected transaction
  if (error.code === 4001) {
    toast.error("Transaction rejected by user");
    return;
  }

  // Insufficient funds
  if (error.code === -32000) {
    toast.error("Insufficient funds for transaction");
    return;
  }

  // Network error
  if (error.message?.includes("network")) {
    toast.error("Network error. Please check your connection.");
    return;
  }

  // Contract revert
  if (error.message?.includes("revert")) {
    const reason = extractRevertReason(error);
    toast.error(`Transaction failed: ${reason}`);
    return;
  }

  // Generic error
  toast.error("Transaction failed. Please try again.");
  console.error("Web3 Error:", error);
};
```

---

## Environment Variables

Add to `/frontend/.env.local`:

```bash
# Existing
NEXT_PUBLIC_API_URL=http://localhost:3002/api
NEXT_PUBLIC_APP_NAME=RegShield
NEXT_PUBLIC_APP_URL=http://localhost:3000

# NEW - Web3
NEXT_PUBLIC_CHAIN_ID=1  # Ethereum Mainnet
NEXT_PUBLIC_TESTNET_CHAIN_ID=5  # Goerli
NEXT_PUBLIC_ENABLE_TESTNET=true

# Contract Addresses (will be populated after deployment)
NEXT_PUBLIC_VEHICLE_NFT_ADDRESS=0x...
NEXT_PUBLIC_ASSET_TOKEN_FACTORY_ADDRESS=0x...
NEXT_PUBLIC_REVENUE_TOKEN_FACTORY_ADDRESS=0x...
NEXT_PUBLIC_BOOKING_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_PAYMENT_PROTOCOL_ADDRESS=0x...
NEXT_PUBLIC_COMPLIANCE_MODULE_ADDRESS=0x...

# IPFS
NEXT_PUBLIC_IPFS_GATEWAY=https://ipfs.io/ipfs/
NEXT_PUBLIC_IPFS_API=https://api.pinata.cloud  # or your IPFS provider

# Chainlink CRE (if applicable)
NEXT_PUBLIC_CRE_ENDPOINT=https://...

# Explorer
NEXT_PUBLIC_BLOCK_EXPLORER=https://etherscan.io
```

---

## Success Criteria

Phase 3 is complete when:

### Investor Portal
- ✅ Can connect wallet and create OnchainID
- ✅ Can complete KYC/accreditation verification
- ✅ Can select investor type and verify whitelist tier
- ✅ Can invest in vehicles (on-chain transaction)
- ✅ Receives AssetTokens and RevenueTokens
- ✅ Can view token balances in portfolio
- ✅ Can see revenue distribution history
- ✅ Can transfer AssetTokens (with compliance checks)
- ✅ All transactions create on-chain records

### Rentor Portal
- ✅ Can mint VehicleNFTs with VIN verification
- ✅ Can create fundraising campaigns
- ✅ Can deploy AssetToken and RevenueToken contracts
- ✅ Can set up milestones for fund release
- ✅ Can see investor list and holdings
- ✅ Can view revenue distribution dashboard
- ✅ Can record maintenance on-chain
- ✅ Can see real-time telematics data

### Renter Portal
- ✅ Can complete OnchainID with driver claims
- ✅ Pass compliance checks (license, insurance, credit)
- ✅ Can create on-chain booking
- ✅ Can escrow security deposit
- ✅ Can submit condition reports to IPFS
- ✅ Can see real-time rental tracking
- ✅ Can initiate returns and disputes
- ✅ Deposit settlement works correctly

### Technical
- ✅ All smart contract functions integrated
- ✅ Error handling works properly
- ✅ Transaction states managed correctly
- ✅ Loading states provide good UX
- ✅ Gas estimation accurate
- ✅ Works on multiple networks
- ✅ Mobile responsive
- ✅ No security vulnerabilities

---

## Timeline Summary

| Phase | Duration | Focus |
|-------|----------|-------|
| 3.1 | 2 weeks | Web3 Infrastructure |
| 3.2 | 2 weeks | OnchainID & Compliance |
| 3.3 | 2 weeks | Investor Portal |
| 3.4 | 2 weeks | Rentor Portal |
| 3.5 | 2 weeks | Renter Portal |
| 3.6 | 2 weeks | Testing & Polish |
| **Total** | **12 weeks** | **Complete Web3 Integration** |

---

## Next Immediate Steps

1. ✅ Review this plan with stakeholders
2. Install Web3 dependencies (wagmi, viem, RainbowKit)
3. Setup Web3Provider with chain configuration
4. Create wallet connection components
5. Extract contract ABIs from `/contracts/out/`
6. Begin Phase 3.1 implementation

---

## Notes

- **Chainlink CRE**: Some features require CRE integration (telematics, compliance checks). These can be mocked initially and integrated later when CRE services are deployed.
- **IPFS**: Condition reports and evidence will be stored on IPFS. Consider using Pinata or Infura for reliable pinning.
- **Gas Optimization**: Consider using Layer 2 (Polygon, Arbitrum) for high-frequency operations to reduce gas costs.
- **Testing**: Use testnets (Goerli, Mumbai) extensively before mainnet deployment.
- **Security**: All contract interactions should be thoroughly tested and audited before production use.
