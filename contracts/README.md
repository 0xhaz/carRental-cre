# RegShield — Rental Car Tokenization Platform

A decentralized rental car platform combining vehicle tokenization, compliant investment mechanisms, and operational rental management. Built on **ERC-3643** security tokens with **Chainlink CRE** for off-chain computation. All payments use **native ETH**.

## Project Structure

```
contracts/
├── src/
│   ├── onchainId/           # ERC-734/735 identity (OnchainIDFactory, ClaimIssuer, KeyManager)
│   ├── erc3643/             # Security tokens, registries & token factories
│   │   ├── AssetToken.sol   # Fractional vehicle ownership (ERC-3643)
│   │   ├── RevenueToken.sol # Revenue rights token (ERC-3643)
│   │   ├── TokenFactory.sol # AssetTokenFactory + RevenueTokenFactory (per-vehicle deployment)
│   │   └── ...              # IdentityRegistry, InvestorTypeRegistry, etc.
│   ├── compliance/          # Compliance modules (ComplianceRules, InvestorType, Renter, Operational, Transfer)
│   ├── vehicle/             # VehicleNFT (ERC-721)
│   ├── rental/              # RentalBooking, RentalOperations
│   ├── payment/             # RegShieldPaymentProtocol, RentalPaymentProtocol, PaymentEscrow, RefundManager, DisputeResolver
│   ├── investor/            # InvestorRequestManager, MultiSigWallet
│   ├── revenue/             # RevenueDistributor
│   ├── cre/                 # Chainlink CRE receivers (Compliance, Payment, Vehicle, Onboarding, CampaignMonitor)
│   ├── interfaces/          # All interface definitions
│   └── mocks/               # Test mocks
├── script/                  # Foundry deployment scripts (01-09 phased + DeployAll)
├── test/                    # Foundry tests
├── ARCHITECTURE.md          # Detailed architecture & frontend integration reference
├── DEPLOYMENT.md            # Deployment guide
├── deploy-phased.sh         # Phased deployment script
├── extract-addresses.sh     # Extract deployed addresses from broadcast artifacts
└── foundry.toml             # Foundry configuration
```

## Prerequisites

