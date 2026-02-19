# World ID Verification

Provides Sybil-resistant identity verification using Worldcoin's World ID zero-knowledge proof system. Prevents a single human from creating multiple accounts on the platform.

## Contract

### WorldIDVerifier.sol — On-Chain ZK Proof Verifier

**Inheritance:** `Ownable`

**Constructor params:**

| Param | Description |
| --- | --- |
| `_worldId` | World ID Router contract (Sepolia: `0x469449f251692e0779667583026b5a1e99512157`) |
| `_appId` | Application ID from World ID Developer Portal (e.g., `"app_xxx"`) |
| `_actionId` | Action identifier (e.g., `"verify-regshield"`) |

**Immutables computed at construction:**

- `groupId = 1` — Orb verification (highest assurance level)
- `externalNullifierHash = hashToField(hashToField(appId) ++ actionId)` — binds verification to this specific app+action pair

**How Verification Works:**

`verifyAndRegister(signal, root, nullifierHash, proof[8])`:

1. **Sybil check:** `nullifierHashes[nullifierHash]` — reverts `DuplicateNullifier` if this human has already verified (one real human = one nullifier forever)
2. **Duplicate check:** `isWorldIDVerified[signal]` — reverts `AlreadyVerified` if this wallet is already registered
3. **ZK proof verification:** Calls `worldId.verifyProof(root, groupId=1, hashToField(signal), nullifierHash, externalNullifierHash, proof)` — verifies the Groth16 zero-knowledge proof on-chain via the World ID Router
4. **Registration:** Records `nullifierHashes[nullifierHash] = true`, `isWorldIDVerified[signal] = true`, increments `verifiedCount`

The `signal` parameter is the user's wallet address, binding the proof to that specific address and preventing front-running.

**State:**

| Variable | Type | Description |
| --- | --- | --- |
| `isWorldIDVerified` | `mapping(address => bool)` | Public. Consumed by compliance checks across the platform |
| `nullifierHashes` | `mapping(uint256 => bool)` | Tracks used nullifiers. One per real human |
| `userNullifierHash` | `mapping(address => uint256)` | Audit trail linking wallet to nullifier |
| `verifiedCount` | `uint256` | Total verified users |

**Admin:** `revokeVerification(user)` — owner-only. Sets `isWorldIDVerified[user] = false`, decrements count. Used for compliance or emergency revocation.

**Events:** `WorldIDVerified(user, nullifierHash)`, `WorldIDRevoked(user)`

**Integration Points:**

- `isWorldIDVerified(address)` is a public mapping readable by any contract
- Consumed by the Onboarding CRE Workflow to optionally require World ID before investor/renter approval
- Can be checked by ComplianceRules or IdentityRegistry as an additional verification layer

**ByteHasher Library:** Internal library that hashes `bytes` to a ZK field element via `uint256(keccak256(data)) >> 8`.

## Deployed Address (Sepolia)

| Contract | Address |
| --- | --- |
| World ID Verifier | `0x838C9397F5c00f7010924dDc4c2E93Fcab6c0363` |
