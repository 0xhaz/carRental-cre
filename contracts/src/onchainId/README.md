# OnchainID Identity Layer

Implements the on-chain identity system based on ERC-734 (Key Management) and ERC-735 (Claim Management). Every participant on RegShield (investor, renter, rentor) gets an OnchainID contract that holds their cryptographic keys and verified claims (KYC, driver license, insurance, etc.).

## Contracts

### OnChainID.sol — Core Identity Contract

**Inheritance:** `IOnchainID`, `Ownable`, `ReentrancyGuard`

Each participant gets one OnchainID instance deployed via OnchainIDFactory. The identity contract stores cryptographic keys (ERC-734) and signed claims (ERC-735) that are checked during every token transfer and platform operation.

**Constructor params:** `owner`, `admin` (optional delegated manager)

**Key Management (ERC-734):**

| Key Purpose | Value | Description |
| --- | --- | --- |
| MANAGEMENT_KEY | 1 | Full management authority |
| ACTION_KEY | 2 | Execute transactions on behalf of identity |
| CLAIM_SIGNER_KEY | 3 | Add and sign claims |
| ENCRYPTION_KEY | 4 | Encryption operations |

Keys are stored as `keccak256(abi.encodePacked(address))` hashes. A key is valid only when `revokedAt == 0`. Single key hashes can hold multiple purposes.

**Key Functions:** `addKey`, `removeKeyWithProof` (requires ECDSA signature), `keyHasPurpose`, `getKeysByPurpose`, `authorizeContract`, `authorizeManager`

**Claim Management (ERC-735):**

Claims are attestations from trusted issuers (e.g., KYC provider, DMV, insurance company). Each claim has:

- `topic` — ClaimTopics constant (1-8)
- `scheme` — signature scheme (ECDSA, RSA, or Contract)
- `issuer` — ClaimIssuer contract address
- `signature` — cryptographic proof
- `data` — claim payload
- `validTo` / `validFrom` — expiry and creation timestamps

Claims are indexed by `claimId = keccak256(abi.encodePacked(issuer, topic, data))`.

**Key Functions:** `addClaim`, `removeClaim`, `getClaim`, `getClaimIdsByTopic`, `hasValidClaim`, `batchAddClaims` (max 50 per call)

**Platform Claim Topics:**

| Topic | ID | Participant |
| --- | --- | --- |
| KYC Verified | 1 | All |
| Accredited Investor | 2 | Investors |
| Regional Eligibility | 3 | Investors |
| Driver License Valid | 4 | Renters |
| Insurance Verified | 5 | Renters |
| Credit Score Range | 6 | Renters |
| Business Registered | 7 | Rentors |
| Vehicle Ownership Proof | 8 | Rentors |

**Compliance Checking:**

- `addTrustedIssuer(issuer, topics[])` — register an issuer as trusted for specific topics
- `addClaimTopic(topic, required)` — mark a topic as required
- `isCompliant()` — returns true if all required topics have a valid non-expired claim from a trusted issuer
- `getComplianceStatus()` — returns `(isCompliant, missingTopics[], expiredClaims[])`

**Platform-Specific Helpers:**

- `hasInvestorClaims()` — checks topics [1, 2, 3]
- `hasRenterClaims()` — checks topics [1, 4, 5, 6]
- `hasRentorClaims()` — checks topics [1, 7, 8]
- `getParticipantType()` — returns `(isInvestor, isRenter, isRentor)`

**Execution (ERC-734):** `execute(to, value, data)` — ACTION_KEY holders can execute transactions through the identity. Auto-executes if caller has MANAGEMENT_KEY, otherwise creates a pending execution for approval.

---

### ClaimIssuer.sol — Trusted Claim Issuer

**Inheritance:** `Ownable`, `ReentrancyGuard`

Issues cryptographically signed claims to OnchainID contracts. Each ClaimIssuer represents a trusted authority (KYC provider, DMV, insurance company, credit bureau).

**Constructor params:** `owner`, `name`, `description`

**Claim Issuance Flow:**

