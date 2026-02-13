# RegShield — Proof of Concept Summary

## Executive Summary

RegShield is a **decentralized rental car platform** that combines:
- **Vehicle tokenization** (fractional ownership via ERC-3643)
- **Compliant investment** (tiered investor onboarding with KYC/AML)
- **Operational rental management** (booking, payments, condition tracking)
- **Off-chain computation** (Chainlink CRE for identity, telematics, damage assessment)

All payments use **native ETH** — no ERC-20 tokens required.

## Problem Statement

Traditional car rental and vehicle investment models face challenges:
- **Limited investment access**: High barriers for retail investors
- **Lack of transparency**: Opaque revenue distribution
- **Manual compliance**: Expensive KYC/AML processes
- **Poor capital efficiency**: Rentors struggle to scale fleets
- **Trust issues**: No verifiable vehicle condition tracking

## Solution

### Core Innovation

Separate **ownership rights** (AssetToken) from **revenue rights** (RevenueToken), enabling:
- Flexible investment structures
- Clear cap tables
- Fractional vehicle ownership
- Tradeable securities with built-in compliance

### Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Identity | ERC-734/735 (OnchainID) | Claim-based verification for all participants |
| Tokens | ERC-3643 | Compliant security tokens with modular compliance |
| Vehicles | ERC-721 | Vehicle NFTs with metadata and status tracking |
| Payments | Native ETH + Escrow | Milestone-based investment payments, rental payments |
| Off-chain | Chainlink CRE | KYC verification, telematics, damage assessment, pricing |
| Framework | Foundry (Solidity ^0.8.20) | Smart contract development, testing, deployment |

### Compliance Layer

- **3 Investor Types**: Retail, Accredited, Institutional
- **Tiered Onboarding**: RETAIL uses direct ETH lock (simple); ACCREDITED/INSTITUTIONAL use 2-of-2 MultiSigWallet
- **Transfer Restrictions**: Lock-ups, velocity limits, large transfer detection
- **Renter Compliance**: Age, license, insurance, credit score validation

## System Overview (32 Contracts)

### Deployment Phases

```
Phase 1: OnchainID Infrastructure      → Identity factory, claim issuer, key manager
Phase 2: Registries                     → Trusted issuers, claim topics, investor type, participant type
Phase 3: Compliance Modules             → Rules engine, investor/renter/operational compliance, transfer restrictions
Phase 4: Identity Registry              → Address-to-identity mapping
Phase 5: Vehicle & Rental               → VehicleNFT, RentalBooking, RentalOperations
Phase 6: Payment System (Native ETH)    → 2x payment protocols, 2x escrows, 2x refund managers, dispute resolver
Phase 7: Revenue & Investor             → Revenue distributor, investor request manager, MultiSigWallet
Phase 8: CRE Receivers                  → 4 Chainlink CRE bridge contracts
```

### Key Flows

**Investment Flow**:
```
Investor → OnchainID verified → Request investor status → Lock ETH
  → Admin approves → Invest in vehicle{value: ETH}
  → Milestones completed → Funds released to rentor
  → AssetToken + RevenueToken minted → Earn rental revenue
```

**Rental Flow**:
```
Renter → OnchainID verified → Request booking{value: fee + deposit}
  → Compliance check → Approved → Vehicle handover
  → Active rental (telematics monitoring via CRE)
  → Return → Condition inspection → Settlement
  → Revenue distributed to token holders
```

**Revenue Distribution**:
```
Gross Rental Income (100%)
  ├── Platform Fee:        15%
  ├── Maintenance Reserve: 10%
  ├── Insurance Premium:    5%
  ├── Operating Costs:     10%
  └── Net to Investors:    60%  (proportional to RevenueToken holdings)
```

## Investor Types & Onboarding

### Tiered Approach

| Type | Lock | Onboarding | Min/Max Investment | Lock-up |
|------|------|-----------|-------------------|---------|
| **RETAIL** | 0.01 ETH direct to contract | 2-step: request + lockFundsDirect | 0.001 - 1 ETH/vehicle | 6 months |
| **ACCREDITED** | 0.1 ETH in MultiSigWallet | 5-step: request + wallet + lock + confirm + approve | 0.1 - 10 ETH total | 3 months |
| **INSTITUTIONAL** | 1 ETH in MultiSigWallet | 5-step (same as accredited) | 1 ETH+ (no max) | 12 months |

**Why tiered?** Retail investors don't need the overhead of a 2-of-2 MultiSigWallet. They lock ETH directly in the InvestorRequestManager contract, and reclaim it after approval or rejection. Accredited and institutional investors use a MultiSigWallet where both the investor and a banking institution must co-sign any unlock — providing additional security for larger commitments.

## Payment System

All payments use **native ETH** sent via `msg.value`. No ERC-20 token approvals needed.

