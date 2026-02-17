# RegShield - Rental Car Tokenization Platform Architecture

## Overview

Decentralized rental car platform combining vehicle tokenization, compliant investment mechanisms, and operational rental management. Built on ERC-3643 security tokens with Chainlink CRE for off-chain computation. All payments use **native ETH** (no ERC-20 tokens).

**Network**: Sepolia Testnet (Chain ID: 11155111)
**Solidity**: ^0.8.20 | **Framework**: Foundry

---

## Contract Inventory (34 contracts)

| Phase | Contract | Purpose |
|-------|----------|---------|
| 1 | OnchainIDFactory | Deploy identity contracts per participant |
| 1 | ClaimIssuer | Issue/revoke identity claims |
| 1 | KeyManager | Manage identity keys |
| 2 | TrustedIssuersRegistry | Track authorized claim issuers |
| 2 | ClaimTopicsRegistry | Define required claim topics |
| 2 | InvestorTypeRegistry | Manage investor type assignments |
| 2 | ParticipantTypeRegistry | Manage participant roles (renter/rentor) |
| 3 | ComplianceRules | Multi-layer compliance engine |
| 3 | InvestorTypeCompliance | Investor-specific compliance checks |
| 3 | RenterCompliance | Renter eligibility validation |
| 3 | OperationalCompliance | Vehicle operational compliance |
| 3 | TransferRestrictions | Token transfer restrictions |
| 3 | ComplianceRegistry | Central compliance aggregator |
| 4 | IdentityRegistry | Map addresses to verified identities |
| 5 | VehicleNFT | ERC-721 vehicle representation |
| 5 | RentalBooking | Booking lifecycle management |
| 5 | RentalOperations | Condition reports, handovers, damage |
| 6 | RegShieldPaymentProtocol | Investment payment processing |
| 6 | PaymentEscrow (x2) | ETH escrow (investment + rental) |
| 6 | RefundManager (x2) | Refund processing (investment + rental) |
| 6 | RentalPaymentProtocol | Rental payment processing |
| 6 | DisputeResolver | Oracle-mediated dispute resolution |
| 7 | RevenueDistributor | Waterfall revenue distribution |
| 7 | InvestorRequestManager | Investor onboarding + tiered locking |
| 7 | MultiSigWallet | 2-of-2 multisig for accredited/institutional locks |
| 8 | ComplianceReceiver | CRE: compliance actions |
| 8 | PaymentReceiver | CRE: milestone completions |
| 8 | VehicleReceiver | CRE: vehicle data updates |
| 8 | OnboardingReceiver | CRE: investor/booking approvals |
| 8 | CampaignMonitorReceiver | CRE: campaign status monitoring |
| 9 | AssetTokenFactory | Deploy per-vehicle AssetToken instances |
| 9 | RevenueTokenFactory | Deploy per-vehicle RevenueToken instances |

---

## Deployment Phases

Deploy in order using `./deploy-phased.sh [1-9|all]`:

```
Phase 1: OnchainID Infrastructure     (OnchainIDFactory, ClaimIssuer, KeyManager)
Phase 2: Registries                    (TrustedIssuers, ClaimTopics, InvestorType, ParticipantType)
Phase 3: Compliance Modules            (ComplianceRules, InvestorType, Renter, Operational, Transfer, Registry)
Phase 4: Identity Registry             (IdentityRegistry)
Phase 5: Vehicle & Rental              (VehicleNFT, RentalBooking, RentalOperations)
Phase 6: Payment System (Native ETH)   (2x PaymentProtocol, 2x Escrow, 2x RefundManager, DisputeResolver)
Phase 7: Revenue & Investor            (RevenueDistributor, InvestorRequestManager, MultiSigWallet)
Phase 8: CRE Receivers                 (Compliance, Payment, Vehicle, Onboarding, CampaignMonitor)
Phase 9: Token Factories               (AssetTokenFactory, RevenueTokenFactory)
```

