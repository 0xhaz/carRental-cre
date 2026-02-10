## OnChainID Contracts

## Contracts

- [OnChainID.sol](./OnChainID.sol) - Core identity contract

  - Implements ERC-734 (Key Management)
  - Implements ERC-735 (Claim Management)
  - Car rental specific claim topics (1-8):
    1. KYC Verified (all participants)
    2. Accredited Investor (investors)
    3. Regional Eligibility (jurisdiction-specific)
    4. Driver License Valid (renters)
    5. Insurance Verified (renters)
    6. Credit Score Range (renters)
    7. Business Registered (rentors)
    8. Vehicle Ownership Proof (rentors)

- [ClaimIssuer.sol](./ClaimIssuer.sol) - Trusted issuer system

  - Issues and verifies claims
  - Supports claim revocation
  - Key management for issuers
  - Integrates with ClaimTopics
  - Used by: KYC providers, DMV, insurance, credit bureaus

- [OnchainIDFactory.sol](./OnchainIDFactory.sol) - Identity factory

  - Deploys OnchainID instances
  - Deterministic addresses (CREATE2)
  - Tracks deployed identities
  - Fee management system

- [KeyManager.sol](./KeyManager.sol) - Advanced key operations
  - Key rotation with timelock
  - Multi-signature keys
  - Key recovery mechanisms
  - Emergency operations
