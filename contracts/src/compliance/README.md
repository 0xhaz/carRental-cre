# Compliance Module Layer

Enforces regulatory compliance across the entire RegShield platform — from token transfers to renter validation to vehicle operational status. All compliance checks are performed on-chain and integrated with the ERC-3643 token layer.

## Contracts

### ComplianceRules.sol — Main Compliance Engine

**Inheritance:** `IComplianceRules`, `ICompliance`, `Ownable`, `ReentrancyGuard`

The central compliance contract that all token transfers route through. Implements four configurable rule types with per-token overrides and default fallbacks.

**Constructor params:** `owner`, `initialAllowedCountries[]`, `initialBlockedCountries[]`

**Four Rule Types (per-token configurable, with defaults):**

| Rule | Default | Key Fields |
| --- | --- | --- |
| Jurisdiction | Active | `allowedCountries[]`, `blockedCountries[]` — country code allow/block lists |
| Investor Type | Active, min accreditation = 1 | `allowedTypes[]`, `blockedTypes[]`, `minimumAccreditation` |
| Holding Period | 24h min hold, 1h cooldown | `minimumHoldingPeriod`, `transferCooldown`, per-investor timers |
| Compliance Level | min=1, max=5 | `minimumLevel`, `maximumLevel`, level inheritance mapping |

**`canTransfer(from, to, amount)` Logic:**

1. Mint and burn always pass
2. If both parties are trusted contracts (escrow, etc.), transfer is allowed
3. If one party is trusted, only the non-trusted party is KYC-checked
4. Otherwise: both sender and recipient must be KYC-verified via `IdentityRegistry.isVerified()`
5. Jurisdiction rules are applied: both country codes checked against blocklist, then allowlist

**Trusted Contracts:** Addresses registered via `addTrustedContract()` bypass dual-KYC requirements. Intended for PaymentEscrow and other platform-controlled contracts.

**Rental Integration:**

- `canRent(renter, vehicleId)` — delegates to RenterCompliance + OperationalCompliance
- `getComplianceStatus(user)` — returns `(hasKYC, isInvestor, isRenter, hasDriverLicense)`

**Access Control:** Rule administrators (set via `setRuleAdministrator`) can update per-token rules. Authorized tokens can call `recordTransfer` to update cooldown timers.

---

### InvestorTypeCompliance.sol — Investment Transfer Controls

**Inheritance:** `ICompliance`, `Ownable`, `ReentrancyGuard`

Enforces per-investor-type transfer limits, cooldown periods, and large transfer approval requirements. Delegates all type configuration to `InvestorTypeRegistry`.

**Constructor params:** `investorTypeRegistry`

**`canTransfer` Checks (in order):**

1. Mint/burn bypass all checks
2. Emergency override active for sender — immediate pass
3. `InvestorTypeRegistry.canTransferAmount(from, amount)` must pass
4. Transfer cooldown must be satisfied (per-sender timer)
5. Large transfers require pre-approval from a compliance officer

**Large Transfer Flow:**

1. Transfer flagged as "large" by registry threshold
2. Compliance officer calls `approveLargeTransfer(from, to, amount, expiry)` — registers approval hash
3. `canTransfer` checks for valid, non-expired approval hash before allowing
4. Hash is specific to exact `(from, to, amount)` — no reuse

**Emergency Override:** `activateEmergencyOverride(investor)` — compliance officer can temporarily bypass all checks for an address.

---

### RenterCompliance.sol — Renter Validation

**Inheritance:** `IRenterCompliance`, `Ownable`, `ReentrancyGuard`

Validates renters against multiple criteria before they can book vehicles. Used by the Onboarding CRE workflow and RentalBooking contract.

**Constructor params:** `identityRegistry`, `owner`

**Default Requirements:**

| Check | Default | Description |
| --- | --- | --- |
| Minimum Age | 21 | Validated via identity claims |
| Driver License | Required | Must have topic 4 claim, not expired |
| Insurance | Required | Must have topic 5 claim, not expired |
| Credit Score | FAIR minimum | Tiers: NONE, POOR, FAIR, GOOD, EXCELLENT |
| Incident History | Max 3 in 12 months | On-chain incident records per renter |

**`validateRenter(renter)` Flow:**

1. Blacklist check — blacklisted renters are immediately rejected
2. Identity verification — `IdentityRegistry.isVerified(renter)`
3. Age validation — must be >= `minimumAge`
4. Driver license — valid claim on OnchainID, not expired
5. Insurance — valid claim on OnchainID, not expired
6. Credit score — claim-based tier check
7. Incident history — incidents in last 12 months must not exceed max

**Blacklisting:** `blacklistRenter(renter, reason)` — adds to blacklist with reason. Used by the Compliance CRE workflow when a renter accumulates 3+ incidents.

**Incident Records:** `recordIncident(renter, vehicleId, incidentType)` — appends on-chain. Only incidents within the configured timeframe are counted against the limit.

---

### OperationalCompliance.sol — Vehicle Operational Status

