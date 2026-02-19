# ERC-3643 Security Token Layer

The ERC-3643 layer is the compliance backbone of RegShield. It gates every token operation (mint, transfer, burn) through KYC/AML identity verification, investor-type limits, and modular compliance rules.

## Contracts

### Token.sol — Base ERC-3643 Security Token

**Inheritance:** `IERC3643`, `ERC20`, `Ownable`, `Pausable`

The base security token that all RegShield tokens extend. Every transfer is gated through a multi-layer compliance check.

**Transfer Validation Flow:**

1. **Mint path** (`from == address(0)`): Checks `IdentityRegistry.isVerified(to)`, `Compliance.canTransfer()`, and optionally `InvestorTypeRegistry.canHoldAmount(to, newBalance)`
2. **Burn path** (`to == address(0)`): Only checks `getFreeBalance(from) >= amount`
3. **Trusted contract transfers**: If either party is a trusted contract (e.g., escrow), identity verification is skipped — only compliance module checks apply
4. **Regular transfers**: Both `from` and `to` must be verified in the IdentityRegistry, neither can be frozen, compliance module must approve, and investor-type transfer/holding limits must pass

**Key Features:**

- Agent-based access control for mint, burn, freeze, and recovery operations
- Whole-address freezing (`setAddressFrozen`) and partial token freezing (`freePartialTokens`)
- Wallet recovery (`recoveryAddress`) — verifies identity match, migrates balance and frozen state
- Hot-swappable IdentityRegistry and Compliance module via owner
- `canTransfer()` view function for pre-flight transfer validation

---

### AssetToken.sol — Vehicle Ownership Token

**Inheritance:** `Token` (extends all ERC-3643 compliance features)

Represents fractional or full ownership of a specific vehicle. Each vehicle has one AssetToken with an immutable supply cap representing the full vehicle value.

**Constructor params:** `name`, `symbol`, `identityRegistry`, `compliance`, `supplyCap`, `vehicleVIN`, `isFractional`

**Key Features:**

- **Immutable supply cap** — `supplyCap` is set at deployment and cannot be changed. Minting reverts with `AssetToken__SupplyCapExceeded` if exceeded
- **Vehicle linking** — `linkToVehicleNFT(tokenId, nftContract)` is a one-time operation that binds this token to a specific VehicleNFT
- **Ownership percentage** — `ownershipPercentage(address)` returns basis points (10000 = 100%). Holding 250 of 1000 total tokens = 2500 bp = 25%
- **IPFS metadata** — `updateVehicleMetadata(uri)` stores links to vehicle photos, inspection reports, maintenance history
- **Supply helpers** — `isFullyMinted()`, `remainingSupply()` for campaign progress tracking

**Events:** `VehicleInfoUpdated`, `VehicleMetadataUpdated`

---

### RevenueToken.sol — Rental Income Rights Token

**Inheritance:** `Token` (extends all ERC-3643 compliance features)

Represents rights to rental income from a specific vehicle. Has additional transfer restrictions beyond standard ERC-3643 compliance.

**Constructor params:** `name`, `symbol`, `identityRegistry`, `compliance`, `supplyCap`, `vehicleVIN`, `minimumHoldingPeriod`, `transfersLocked`

**Three-Layer Transfer Restriction:**

1. **Global lock** — If `transfersLocked == true`, all transfers are permanently blocked
2. **Per-holder holding period** — Each time a holder receives tokens, their `lastTokenReceiptTime` resets. Transfers are blocked until `lastTokenReceiptTime + minimumHoldingPeriod` has passed
3. **Global unlock time** — Set at deployment as `block.timestamp + minimumHoldingPeriod`

All three checks must pass before any transfer proceeds (in addition to base Token compliance checks).

**Revenue Tracking:**

- `accumulatedRevenue[holder]` — per-holder total revenue received
- `totalRevenueDistributed` — global running total
- `recordRevenueDistribution(holder, amount)` — callable only by `revenueDistributor` or owner. Records amounts distributed by the separate `RevenueDistributor` contract (this token does not hold ETH itself)
- `revenueSharePercentage(holder)` — returns basis points based on token balance

