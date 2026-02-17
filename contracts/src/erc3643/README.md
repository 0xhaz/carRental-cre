## ERC3643 Components

## Contracts

- [Token.sol](./Token.sol) - Generic ERC-3643 security token
- [IdentityRegistry.sol](./IdentityRegistry.sol) - Identity management
- [InvestorTypeRegistry.sol](./InvestorTypeRegistry.sol) - Investor type management
- [ParticipantTypeRegistry.sol](./ParticipantTypeRegistry.sol) - Participant roles
- [ClaimTopicsRegistry.sol](./ClaimTopicsRegistry.sol) - Claim definitions
- [TrustedIssuersRegistry.sol](./TrustedIssuersRegistry.sol) - Trusted claim issuers
- [ComplianceRegistry.sol](./ComplianceRegistry.sol) - Compliance module manager
- [AssetToken.sol](./AssetToken.sol) - Vehicle Ownership Token
  - Represents fractional/full ownership of specific vehicles
  - Tradeable among qualified investors with compliance checks
  - Links to VehicleNFT via VIN and token ID
  - Enforces supply cap (represents full vehicle value)
  - Tracks ownership percentages
  - Stores vehicle metadata (IPFS)
  - Supports both fractional and full ownership models
- [RevenueToken.sol](./RevenueToken.sol) - Rental Income Rights Token
  - Represents rights to rental income streams
  - Transfer restrictions: Non-transferable or strict holding periods
  - Tracks accumulated revenue per holder
  - Records revenue distributions automatically
  - Enforces minimum holding periods (e.g., 6 months)
  - Links to both VehicleNFT and AssetToken
  - Calculates revenue share percentages
  - Integrates with revenue distributor contract
- [TokenFactory.sol](./TokenFactory.sol) - Per-Vehicle Token Deployment Factories
  - **AssetTokenFactory**: Deploys AssetToken instances for each vehicle
  - **RevenueTokenFactory**: Deploys RevenueToken instances for each vehicle
  - Split into two contracts to stay under the EVM 24,576-byte contract size limit (EIP-170)
  - Each factory: deploys token → adds PaymentProtocol as minting agent → transfers ownership to caller
  - Constructor params: `identityRegistry`, `compliance`, `paymentProtocol`
  - Emits `AssetTokenDeployed` / `RevenueTokenDeployed` events with deployed token address
  - Token supply uses 1:1 ratio with investment amounts (1 ETH invested = 1 token minted)