**Inheritance:** `IOperationalCompliance`, `Ownable`, `ReentrancyGuard`

Manages vehicle-level compliance: registration expiry, insurance expiry, maintenance schedules, suspensions, and regional permits.

**Constructor params:** `owner`

**Vehicle Status Enum:** `OPERATIONAL`, `MAINTENANCE_DUE`, `MAINTENANCE_OVERDUE`, `REGISTRATION_EXPIRED`, `INSURANCE_EXPIRED`, `SUSPENDED`, `DECOMMISSIONED`

**`validateVehicle(vehicleId)` Checks (in order):**

1. Vehicle must be registered
2. Not suspended
3. Not decommissioned
4. `registrationExpiry >= block.timestamp`
5. `insuranceExpiry >= block.timestamp`
6. `nextMaintenanceDate >= block.timestamp`

**Vehicle Data (per vehicle):**

| Field | Description |
| --- | --- |
| `registrationExpiry` | Unix timestamp |
| `insuranceExpiry` | Unix timestamp |
| `lastMaintenanceDate` | Updated on each maintenance record |
| `nextMaintenanceDate` | `lastMaintenance + maintenanceInterval` |
| `isSuspended` | Set by authorized operators |

**Key Functions:**

- `registerVehicle(vehicleId, owner, registrationExpiry, insuranceExpiry, maintenanceInterval)`
- `recordMaintenance(vehicleId, type, notes)` — resets maintenance timers
- `renewRegistration(vehicleId, newExpiryDate)` / `renewInsurance(vehicleId, newExpiryDate)`
- `suspendVehicle(vehicleId, reason)` / `liftSuspension(vehicleId)`
- `decommissionVehicle(vehicleId, reason)` — permanent status
- `addRegionalPermit(vehicleId, regionCode, expiryDate)` / `revokeRegionalPermit`

**Maintenance History:** Each `recordMaintenance()` appends a `MaintenanceRecord` with type, notes, performer, and timestamp.

---

### TransferRestrictions.sol — Token Transfer Velocity & Limits

**Inheritance:** `Ownable`

Enforces per-token transfer restrictions including lock-up periods, velocity limits, and jurisdiction/investor-type whitelists.

**Constructor params:** `owner`

**Restriction Rule (per token):**

| Field | Description |
| --- | --- |
| `holdingPeriod` | Seconds since last transfer before new transfer allowed |
| `maxTransferAmount` | Per-transfer cap (0 = no cap) |
| `dailyLimit` | Rolling 24h limit per sender (0 = no limit) |
| `monthlyLimit` | Rolling 30-day limit per sender (0 = no limit) |
| `allowedJurisdictions[]` | Whitelist (empty = all allowed) |
| `allowedInvestorTypes[]` | Whitelist (empty = all allowed) |

**`canTransfer(token, from, to, amount)` Returns:** `(bool allowed, RestrictionReason reason)`

**Restriction Reasons:** `NONE`, `HOLDING_PERIOD_VIOLATION`, `MAX_TRANSFER_AMOUNT_EXCEEDED`, `DAILY_LIMIT_EXCEEDED`, `MONTHLY_LIMIT_EXCEEDED`, `JURISDICTION_NOT_ALLOWED`, `INVESTOR_TYPE_NOT_ALLOWED`, `APPROVAL_REQUIRED`

**Velocity Tracking:** Rolling windows compare `block.timestamp / 1 days` (or `/ 30 days`) to the last bucket reset, accumulating transfer totals per `(token, sender)`.

---

### ClaimTopics.sol — Claim Topic Constants Library

**Type:** Solidity library (linked at compile time)

Single authoritative source for all claim topic IDs used across the platform.

| Constant | ID | Audience | Description |
| --- | --- | --- | --- |
| `KYC_VERIFIED` | 1 | All | KYC/AML verification |
| `ACCREDITED_INVESTOR` | 2 | Investors | Accredited status |
| `REGIONAL_ELIGIBILITY` | 3 | Investors | Jurisdiction-specific rights |
| `DRIVER_LICENSE_VALID` | 4 | Renters | Valid driver license |
| `INSURANCE_VERIFIED` | 5 | Renters | Insurance coverage |
| `CREDIT_SCORE_RANGE` | 6 | Renters | Credit tier for risk assessment |
| `BUSINESS_REGISTERED` | 7 | Rentors | Business entity registration |
| `VEHICLE_OWNERSHIP_PROOF` | 8 | Rentors | Physical vehicle ownership proof |

**Grouping Helpers:** `getInvestorClaims()` → [1,2,3], `getRenterClaims()` → [1,4,5,6], `getRentorClaims()` → [1,7,8]

## Interfaces

- [IComplianceRules.sol](../interfaces/compliance/IComplianceRules.sol)
- [IRenterCompliance.sol](../interfaces/compliance/IRenterCompliance.sol)
- [IOperationalCompliance.sol](../interfaces/compliance/IOperationalCompliance.sol)
- [ICompliance.sol](../interfaces/compliance/ICompliance.sol) — ERC-3643 compliance interface
