# Investor Management System

Manages investor onboarding, tier-based approval workflows, ETH locking requirements, multi-signature wallet creation, and per-vehicle investment tracking.

## Contracts

### InvestorRequestManager.sol — Investor Onboarding

**Inheritance:** `Ownable`, `ReentrancyGuard`

**Constructor params:** `bank` (immutable), `investorRegistry` (IInvestorTypeRegistry, immutable), `identityRegistry` (IIdentityRegistry, immutable)

Manages the investor approval pipeline with different flows based on investor type.

**ETH Lock Requirements (testnet defaults):**

| Investor Type | Required Lock |
| --- | --- |
| RETAIL | 0.01 ETH |
| ACCREDITED | 0.1 ETH |
| INSTITUTIONAL | 1 ETH |

**Investment Limits:**

| Type | Min per Transaction | Max per Vehicle/Total |
| --- | --- | --- |
| RETAIL | 0.001 ETH | 10 ETH per vehicle |
| ACCREDITED | 0.1 ETH | 10 ETH total across all vehicles |
| INSTITUTIONAL | 1 ETH | No limit |

**Request Status Flow:** `NONE → PENDING → WALLETCREATED → TOKENSLOCKED → APPROVED`

**RETAIL Investor Flow (2-step, no MultiSig):**

1. `requestInvestorStatus(RETAIL)` → status `PENDING`
2. `lockFundsDirect()` (payable, exact ETH amount) → status `TOKENSLOCKED` directly
3. Bank/owner calls `approveRequest(user)` → verifies lock, assigns investor type on-chain, status `APPROVED`
4. Investor calls `withdrawDirectLock()` to retrieve ETH after approval or rejection

**ACCREDITED / INSTITUTIONAL Flow (3-step with MultiSig):**

1. `requestInvestorStatus(type)` → status `PENDING`
2. Bank/owner calls `createMultiSigWallet(user)` → deploys MultiSigWallet(user, bank), status `WALLETCREATED`
3. Investor sends ETH to `MultiSigWallet.lockFunds()`, then calls `confirmTokensLocked()` → verifies balance, status `TOKENSLOCKED`
4. Bank/owner calls `approveRequest(user)` → assigns type, status `APPROVED`

**Rejection:** `rejectRequest(user, reason)` — can reject at PENDING, WALLETCREATED, or TOKENSLOCKED stages.

**Investment Tracking:**

- `recordVehicleInvestment(investor, vehicleId, amount)` — called by PaymentProtocol when investment is made
- `canInvestInVehicle(investor, vehicleId, amount)` — validates against per-type limits, returns `(bool, reasonCode)`
- `getVehicleInvestment(investor, vehicleId)` / `getTotalInvestment(investor)` — query functions

**Key Events:** `InvestorRequestCreated`, `MultiSigWalletCreated`, `TokensLocked`, `InvestorRequestApproved`, `InvestorRequestRejected`, `VehicleInvestmentRecorded`

---

### MultiSigWallet.sol — 2-of-2 Token Locking

**Inheritance:** `Ownable`, `ReentrancyGuard`

**Constructor params:** `user` (immutable), `bank` (immutable)

A 2-of-2 multi-signature wallet used for ACCREDITED and INSTITUTIONAL investor ETH locking. Both the investor (user) and the banking institution (bank) must sign before locked funds can be released.

**How It Works:**

1. `lockFunds()` — user-only, payable. Locks ETH in the wallet. Only one active lock allowed
2. `proposeUnlock(amount, recipient, reason)` — either party creates an unlock proposal
3. `signUnlock(proposalId)` — each party signs. When both sign, ETH is automatically released to the recipient
4. `cancelProposal(proposalId)` — either party or owner can cancel

**Proposal Fields:** `amount`, `recipient`, `bankSigned`, `userSigned`, `executed`, `reason`

**Query Functions:** `getProposal`, `getWalletStatus`, `isFullySigned`, `getLockedBalance`

**Events:** `TokensLocked`, `UnlockProposalCreated`, `ProposalSigned`, `TokensUnlocked`, `ProposalCancelled`
