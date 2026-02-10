## Car Rental Platform Compliance

## Contracts:

- [ComplianceRules.sol](ComplianceRules.sol) - Main compliance engine
- [InvestorTypeCompliance.sol](InvestorTypeCompliance.sol) - Investor accreditation & investment limits
- [RenterCompliance.sol](RenterCompliance.sol) - Renter validation (age, license, insurance, credit)
- [OperationalCompliance.sol](OperationalCompliance.sol) - Vehicle operations (registration, maintenance, insurance)
- [TransferRestrictions.sol](TransferRestrictions.sol) - Token transfer restrictions (lock-up, velocity limits, tiers)
- [ClaimTopics.sol](ClaimTopics.sol) - OnchainID claim topic definitions

## Interfaces:

- [IComplianceRules.sol](../interfaces/compliance/IComplianceRules.sol)
- [IRenterCompliance.sol](../interfaces/compliance/IRenterCompliance.sol)
- [IOperationalCompliance.sol](../interfaces/compliance/IOperationalCompliance.sol)
- [ICompliance.sol](../interfaces/compliance/ICompliance.sol) - ERC-3643 compliance interface
