## Investor Contracts

## Contracts

- [InvestorRequestManager.sol](./InvestorRequestManager.sol) - Core investor onboarding system

  - Manages investor type requests (Retail, Accredited, Institutional, Regional)
  - Tracks vehicle investments per investor
  - Enforces investment limits per investor type
  - Integrates with PaymentProtocol (authorization added)
  - Creates multi-sig wallets for token locking
  - Approval workflow (Bank + Owner)

- [MultiSigWallet.sol](./MultiSigWallet.sol) - Token locking mechanism
  - 2-of-2 multi-signature (Bank + User)
  - Token lock/unlock proposals
  - Used by InvestorRequestManager
  - Supports ERC-20/ERC-3643 tokens