- [Foundry](https://book.getfoundry.sh/getting-started/installation) (forge, cast, anvil)
- Git

## Quick Start

```bash
# Clone and enter the contracts directory
git clone <repo-url>
cd RegShield/contracts

# Install dependencies
forge install

# Copy environment config
cp .env.example .env
# Edit .env with your private key, RPC URL, etc.

# Build
forge build

# Run tests
forge test

# Run tests with verbosity
forge test -vvv
```

## Environment Variables

```bash
# Required
PRIVATE_KEY=0x...                    # Deployer private key
OWNER=0x...                          # Contract owner address
SEPOLIA_RPC_URL=https://...          # Sepolia RPC endpoint

# Optional
ETHERSCAN_API_KEY=...                # For contract verification
BANK_ADDRESS=0x...                   # Banking institution (defaults to OWNER)
CRE_FORWARDER=0x...                  # Chainlink forwarder (required for Phase 8)

# After deployment, add deployed addresses for subsequent phases:
# IDENTITY_REGISTRY=0x...
# COMPLIANCE_RULES=0x...
# (etc. — see deployed-addresses.env after running extract-addresses.sh)
```

## Deployment

### Phased Deployment (Recommended)

Deploy contracts in 8 phases to avoid RPC rate limits. Each phase depends on the previous one.

```bash
# Deploy Phase 1: OnchainID Infrastructure
./deploy-phased.sh 1
# → Save ONCHAINID_FACTORY, CLAIM_ISSUER, KEY_MANAGER to .env

# Deploy Phase 2: Registries
./deploy-phased.sh 2
# → Save TRUSTED_ISSUERS_REGISTRY, CLAIM_TOPICS_REGISTRY, etc. to .env

# Continue through phases 3-9...
./deploy-phased.sh 3   # Compliance Modules
./deploy-phased.sh 4   # Identity Registry
./deploy-phased.sh 5   # Vehicle & Rental
./deploy-phased.sh 6   # Payment System (Native ETH)
./deploy-phased.sh 7   # Revenue & Investor Management
./deploy-phased.sh 8   # CRE Receiver Proxies
./deploy-phased.sh 9   # Token Factories (AssetTokenFactory + RevenueTokenFactory)

# Or deploy all phases sequentially (with auto-delays)
./deploy-phased.sh all
```

### Extract Deployed Addresses

After deployment, extract contract addresses from forge broadcast artifacts:

```bash
./extract-addresses.sh
# Outputs to deployed-addresses.env
# Copy to frontend .env for integration
```

### Deploy All at Once (Local/Testing)

```bash
forge script script/DeployAll.s.sol --rpc-url $SEPOLIA_RPC_URL --broadcast --slow --legacy -vv
```

## Architecture Overview

**34 contracts** across 9 deployment phases:

| Layer | Contracts | Purpose |
|-------|-----------|---------|
| Identity | OnchainIDFactory, ClaimIssuer, KeyManager | ERC-734/735 decentralized identity |
| Registries | TrustedIssuers, ClaimTopics, InvestorType, ParticipantType | Claim management & role assignment |
| Compliance | ComplianceRules, InvestorType, Renter, Operational, Transfer, Registry | Multi-layer compliance validation |
| Identity Registry | IdentityRegistry | Address-to-identity mapping |
| Vehicle | VehicleNFT | ERC-721 vehicle representation |
| Rental | RentalBooking, RentalOperations | Booking lifecycle & condition tracking |
| Payment | RegShieldPaymentProtocol, RentalPaymentProtocol, 2x PaymentEscrow, 2x RefundManager, DisputeResolver | Native ETH escrow, refunds, disputes |
| Investor | InvestorRequestManager, MultiSigWallet | Tiered investor onboarding |
| Revenue | RevenueDistributor | Waterfall revenue distribution |
| CRE | ComplianceReceiver, PaymentReceiver, VehicleReceiver, OnboardingReceiver, CampaignMonitorReceiver | Chainlink off-chain bridge |
| Token Factories | AssetTokenFactory, RevenueTokenFactory | Per-vehicle ERC-3643 token deployment |

See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed function signatures, data flows, and frontend integration guide.

## Key User Flows

### Investor Onboarding (RETAIL — 2-step direct lock)

```
1. requestInvestorStatus(RETAIL)           → Status: PENDING
2. lockFundsDirect{value: 0.01 ether}()   → Status: TOKENSLOCKED
   (Admin approves)                        → Status: APPROVED
3. withdrawDirectLock()                    → Reclaim locked ETH
```

### Investor Onboarding (ACCREDITED/INSTITUTIONAL — 5-step MultiSig)

```
1. requestInvestorStatus(ACCREDITED)       → Status: PENDING
   (Admin creates MultiSigWallet)          → Status: WALLETCREATED
2. MultiSigWallet.lockFunds{value}()       → ETH locked in wallet
3. confirmTokensLocked()                   → Status: TOKENSLOCKED
   (Admin approves)                        → Status: APPROVED
```

### Vehicle Setup (Prerequisite for Investment)

```
1. Rentor mints VehicleNFT
2. Rentor deploys tokens via factories:
   AssetTokenFactory.deployAssetToken(name, symbol, supplyCap, VIN)
   RevenueTokenFactory.deployRevenueToken(name, symbol, supplyCap, VIN, holdingPeriod)
3. Admin registers tokens:
   PaymentProtocol.registerVehicleTokens(vehicleId, assetToken, revenueToken)
   RevenueDistributor.registerVehicle(vehicleId, revenueToken)
   RevenueDistributor.setVehicleOperator(vehicleId, rentorAddress)
```

### Vehicle Investment

```
1. initiateVehicleInvestment{value: amount}(vehicleId, rentor, amount, reason)
   → ETH escrowed, compliance checked
2. completeMilestone(paymentId, "VEHICLE_IDENTIFIED")
   completeMilestone(paymentId, "PURCHASE_VERIFIED")
   completeMilestone(paymentId, "INSURANCE_OBTAINED")
   completeMilestone(paymentId, "REGISTRATION_COMPLETED")
3. releaseMilestoneFunds(paymentId)
   → ETH released to rentor
   → AssetToken + RevenueToken minted to investor (1:1 with investment amount)
```

### Rental Booking

```
1. requestBooking{value: fee + deposit}(vehicleId, start, end, rate, deposit)
2. (Admin) approveBooking(bookingId)
3. startRental(bookingId, preCondition)    → Vehicle status: Rented
4. initiateReturn(bookingId)
5. completeReturn(bookingId, postCondition, damageCharges)
   → Deposit settled, revenue distributed
```

### Revenue Claiming

```
1. getClaimableRevenue(vehicleId, holder)  → Check pending amount
2. claimRevenue(vehicleId)                 → Receive ETH
   // or batchClaimRevenue([vehicleId1, vehicleId2, ...])
```

## Investor Types & Limits

| Type | Lock Requirement | Min/Max Investment | Lock-up |
|------|-----------------|-------------------|---------|
| RETAIL | 0.01 ETH (direct lock) | 0.001 - 1 ETH per vehicle | 6 months |
| ACCREDITED | 0.1 ETH (MultiSigWallet) | 0.1 - 10 ETH total | 3 months |
| INSTITUTIONAL | 1 ETH (MultiSigWallet) | 1 ETH+ (no max) | 12 months |

## Revenue Waterfall

```
Gross Rental Income (100%)
  ├── Platform Fee:        15%  → Protocol treasury
  ├── Maintenance Reserve: 10%  → Per-vehicle escrow
  ├── Insurance Premium:    5%  → Coverage payments
  ├── Operating Costs:     10%  → Gas, cleaning, parking
  ├── Operator Fee:        10%  → Vehicle operator (rentor)
  └── Net Distributable:   50%  → RevenueToken holders (proportional)
```

## Testing

```bash
# Run all tests
forge test

# Run with gas reporting
forge test --gas-report

# Run specific test file
forge test --match-path test/payment/PaymentEscrow.t.sol

# Run with verbosity
forge test -vvvv

# Fork testing against Sepolia
forge test --fork-url $SEPOLIA_RPC_URL
```

## Local Development

```bash
# Start local node
anvil

# Deploy to local node
forge script script/DeployAll.s.sol --rpc-url http://127.0.0.1:8545 --broadcast

# Interact with contracts via cast
cast call $CONTRACT_ADDRESS "functionName(args)" --rpc-url http://127.0.0.1:8545
cast send $CONTRACT_ADDRESS "functionName(args)" --private-key $PRIVATE_KEY --rpc-url http://127.0.0.1:8545
```

## Security

- All ETH transfers use `.call{value:}` (not deprecated `.transfer()`)
- `ReentrancyGuard` on all payable/ETH-transferring functions
- Role-based access control (Ownable + custom bank/operator checks)
- Escrow pattern: funds held in dedicated escrow contracts
- Compliance gates on all user-facing payment functions
- Excess ETH auto-refunded on payable functions
- 2-of-2 MultiSigWallet for accredited/institutional fund locks

## Chainlink CRE Integration

RegShield uses Chainlink CRE (Compute Runtime Environment) for off-chain workflow orchestration. The CRE workflow monitors on-chain investment payments and automatically verifies milestones using external APIs.

### Key Chainlink Files

| File | Description |
|------|-------------|
| [`rental-cre/rental-workflow/main.ts`](../rental-cre/rental-workflow/main.ts) | Vehicle Investment Lifecycle CRE workflow — reads chain state, calls NHTSA VIN decoder API, submits milestone reports |
| [`rental-cre/rental-workflow/config.staging.json`](../rental-cre/rental-workflow/config.staging.json) | Workflow config with contract addresses and cron schedule |
| [`rental-cre/rental-workflow/workflow.yaml`](../rental-cre/rental-workflow/workflow.yaml) | CRE workflow settings (staging + production targets) |
| [`rental-cre/project.yaml`](../rental-cre/project.yaml) | CRE project settings with RPC endpoints |
| [`src/cre/PaymentReceiver.sol`](src/cre/PaymentReceiver.sol) | On-chain receiver for milestone verification reports |
| [`src/cre/ComplianceReceiver.sol`](src/cre/ComplianceReceiver.sol) | On-chain receiver for compliance actions (blacklist, suspend) |
| [`src/cre/VehicleReceiver.sol`](src/cre/VehicleReceiver.sol) | On-chain receiver for vehicle state updates (mileage, maintenance) |
| [`src/cre/OnboardingReceiver.sol`](src/cre/OnboardingReceiver.sol) | On-chain receiver for investor/booking approval actions |
| [`src/interfaces/cre/ReceiverTemplate.sol`](src/interfaces/cre/ReceiverTemplate.sol) | Base receiver with forwarder validation and security layers |

### CRE Workflow Architecture

```
CRE Workflow (main.ts)
  │
  ├─ CronCapability: triggers every 30 seconds
  │
  ├─ EVMClient.callContract() ──→ Read on-chain state
  │   ├─ RegShieldPaymentProtocol.totalPayments()
  │   ├─ RegShieldPaymentProtocol.getMilestoneStatus(paymentId)
  │   ├─ VehicleNFT.getVehicleMetadata(vehicleId)
  │   └─ VehicleNFT.getVehicleStatus(vehicleId)
  │
  ├─ HTTPClient.sendRequest() ──→ NHTSA VIN Decoder API
  │   └─ https://vpic.nhtsa.dot.gov/api/vehicles/decodevin/{VIN}
  │
  └─ EVMClient.writeReport() ──→ PaymentReceiver.onReport()
      └─ abi.encode(paymentId, milestoneName)
          ├─ "VEHICLE_IDENTIFIED"      (NHTSA VIN validation)
          ├─ "PURCHASE_VERIFIED"       (on-chain status + escrow)
          ├─ "INSURANCE_OBTAINED"      (on-chain expiry check)
          └─ "REGISTRATION_COMPLETED"  (on-chain expiry check)
```

### Running the CRE Workflow

```bash
cd rental-cre

# Install dependencies
cd rental-workflow && bun install && cd ..

# Simulate workflow (requires CRE CLI)
cre workflow simulate rental-workflow -T staging-settings

# Deploy workflow to Chainlink DON
cre workflow deploy rental-workflow -T staging-settings
```

## Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md) — Detailed system architecture, all function signatures, frontend integration
- [DEPLOYMENT.md](DEPLOYMENT.md) — Step-by-step deployment guide
- [SUMMARY.md](SUMMARY.md) — Executive summary and business context

## Tech Stack

- **Solidity** ^0.8.20
- **Foundry** (forge, cast, anvil)
- **OpenZeppelin** Contracts (Ownable, ReentrancyGuard, ERC721)
- **ERC-3643** Security Token Standard
- **ERC-734/735** OnchainID Identity
- **Chainlink CRE** Off-chain computation (TypeScript workflows → WASM → DON)
- **NHTSA VIN Decoder API** — Vehicle identification verification

## License

See LICENSE file.