**Vehicle Linking:** `linkToVehicle(tokenId, nftContract, assetToken)` — one-time link to VehicleNFT and corresponding AssetToken

**Events:** `RevenueDistributed`, `TransferLockUpdated`, `RevenueDistributorUpdated`, `VehicleLinked`

---

### TokenFactory.sol — Per-Vehicle Token Deployment

Contains **two separate contracts** split to stay under the EVM 24,576-byte contract size limit (EIP-170).

#### AssetTokenFactory

**Constructor params:** `identityRegistry`, `compliance`, `paymentProtocol`

**Deployment flow for `deployAssetToken(name, symbol, supplyCap, vehicleVIN)`:**

1. Deploys a new `AssetToken` with `isFractional = true`
2. Calls `token.addAgent(paymentProtocol)` — grants PaymentProtocol mint/burn rights
3. Calls `token.transferOwnership(owner())` — platform admin retains control
4. Emits `AssetTokenDeployed(vehicleVIN, assetToken, deployer)`

#### RevenueTokenFactory

Identical structure. Deploys `RevenueToken` instances with `transfersLocked = false`.

**Deployment flow for `deployRevenueToken(name, symbol, supplyCap, vehicleVIN, minimumHoldingPeriod)`:**

1. Deploys a new `RevenueToken`
2. Adds PaymentProtocol as minting agent
3. Transfers ownership to factory owner
4. Emits `RevenueTokenDeployed(vehicleVIN, revenueToken, deployer)`

**Admin:** `setPaymentProtocol(address)`, `setCompliance(address)` — both `onlyOwner`

**Token supply uses 1:1 ratio with investment amounts** (1 ETH invested = 1 token minted).

---

### IdentityRegistry.sol — On-Chain Identity Management

**Inheritance:** `IIdentityRegistry`, `Ownable`

Maps wallet addresses to OnchainID identity contracts and country codes. Central KYC gate for the entire platform.

**Data stored per user:**

| Field | Type | Description |
| --- | --- | --- |
| `_identities[user]` | `address` | User's OnchainID contract address |
| `_countries[user]` | `uint16` | ISO country code |

**Registration:** `registerIdentity(user, identity, country)` — agent-only. Validates jurisdiction via ComplianceRules before storing. Supports batch registration.

**Verification:** `isVerified(user)` returns `true` if `_identities[user] != address(0)`. This is the function called by Token.sol on every transfer.

**Platform-Specific Extensions:**

| Function | Description |
| --- | --- |
| `isRenter(user)` | Delegates to ParticipantTypeRegistry |
| `isRentor(user)` | Delegates to ParticipantTypeRegistry |
| `isInvestor(user)` | Delegates to ParticipantTypeRegistry |
| `canRent(user)` | Checks identity + renter role + RenterCompliance validation |

**Connected Registries:** InvestorTypeRegistry, ParticipantTypeRegistry, RenterCompliance, ComplianceRules — all configurable by owner.

---

### InvestorTypeRegistry.sol — Investor Classification & Limits

**Inheritance:** `IInvestorTypeRegistry`, `Ownable`

Manages investor tiers with per-type transfer limits, holding caps, and cooldown periods.

**Investor Types:**

| Type | Max Transfer | Max Holding | Cooldown | Large Transfer Threshold |
| --- | --- | --- | --- | --- |
| RETAIL (1) | 8,000 tokens | 50,000 tokens | 60 min | 5,000 tokens |
| ACCREDITED (2) | 50,000 tokens | 500,000 tokens | 30 min | 10,000 tokens |
| INSTITUTIONAL (3) | 500,000 tokens | 5,000,000 tokens | 15 min | 100,000 tokens |

**Governance System:** Type config changes can go through a multi-sig governance flow with time-delayed proposals (2-day delay, configurable between 1 hour and 30 days). Weighted governors can create, approve, and execute proposals.

**Key Functions:** `assignInvestorType`, `upgradeInvestorType`, `downgradeInvestorType`, `canTransferAmount`, `canHoldAmount`, `isLargeTransfer`

---

### ParticipantTypeRegistry.sol — Platform Role Management

**Inheritance:** `IParticipantTypeRegistry`, `Ownable`

Tracks all platform participants and their roles. Supports multi-role participants.