After deployment, run `./extract-addresses.sh` to extract addresses from broadcast artifacts into `deployed-addresses.env`.

---

## System Architecture

### 1. Identity & Compliance Layer

#### OnchainID System (ERC-734/735)

All participants (renters, investors, rentors) must have an OnchainID with verified claims before interacting with the platform.

**Claim Topics**:
```
1: KYC Verified
2: Accredited Investor
3: Regional Eligibility
4: Driver License Valid
5: Insurance Verified
6: Credit Score Range
7: Business Registered
8: Vehicle Ownership Proof
```

**Trusted Issuers** (verified via Chainlink CRE):
- KYC providers, government agencies, insurance providers, credit bureaus

#### ERC-3643 Token System

**AssetToken** - Fractional vehicle ownership. One token per vehicle, tradeable among qualified investors, linked to physical vehicle via VIN.

**RevenueToken** - Rights to rental income streams. Issued to investors who fund vehicle purchases. Automatically receives proportional rental revenue.

#### Token Factories (Phase 9)

Per-vehicle token deployment is handled by two factory contracts (split from a single factory to stay under the EVM's 24,576-byte contract size limit):

**AssetTokenFactory** (`0x9099Fb047Bd7136C1A968c06d10cd11D0FEDA251`)
**RevenueTokenFactory** (`0xabb0d3f1B0db1a18486175e0f6091f4D5433C4be`)

```solidity
// AssetTokenFactory
deployAssetToken(string name, string symbol, uint256 supplyCap, string vehicleVIN) → address assetToken
setPaymentProtocol(address _paymentProtocol)  // Owner only

// RevenueTokenFactory
deployRevenueToken(string name, string symbol, uint256 supplyCap, string vehicleVIN, uint256 minimumHoldingPeriod) → address revenueToken
setPaymentProtocol(address _paymentProtocol)  // Owner only
```

Each factory deployment:
1. Deploys the token with the shared `identityRegistry` and `compliance` modules
2. Calls `token.addAgent(paymentProtocol)` — grants `RegShieldPaymentProtocol` minting rights
3. Calls `token.transferOwnership(msg.sender)` — transfers ownership to the caller

**Token Supply & Investment Mapping**: Tokens use a **1:1 ratio** with investment amounts. If an investor sends 1 ETH, they receive 1 AssetToken + 1 RevenueToken (in wei). The `supplyCap` should match the campaign's `targetAmount` to ensure the token supply can cover all investments.

#### Compliance Modules

| Module | Purpose |
|--------|---------|
| ComplianceRules | Central engine: accreditation, investment limits, regional restrictions |
| InvestorTypeCompliance | Transfer velocity, holding periods, cooldowns |
| RenterCompliance | Age, license, insurance, credit score, blacklist |
| OperationalCompliance | Vehicle registration, maintenance, insurance coverage |
| TransferRestrictions | Whitelist tiers, lock-up periods, max transfer size |
| ComplianceRegistry | Aggregates all modules for single-call checks |

---

### 2. Investor Management System

#### Investor Types

| Type | Lock Requirement | Min Investment | Max Investment | Lock-up |
|------|-----------------|----------------|----------------|---------|
| RETAIL (1) | 0.01 ETH | 0.001 ETH | 1 ETH per vehicle | 6 months |
| ACCREDITED (2) | 0.1 ETH | 0.1 ETH | 10 ETH total | 3 months |
| INSTITUTIONAL (3) | 1 ETH | 1 ETH | No max | 12 months |

#### Tiered Onboarding Flow

The onboarding flow differs by investor type. **RETAIL** investors use a simplified direct-lock flow. **ACCREDITED/INSTITUTIONAL** investors use a 2-of-2 MultiSigWallet.

**RETAIL Investor Flow (2 steps)**:
```
1. User calls requestInvestorStatus(RETAIL)
   ├── Requires: verified OnchainID (KYC)
   ├── Requires: no existing active request
   └── Status → PENDING

2. User calls lockFundsDirect{value: 0.01 ether}()
   ├── ETH held in InvestorRequestManager contract
   ├── Excess ETH auto-refunded
   └── Status → TOKENSLOCKED (skips WALLETCREATED)

3. Admin/Bank calls approveRequest(user)
   ├── Verifies directLocks[user] >= requiredAmount
   ├── Assigns investor type in InvestorTypeRegistry
   └── Status → APPROVED

4. User calls withdrawDirectLock()
   └── Reclaims locked ETH after approval/rejection
```

**ACCREDITED/INSTITUTIONAL Investor Flow (5 steps)**:
```
1. User calls requestInvestorStatus(ACCREDITED|INSTITUTIONAL)
   └── Status → PENDING

2. Admin/Bank calls createMultiSigWallet(user)
   ├── Deploys new MultiSigWallet(user, bank)
   └── Status → WALLETCREATED

3. User sends ETH to MultiSigWallet, calls lockFunds{value: amount}()
   └── ETH locked in wallet (only user can lock)

4. User calls confirmTokensLocked()
   ├── Verifies MultiSigWallet.getLockedBalance() >= required
   └── Status → TOKENSLOCKED

5. Admin/Bank calls approveRequest(user)
   ├── Verifies wallet balance still sufficient
   ├── Assigns investor type in InvestorTypeRegistry
   └── Status → APPROVED

   (Unlock from MultiSigWallet requires 2-of-2 proposal: user + bank)
```

**Request Statuses**: `NONE` → `PENDING` → `WALLETCREATED`* → `TOKENSLOCKED` → `APPROVED` | `REJECTED`
(*RETAIL skips WALLETCREATED)

#### InvestorRequestManager — Frontend Integration

```solidity
// Constructor: (address _bank, address _investorRegistry, address _identityRegistry)

// --- User Functions ---
requestInvestorStatus(InvestorType requestedType)           // Start onboarding
lockFundsDirect() payable                                    // RETAIL: lock ETH directly
withdrawDirectLock()                                         // RETAIL: reclaim after finalized
confirmTokensLocked()                                        // ACCREDITED/INSTITUTIONAL: confirm multisig lock

// --- Admin/Bank Functions ---
createMultiSigWallet(address user)                           // ACCREDITED/INSTITUTIONAL only
approveRequest(address user)                                 // Approve after TOKENSLOCKED
rejectRequest(address user, string reason)                   // Reject with reason

// --- View Functions ---
getRequest(address user) → (type, requiredLock, wallet, status, createdAt, approvedAt, reason)
directLocks(address user) → uint256                          // RETAIL lock balance
lockRequirements(InvestorType) → uint256                     // Required lock per type
canInvestInVehicle(address, uint256 vehicleId, uint256 amount) → (bool, uint8 reason)
getVehicleInvestment(address, uint256 vehicleId) → uint256
getTotalInvestment(address) → uint256
hasActiveRequest(address) → bool

// --- Payment Protocol Integration ---
recordVehicleInvestment(address investor, uint256 vehicleId, uint256 amount) // Called by payment protocol
setPaymentProtocol(address)                                  // Owner only
```

#### MultiSigWallet — Frontend Integration

```solidity
// Constructor: (address _user, address _bank)

lockFunds() payable                           // User locks ETH
proposeUnlock(uint256 amount, address recipient, string reason) → bytes32   // Either party
signUnlock(bytes32 proposalId)                // Other party signs (auto-executes at 2 sigs)

// View
getWalletStatus() → (bank, user, lockedAmount, balance)
getLockedBalance() → uint256
getProposal(bytes32) → (proposer, amount, recipient, reason, userSigned, bankSigned, executed, createdAt)
```

---

### 3. Payment System (Native ETH)

All payments use native ETH via `msg.value`. No ERC-20 tokens.

#### Architecture

```
                    ┌─────────────────────────┐
                    │   RegShieldPaymentProtocol│ ← Investment payments
                    │   (payable functions)      │
                    └──────────┬────────────────┘
                               │
                    ┌──────────▼────────────────┐
                    │    PaymentEscrow           │ ← Holds ETH in escrow
                    │    (investment instance)    │
                    └──────────┬────────────────┘
                               │
                    ┌──────────▼────────────────┐
                    │    RefundManager           │ ← Processes refunds
                    │    (investment instance)    │
                    └───────────────────────────┘

                    ┌─────────────────────────┐
                    │   RentalPaymentProtocol  │ ← Rental payments
                    │   (payable functions)     │
                    └──────────┬───────────────┘
                               │
                    ┌──────────▼───────────────┐
                    │    PaymentEscrow          │ ← Holds ETH in escrow
                    │    (rental instance)       │
                    └──────────┬───────────────┘
                               │
                    ┌──────────▼───────────────┐
                    │    RefundManager          │ ← Processes refunds
                    │    (rental instance)       │
                    └───────────────────────────┘

                    ┌───────────────────────────┐
                    │    DisputeResolver         │ ← Multi-oracle voting
                    └───────────────────────────┘
```

Each `PaymentEscrow` is tied to ONE protocol. Two instances are deployed: one for investments, one for rentals.

#### RegShieldPaymentProtocol (Investment Payments)

Handles capital raising with milestone-based fund release.

```solidity
// Constructor: (address _complianceRules, address _identityRegistry)

// --- Investor-facing ---
initiateVehicleInvestment(uint256 vehicleId, address rentor, uint256 amount, string reason) payable → uint256 paymentId
// msg.value = investment amount + escrow fee

// --- Admin/CRE Functions ---
completeMilestone(uint256 paymentId, string milestone)    // Mark milestone done
releaseMilestoneFunds(uint256 paymentId)                  // Release after all milestones
registerVehicleTokens(uint256 vehicleId, address assetToken, address revenueToken)
setAuthorizedOperator(address operator, bool authorized)   // Authorize CRE receivers

// --- View ---
getPayment(uint256 paymentId) → Payment
getVehiclePayments(uint256 vehicleId) → uint256[]
getMilestoneStatus(uint256 paymentId) → MilestoneStatus
getVehicleInvestmentTotal(uint256 vehicleId) → uint256
```

**Milestones** (must all complete before fund release):
1. `"VEHICLE_IDENTIFIED"` — Vehicle identified and inspected
2. `"PURCHASE_VERIFIED"` — Purchase agreement verified
3. `"INSURANCE_OBTAINED"` — Insurance obtained
4. `"REGISTRATION_COMPLETED"` — Registration completed

**Investment Flow**:
```
Investor sends ETH → RegShieldPaymentProtocol.initiateVehicleInvestment{value}()
    → Compliance check (OnchainID + InvestorType)
    → ETH forwarded to PaymentEscrow.createEscrow{value}()
    → Milestones completed (by CRE or admin)
    → releaseMilestoneFunds() releases ETH to rentor
    → AssetToken + RevenueToken minted to investor
```

#### RentalPaymentProtocol (Rental Payments)

```solidity
// Constructor: (address _paymentEscrow, address _identityRegistry, address _participantTypeRegistry, address _renterCompliance)

// --- Renter-facing ---
createRentalBooking(uint256 bookingId, uint256 vehicleId, address rentor,
    uint256 rentalFee, uint256 securityDeposit, uint256 startTime, uint256 endTime) payable → uint256 paymentId
// msg.value = rentalFee + securityDeposit + escrow fee

// --- Operator Functions ---
startRental(uint256 paymentId)
completeRental(uint256 paymentId, uint256 penaltyAmount, PenaltyReason reason, string description)
cancelRental(uint256 paymentId)

// --- View ---
getRentalPayment(uint256 paymentId) → RentalPayment
getVehicleRentalPayments(uint256 vehicleId) → uint256[]
platformFeeRate() → uint256   // Default: 500 = 5%
```

#### PaymentEscrow

```solidity
// Constructor: (address _paymentProtocol)

// --- Protocol-only ---
createEscrow(uint256 paymentId, address payer, address payee, uint256 amount, uint256 duration) payable → uint256 escrowId

// --- View ---
getEscrowDetails(uint256 escrowId) → EscrowDetails
getEscrowByPayment(uint256 paymentId) → uint256
isEscrowExpired(uint256 escrowId) → bool
calculateEscrowFee(uint256 amount) → uint256    // Default: 10 bps = 0.1%

// --- Public ---
processExpiredEscrow(uint256 escrowId)
batchProcessExpiredEscrows(uint256[] escrowIds)
```

#### RefundManager

```solidity
// Constructor: (address _paymentProtocol, address _paymentEscrow)

requestRefund(uint256 paymentId, RefundType, RefundReason, string description, bytes32 evidenceHash) → uint256 refundId
approveRefund(uint256 refundId)           // Processor only
processRefund(uint256 refundId)           // Execute approved refund
canRequestRefund(uint256 paymentId, address requester) → bool
getRefundRequest(uint256 refundId) → RefundRequest
```

**RefundTypes**: `AUTOMATIC` (auto-approved), `MANUAL` (needs approval), `DISPUTE` (from arbitration), `EMERGENCY`

#### DisputeResolver

```solidity
// Constructor: (address _paymentProtocol)

fileDispute(uint256 paymentId, string reason, bytes32 evidenceHash) → uint256 disputeId
submitOracleVote(uint256 disputeId, bool favorsPayer, string reasoning)  // Oracle only
resolveDispute(uint256 disputeId)                                         // Tally and resolve
appealDispute(uint256 disputeId, string reason)
getDispute(uint256 disputeId) → (...)
getVoteCounts(uint256 disputeId) → (forPayer, forPayee)
```

**Outcomes**: `PENDING`, `FAVOR_PAYER`, `FAVOR_PAYEE`, `PARTIAL_REFUND`, `ESCALATED`

---

### 4. Vehicle Registry

#### VehicleNFT (ERC-721)

Each vehicle is a unique NFT with metadata, linked to AssetToken and RevenueToken.

```solidity
// Constructor: none (name: "RegShield Vehicle", symbol: "RSVEH")

// --- Rentor Functions ---
mintVehicle(address to, VehicleMetadata metadata, address assetToken, address revenueToken) → uint256 tokenId

// --- Operator/System Functions ---
updateStatus(uint256 tokenId, VehicleStatus newStatus)         // Rental contract
updateMileage(uint256 tokenId, uint256 newMileage)             // Operator/CRE
recordMaintenance(uint256 tokenId, string description, uint256 cost) → uint256
recordIncident(uint256 tokenId, string description, uint256 estimatedCost, uint256 bookingId) → uint256
resolveIncident(uint256 tokenId, uint256 incidentId, uint256 actualCost)
setCurrentBooking(uint256 tokenId, uint256 bookingId)          // Rental contract
linkTokens(uint256 tokenId, address assetToken, address revenueToken)

// --- View ---
getVehicleMetadata(uint256 tokenId) → VehicleMetadata
getVehicleInfo(uint256 tokenId) → (metadata, status, currentBooking, maintenanceCount, incidentCount)
getLinkedTokens(uint256 tokenId) → (assetToken, revenueToken)
isVINRegistered(string vin) → bool
getTokenIdByVIN(string vin) → uint256
```

**VehicleStatus**: `Available`, `Rented`, `InMaintenance`, `Retired`

**VehicleMetadata**: `{ vin, make, model, year, color, mileage, registrationExpiry, insuranceExpiry }`

---

### 5. Rental Management

#### RentalBooking

```solidity
// Constructor: (address _vehicleNFT, address _renterCompliance, address _rentalPaymentProtocol)

// --- Renter Functions ---
requestBooking(uint256 vehicleId, uint256 startTime, uint256 endTime, uint256 ratePerDay, uint256 securityDeposit) payable → uint256 bookingId
extendRental(uint256 bookingId, uint256 additionalDays) payable → uint256 newEndTime
initiateReturn(uint256 bookingId)
reportIssue(uint256 bookingId, string issue)
disputeCharges(uint256 bookingId, uint256 disputedAmount, string reason)

// --- Admin/Operator Functions ---
approveBooking(uint256 bookingId)
startRental(uint256 bookingId, ConditionReport preCondition)
completeReturn(uint256 bookingId, ConditionReport postCondition, uint256 damageCharges)

// --- View ---
getBooking(uint256 bookingId) → Booking
isVehicleAvailable(uint256 vehicleId, uint256 startTime, uint256 endTime) → bool
calculateBookingCost(uint256 startTime, uint256 endTime, uint256 ratePerDay) → uint256
```

**BookingStatus**: `REQUESTED` → `PENDING_APPROVAL` → `APPROVED` → `ACTIVE` → `PENDING_RETURN` → `COMPLETED` | `CANCELLED` | `DISPUTED`

**Constraints**: Min 1 hour, max 90 days, max 5 extensions

#### RentalOperations

```solidity
// Constructor: (address _rentalBooking, address _vehicleNFT)

// --- Operator Functions ---
createPreRentalReport(bookingId, vehicleId, mileage, fuelLevel, photoHashes, damageNotes) → ConditionReport
createPostRentalReport(bookingId, vehicleId, mileage, fuelLevel, photoHashes, damageNotes) → ConditionReport
performHandover(uint256 bookingId, ConditionReport preReport)
processReturn(uint256 bookingId, ConditionReport postReport)
assessDamage(bookingId, damages, costs, evidenceHashes) → uint256 assessmentId
approveDamageAssessment(bookingId, assessmentId, finalCost)
calculateOverdueCharges(uint256 bookingId) → uint256
```

---

### 6. Revenue Distribution

#### RevenueDistributor

Distributes rental revenue using a waterfall deduction model.

```solidity
// Constructor: none (sets default percentages)

// --- Source Functions ---
addRevenue(uint256 vehicleId, uint256 amount) payable        // From authorized source (rental protocol)
registerVehicle(uint256 vehicleId, address revenueToken)     // Link vehicle to RevenueToken
setVehicleOperator(uint256 vehicleId, address operator)      // Set rentor as vehicle operator

// --- Distribution ---
distributeRevenue(uint256 vehicleId) → uint256 distributionId    // Apply waterfall
claimRevenue(uint256 vehicleId) → uint256 amount                 // Token holder claims
batchClaimRevenue(uint256[] vehicleIds) → uint256 totalClaimed
withdrawOperatorFees(uint256 vehicleId)                          // Operator claims their fee

// --- View ---
getClaimableRevenue(uint256 vehicleId, address holder) → uint256
getVehicleRevenue(uint256 vehicleId) → VehicleRevenue
calculateWaterfall(uint256 grossRevenue) → RevenueAllocation
getOperatorFees(uint256 vehicleId) → uint256
getVehicleOperator(uint256 vehicleId) → address
```

**Revenue Waterfall**:
```
Gross Rental Income (100%)
  ├── Platform Fee:        15%  → Protocol treasury
  ├── Maintenance Reserve: 10%  → Per-vehicle escrow
  ├── Insurance Premium:    5%  → Coverage payments
  ├── Operating Costs:     10%  → Gas, cleaning, parking
  ├── Operator Fee:        10%  → Vehicle operator (rentor)
  └── Net Distributable:   50%  → RevenueToken holders (proportional)
```

---

### 7. Chainlink CRE Integration

Four receiver contracts bridge off-chain CRE computations to on-chain actions. Each receiver accepts reports from the Chainlink forwarder only.

| Receiver | Target Contract | Actions |
|----------|----------------|---------|
| ComplianceReceiver | RenterCompliance, OperationalCompliance | RECORD_INCIDENT, BLACKLIST_RENTER, RENEW_REGISTRATION, SUSPEND_VEHICLE, etc. |
| PaymentReceiver | RegShieldPaymentProtocol | Complete milestones: VEHICLE_IDENTIFIED, PURCHASE_VERIFIED, INSURANCE_OBTAINED, REGISTRATION_COMPLETED |
| VehicleReceiver | VehicleNFT | UPDATE_MILEAGE, RECORD_MAINTENANCE, RECORD_INCIDENT, RESOLVE_INCIDENT |
| OnboardingReceiver | InvestorRequestManager, RentalBooking | APPROVE_INVESTOR, REJECT_INVESTOR, APPROVE_BOOKING, REJECT_BOOKING |

**CRE Report Flow**:
```
Off-chain CRE service → Chainlink forwarder → Receiver._processReport(bytes)
    → Decodes action + params → Calls target contract function
```

All receivers require `CRE_FORWARDER` address set during deployment (Phase 8).

---

## Data Flow Diagrams

### Investment Flow
```
Rentor (Vehicle Setup)
  │
  ├─0a→ mintVehicle(metadata)                    [VehicleNFT]
  ├─0b→ deployAssetToken(name, symbol, cap, VIN) [AssetTokenFactory]
  ├─0c→ deployRevenueToken(name, symbol, ...)    [RevenueTokenFactory]
  │     (Admin registers tokens)
  ├─0d→ registerVehicleTokens(vehicleId, ...)    [RegShieldPaymentProtocol]
  ├─0e→ registerVehicle(vehicleId, revenueToken) [RevenueDistributor]
  └─0f→ setVehicleOperator(vehicleId, rentor)    [RevenueDistributor]

Investor
  │
  ├─1─→ requestInvestorStatus(RETAIL)           [InvestorRequestManager]
  ├─2─→ lockFundsDirect{value: 0.01 ETH}()     [InvestorRequestManager]
  │     (Admin approves → investor type assigned)
  ├─3─→ withdrawDirectLock()                     [InvestorRequestManager] (reclaim lock)
  │
  ├─4─→ initiateVehicleInvestment{value}()       [RegShieldPaymentProtocol]
  │     ├── Compliance check (OnchainID + type)
  │     └── ETH → PaymentEscrow
  │
  │     (CRE completes milestones off-chain)
  │     (Admin/CRE calls completeMilestone x4)
  │
  └─5─→ releaseMilestoneFunds()                  [RegShieldPaymentProtocol]
        ├── ETH released to rentor
        └── _mintInvestorTokens(): 1:1 AssetToken + RevenueToken → investor
```

### Rental Flow
```
Renter
  │
  ├─1─→ requestBooking{value: fee + deposit}()   [RentalBooking]
  │     (Compliance check via OnchainID)
  │
  ├─2─→ approveBooking()                         [RentalBooking] (admin/CRE)
  │
  ├─3─→ startRental() + performHandover()        [RentalBooking + RentalOperations]
  │     ├── Pre-rental condition report
  │     └── Vehicle status → Rented
  │
  ├─4─→ (Active rental: telematics via CRE)
  │
  ├─5─→ initiateReturn()                         [RentalBooking]
  │
  └─6─→ completeReturn() + processReturn()       [RentalBooking + RentalOperations]
        ├── Post-rental condition report
        ├── Damage assessment
        ├── Deposit settlement
        ├── Revenue → RevenueDistributor
        └── Vehicle status → Available
```

### Revenue Claim Flow
```
RevenueToken Holder
  │
  ├─→ getClaimableRevenue(vehicleId, holder)     [RevenueDistributor] (check)
  └─→ claimRevenue(vehicleId)                    [RevenueDistributor] (claim ETH)
```

---

## Access Control Summary

| Role | Can Call |
|------|---------|
| **Owner** (deployer) | All admin functions, setters, operator management |
| **Bank** | createMultiSigWallet, approveRequest, rejectRequest |
| **Investor** (verified) | requestInvestorStatus, lockFundsDirect, confirmTokensLocked, withdrawDirectLock, initiateVehicleInvestment |
| **Renter** (verified) | requestBooking, extendRental, initiateReturn, reportIssue, disputeCharges |
| **Rentor** (verified) | mintVehicle, manage vehicle metadata |
| **Operator** (authorized) | Vehicle updates, condition reports, milestone completions |
| **CRE Forwarder** | Receiver._processReport (Chainlink only) |
| **Payment Protocol** | recordVehicleInvestment (on InvestorRequestManager) |

---

## Environment Variables

Key `.env` variables needed for deployment:

```bash
PRIVATE_KEY=0x...              # Deployer private key
OWNER=0x...                    # Contract owner address
SEPOLIA_RPC_URL=...            # Sepolia RPC endpoint
ETHERSCAN_API_KEY=...          # For contract verification
BANK_ADDRESS=0x...             # Banking institution (defaults to OWNER)
CRE_FORWARDER=0x...            # Chainlink forwarder (required for Phase 8)
```

After each phase, deployed addresses are saved and referenced in subsequent phases (e.g., `IDENTITY_REGISTRY`, `COMPLIANCE_RULES`, etc.).

---

## Security Considerations

1. **ReentrancyGuard**: All ETH-transferring functions use OpenZeppelin ReentrancyGuard
2. **ETH Transfers**: All use `.call{value:}` pattern (not deprecated `.transfer()`)
3. **Access Control**: Ownable + role-based checks (bank, operator, CRE forwarder)
4. **Multi-signature**: 2-of-2 for accredited/institutional fund unlocks
5. **Escrow Pattern**: Funds held in dedicated escrow contracts, not in protocol contracts
6. **Compliance Gates**: All user-facing payment functions check OnchainID verification
7. **Excess Refunds**: Payable functions refund overpayment automatically
8. **Emergency Controls**: Pause functionality, emergency refund authority on escrows
9. **CRE Proofs**: TEE-signed attestations verified on-chain before state changes
10. **Event Logging**: All state transitions emit events for frontend indexing

---

## Frontend Integration Checklist

1. **Connect wallet** — User's own EOA (MetaMask, WalletConnect)
2. **Check identity** — `identityRegistry.isVerified(address)` before any action
3. **Check investor type** — `investorRegistry.getInvestorType(address)` for investment limits
4. **Check participant type** — `participantTypeRegistry.getParticipantType(address)` for role
5. **Read contract addresses** — From `deployed-addresses.env` or `.env`
6. **Send ETH with transactions** — All payment/lock functions are `payable` (use `msg.value`)
7. **Listen to events** — Subscribe to contract events for real-time UI updates
8. **Calculate fees** — `paymentEscrow.calculateEscrowFee(amount)` before sending
9. **Check availability** — `rentalBooking.isVehicleAvailable(vehicleId, start, end)`
10. **Check claimable** — `revenueDistributor.getClaimableRevenue(vehicleId, holder)`
11. **Deploy tokens** — `assetTokenFactory.deployAssetToken(...)` + `revenueTokenFactory.deployRevenueToken(...)`, parse event logs for deployed addresses
12. **Register tokens** — Admin calls `paymentProtocol.registerVehicleTokens(vehicleId, asset, revenue)` + `revenueDistributor.registerVehicle(vehicleId, revenueToken)` + `revenueDistributor.setVehicleOperator(vehicleId, rentor)`
13. **Manage milestones** — Admin calls `paymentProtocol.completeMilestone(paymentId, milestone)` + `paymentProtocol.releaseMilestoneFunds(paymentId)`
14. **Add revenue** — Admin calls `revenueDistributor.addRevenue{value}(vehicleId, 0)` + `revenueDistributor.distributeRevenue(vehicleId)`
15. **Withdraw operator fees** — Rentor calls `revenueDistributor.withdrawOperatorFees(vehicleId)`