1. Caller must hold both CLAIM_SIGNER_KEY and MANAGEMENT_KEY
2. Data hash is computed: `keccak256(abi.encodePacked(identity, topic, data))`
3. Signature is generated over the data hash
4. Claim is stored locally in `issuedClaims[claimId]`
5. `IOnchainID(identity).addClaim(...)` is called on the target identity contract
6. If the on-chain claim addition fails, the entire transaction reverts

**Claim Verification:** `verifyClaim(identity, topic, data, signature)` — recomputes the hash, recovers the signer via ECDSA, and checks if the signer holds CLAIM_SIGNER_KEY or MANAGEMENT_KEY.

**Claim Revocation:** `revokeClaim(claimId)` — marks the claim as revoked locally and attempts to remove it from the target OnchainID. `isClaimValid(claimId)` returns false for revoked or expired claims.

**Batch Issuance Helpers:**

| Function | Topics Issued |
| --- | --- |
| `issueInvestorClaims(identity, ...)` | KYC (1), Accredited (2), Regional (3) |
| `issueRenterClaims(identity, ...)` | KYC (1), License (4), Insurance (5), Credit (6) |
| `issueRentorClaims(identity, ...)` | KYC (1), Business (7), Vehicle Ownership (8) |

**Verification Helpers:** `verifyInvestorClaims`, `verifyRenterClaims`, `verifyRentorClaims` — check if an identity has all required claims for each role.

---

### OnchainIDFactory.sol — Identity Deployment Factory

**Inheritance:** `Ownable`

Deploys OnchainID instances using CREATE2 for deterministic addresses. Tracks all deployed identities.

**Constructor params:** `owner` (also set as fee recipient)

**Deployment Functions:**

| Function | Description |
| --- | --- |
| `deployOnchainID(owner, salt)` | Standard deployment (no admin key) |
| `deployOnchainIDWithKey(owner, managementKey, salt)` | Deployment with explicit admin/management key |
| `batchDeployOnchainID(owners[], salts[])` | Batch deployment |
| `computeOnchainIDAddress(owner, admin, salt)` | Pre-compute address without deploying |

Salts are single-use. Deployment can be paused and a fee in ETH can be required.

**Query Functions:** `getIdentityByOwner`, `getIdentityBySalt`, `getAllIdentities`, `getIdentitiesPaginated`, `isValidOnchainID`

---

### KeyManager.sol — Advanced Key Operations

**Inheritance:** `Ownable`, `ReentrancyGuard`

Provides timelocked key rotation, multi-signature key management, and M-of-N key recovery for OnchainID contracts.

**Key Rotation (3-step timelocked process):**

1. `initiateKeyRotation(identity, oldKey, newKey, purpose)` — creates rotation request with timelock delay (default: 1 day, configurable between 1 hour and 7 days per identity)
2. Wait for timelock to expire
3. `executeKeyRotation(identity, oldKey, newKey, purpose)` — permissionless execution after delay. Calls `IOnchainID.addKey(newKey)` then `IOnchainID.removeKey(oldKey)`

**Multi-Signature Keys:**

- `addMultiSigKey(identity, keyId, signers[], threshold, purpose)` — creates a multi-sig key group
- `signMultiSigOperation(identity, keyId, operation)` — each signer independently signs
- `checkMultiSigThreshold(identity, keyId)` — checks if threshold is met

**Key Recovery (4-step M-of-N process):**

1. `setupKeyRecovery(identity, recoveryAgents[], threshold)` — establishes recovery configuration (max 10 agents)
2. `initiateKeyRecovery(identity, newRecoveryKey)` — any recovery agent triggers recovery (2-day fixed timelock)
3. `approveKeyRecovery(identity)` — each agent independently approves
4. `executeKeyRecovery(identity)` — permissionless after timelock + sufficient approvals. Adds new MANAGEMENT_KEY to the identity

**Batch Operations:** `batchAddKeys`, `batchRemoveKeys` — for bulk key management via authorized managers.

## Interfaces

- [IOnchainID.sol](../interfaces/onchainId/IOnchainID.sol)