### Dual Protocol Architecture

**RegShieldPaymentProtocol** (for investments):
- Investor sends ETH → compliance checked → escrowed
- 4 milestones must complete: vehicle identified, purchase verified, insurance obtained, registration completed
- On completion: ETH released to rentor, AssetToken + RevenueToken minted

**RentalPaymentProtocol** (for rentals):
- Renter sends ETH (rental fee + security deposit) → escrowed
- On completion: fee to rentor, deposit returned (minus damages), revenue distributed

Each protocol has its own dedicated PaymentEscrow and RefundManager instance. DisputeResolver handles arbitration with multi-oracle voting.

### Refund Types
- **Automatic**: Campaign fails minimum, cancellation before start
- **Manual**: Compliance officer decision
- **Dispute**: Arbitration result
- **Emergency**: Critical issues (fraud, safety)

## Chainlink CRE Integration

Four receiver contracts bridge off-chain CRE computations to on-chain state changes:

| Receiver | Off-chain Service | On-chain Actions |
|----------|------------------|-----------------|
| ComplianceReceiver | Sanctions screening, incident monitoring | Blacklist renter, suspend vehicle, renew registration |
| PaymentReceiver | Milestone verification | Complete milestones (vehicle purchase, insurance, etc.) |
| VehicleReceiver | IoT telematics, maintenance alerts | Update mileage, record maintenance, record incidents |
| OnboardingReceiver | KYC/identity verification | Approve/reject investor requests, approve/reject bookings |

**Flow**: CRE service completes computation in TEE → generates attestation → submits via Chainlink forwarder → receiver decodes and calls target contract.

## Key Features

### For Investors
- Low minimum investment (0.001 ETH for retail)
- Passive rental income via RevenueToken
- Transparent on-chain revenue tracking
- Fractional vehicle ownership via AssetToken
- Compliant security tokens (ERC-3643)
- Simple onboarding for retail (2-step flow)

### For Rentors (Vehicle Owners)
- Access to capital via crowdfunding
- Retain operational control
- Scale fleet without traditional debt
- Automated revenue distribution
- Professional investor base
- Built-in compliance

### For Renters
- Transparent pricing
- Verified vehicle condition (pre/post reports)
- Smart contract security deposits
- Fair dispute resolution (multi-oracle)
- IoT-powered vehicle access via CRE

## Security Design

- **ReentrancyGuard** on all ETH-transferring functions
- **`.call{value:}`** for all ETH transfers (not deprecated `.transfer()`)
- **Escrow pattern**: funds held in dedicated contracts, not in protocols
- **2-of-2 MultiSig**: for accredited/institutional fund locks
- **Access control**: Ownable + bank/operator role checks
- **Compliance gates**: OnchainID verification before all payments
- **Excess refunds**: payable functions return overpayment
- **CRE proofs**: TEE-signed attestations verified on-chain

## Revenue Model Example

**Vehicle**: 2024 Tesla Model 3
**Investment**: 10 investors, 0.5 ETH each (5 ETH total)
**Daily Rate**: 0.02 ETH
**Utilization**: 70% (255 days/year)
**Annual Revenue**: 5.1 ETH

**Distribution (per year)**:
| Allocation | Rate | Amount |
|-----------|------|--------|
| Platform Fee | 15% | 0.765 ETH |
| Maintenance Reserve | 10% | 0.51 ETH |
| Insurance | 5% | 0.255 ETH |
| Operating Costs | 10% | 0.51 ETH |
| **Net to Investors** | **60%** | **3.06 ETH** |
| Per investor (10 equal shares) | | **0.306 ETH** |
| **ROI** | | **~61%** |

## Implementation Status

### Completed
- [x] 32 smart contracts written and compiled
- [x] 8-phase deployment scripts (Foundry)
- [x] Native ETH payment system (migrated from ERC-20)
- [x] Tiered investor onboarding (RETAIL direct lock, ACCREDITED/INSTITUTIONAL MultiSig)
- [x] Chainlink CRE receiver contracts
- [x] Address extraction tooling
- [x] Sepolia testnet deployment
- [x] Architecture documentation

### In Progress
- [ ] Frontend integration (Next.js)
- [ ] Backend API (Node.js)
- [ ] Unit test coverage
- [ ] Integration tests

### Future
- [ ] Security audit
- [ ] Mainnet deployment
- [ ] Mobile app
- [ ] Cross-chain support
- [ ] DAO governance
- [ ] Secondary market for token trading
- [ ] Dynamic pricing via CRE
- [ ] Insurance protocol integration

## Documentation

| Document | Purpose |
|----------|---------|
| [README.md](README.md) | Quick start, setup, deployment commands |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Detailed architecture, all function signatures, frontend integration |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Step-by-step deployment guide |
| [SUMMARY.md](SUMMARY.md) | This file — executive summary |