**Participant Types:**

| Value | Name | Description |
| --- | --- | --- |
| 0 | NONE | Not registered |
| 1 | INVESTOR_RETAIL | Retail investor |
| 2 | INVESTOR_INSTITUTIONAL | Institutional investor |
| 3 | INVESTOR_STRATEGIC | Strategic partner |
| 4 | RENTER | Vehicle renter |
| 5 | RENTOR | Vehicle operator |
| 6 | MULTI_ROLE | Auto-set when multiple roles are combined |

**Multi-Role Handling:** `addInvestorRole`, `addRenterRole`, `addRentorRole` — each checks if the participant now holds multiple roles and auto-upgrades `primaryType` to `MULTI_ROLE`.

**Blacklisting:** `blacklistParticipant(address, reason)` — sets `isBlacklisted = true`, `isActive = false`. Used by the Compliance CRE workflow.

---

### ClaimTopicsRegistry.sol — Required Claim Definitions

**Inheritance:** `IClaimTopicsRegistry`, `Ownable`

Manages which claim topics are required for each participant type. Initializes with defaults from the `ClaimTopics` library.

**Default Topic Sets:**

| Participant | Required Topics |
| --- | --- |
| INVESTOR | KYC (1), Accredited Investor (2), Regional Eligibility (3) |
| RENTER | KYC (1), Driver License (4), Insurance (5), Credit Score (6) |
| RENTOR | KYC (1), Business Registered (7), Vehicle Ownership (8) |

---

### TrustedIssuersRegistry.sol — Claim Issuer Management

**Inheritance:** `ITrustedIssuerRegistry`, `Ownable`

Maintains which claim issuers are trusted to attest to which claim topics. Each issuer is scoped to specific topics (e.g., an issuer added with `[1, 2]` can only issue KYC and Accredited Investor claims).

**Key Functions:** `addTrustedIssuer(issuer, claimTopics[])`, `removeTrustedIssuer`, `updateIssuerClaimTopics`, `getTrustedIssuersForClaimTopic`

---

### ComplianceRegistry.sol — Compliance Module Registry

**Inheritance:** `ICompliance`

A stub/mock compliance registry for testing. Implements the `ICompliance` interface but `canTransfer()` always returns `true` and `isTrustedContract()` always returns `false`.

Manages a list of compliance modules via `addModule` / `removeModule`. Production deployments should wire a real compliance implementation (e.g., `ComplianceRules`).

---

## Contract Interconnection

```
Token / AssetToken / RevenueToken
    |
    +---> IdentityRegistry.isVerified()          [KYC gate for all transfers/mints]
    |         +---> InvestorTypeRegistry          [transfer/holding limits]
    |         +---> ParticipantTypeRegistry       [role checks: investor/renter/rentor]
    |         +---> RenterCompliance              [rental-specific validation]
    |         +---> ComplianceRules               [jurisdiction validation]
    |
    +---> ICompliance.canTransfer()               [modular compliance check]
    |
    +---> InvestorTypeRegistry                    [canTransferAmount, canHoldAmount]

AssetTokenFactory / RevenueTokenFactory
    +---> deploys AssetToken / RevenueToken
    +---> addAgent(paymentProtocol)               [PaymentProtocol gets mint rights]
    +---> transferOwnership(factoryOwner)          [admin retains control]

RevenueToken
    +---> links to AssetToken (address)
    +---> links to VehicleNFT (tokenId + contract)
    +---> RevenueDistributor.recordRevenueDistribution()
```

## Interfaces

- [IERC3643.sol](../interfaces/erc3643/IERC3643.sol)
- [IIdentityRegistry.sol](../interfaces/erc3643/IIdentityRegistry.sol)
- [IInvestorTypeRegistry.sol](../interfaces/erc3643/IInvestorTypeRegistry.sol)
- [IParticipantTypeRegistry.sol](../interfaces/erc3643/IParticipantTypeRegistry.sol)
- [IClaimTopicsRegistry.sol](../interfaces/erc3643/IClaimTopicsRegistry.sol)
- [ITrustedIssuerRegistry.sol](../interfaces/erc3643/ITrustedIssuerRegistry.sol)
