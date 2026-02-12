# RegShield UI-to-Contract Mapping Reference

Quick reference guide showing how each smart contract feature maps to frontend UI components.

---

## 🎯 Investor Portal

### OnchainID & Compliance

| Smart Contract Feature | UI Component | Location | Status |
|------------------------|--------------|----------|--------|
| OnchainID.createIdentity() | OnchainIDSetup.tsx | `/investor/onboarding/identity-setup` | ❌ To Build |
| OnchainID.addClaim() | KYCUploadForm.tsx | `/investor/onboarding/kyc-verification` | ❌ To Build |
| ComplianceModule.checkInvestor() | ComplianceCheckProgress.tsx | Shared component | ❌ To Build |
| ComplianceModule.getInvestorType() | InvestorTypeSelector.tsx | `/investor/onboarding/investor-type` | ❌ To Build |
| ComplianceModule.getWhitelistTier() | WhitelistTierCard.tsx | `/investor/onboarding/whitelist-tier` | ❌ To Build |
| ComplianceModule.verifyTransfer() | ComplianceGate.tsx | Used before investments | ❌ To Build |

### Investment & Tokens

| Smart Contract Feature | UI Component | Location | Status |
|------------------------|--------------|----------|--------|
| PaymentProtocol.invest() | InvestmentModal.tsx | `/investor/marketplace` | ❌ To Build |
| AssetToken.balanceOf() | AssetTokenCard.tsx | `/investor/portfolio` | ❌ To Build |
| RevenueToken.balanceOf() | RevenueTokenCard.tsx | `/investor/portfolio` | ❌ To Build |
| RevenueToken.claimRevenue() | ClaimRevenueButton.tsx | `/investor/portfolio` | ❌ To Build |
| RevenueDistributor.getDistributionHistory() | RevenueDistributionHistory.tsx | `/investor/portfolio` | ❌ To Build |
| AssetToken.transfer() | TokenTransferModal.tsx | `/investor/portfolio` | ❌ To Build |
| Campaign.getMilestones() | MilestoneTracker.tsx | `/investor/marketplace/[id]` | ❌ To Build |

### Portfolio & Analytics

| Smart Contract Feature | UI Component | Location | Status |
|------------------------|--------------|----------|--------|
| AssetToken.totalSupply() | PortfolioOverview.tsx | `/investor/dashboard` | ❌ To Build |
| RevenueToken.totalRevenue() | RevenueChart.tsx | `/investor/dashboard` | ✅ Exists (needs Web3) |
| VehicleNFT.getVehicleData() | InvestmentCard.tsx | `/investor/marketplace` | ✅ Exists (needs Web3) |
| PaymentProtocol.getInvestmentHistory() | TransactionHistory.tsx | `/investor/portfolio` | ❌ To Build |

---

## 🚗 Rentor Portal

### Vehicle NFT & Registration

| Smart Contract Feature | UI Component | Location | Status |
|------------------------|--------------|----------|--------|
| VehicleNFT.mintVehicle() | VehicleNFTMintingWizard.tsx | `/rentor/vehicles/add` | ❌ To Build |
| VehicleNFT.ownerOf() | VehicleNFTCard.tsx | `/rentor/vehicles` | ❌ To Build |
| VehicleNFT.getVehicleData() | VehicleDetailsPage.tsx (blockchain section) | `/rentor/vehicles/[id]` | ✅ Exists (needs Web3) |
| VehicleNFT.updateStatus() | VehicleStatusToggle.tsx | `/rentor/vehicles/[id]` | ❌ To Build |
| VehicleNFT.recordMaintenance() | MaintenanceLogger.tsx | `/rentor/vehicles/[id]` | ❌ To Build |
| VehicleNFT.getMaintenanceHistory() | MaintenanceHistory.tsx | `/rentor/vehicles/[id]` | ❌ To Build |

### Fundraising & Campaign

| Smart Contract Feature | UI Component | Location | Status |
|------------------------|--------------|----------|--------|
| Campaign.createCampaign() | CampaignCreationWizard.tsx | `/rentor/fundraising/create` | ❌ To Build |
| AssetTokenFactory.deploy() | TokenDeploymentForm.tsx | `/rentor/fundraising/create/step-3` | ❌ To Build |
| RevenueTokenFactory.deploy() | TokenDeploymentForm.tsx | `/rentor/fundraising/create/step-3` | ❌ To Build |
| Campaign.setMilestones() | MilestoneSetupForm.tsx | `/rentor/fundraising/create/step-4` | ❌ To Build |
| Campaign.getCurrentFunding() | FundraisingCampaign.tsx | `/rentor/fundraising` | ✅ Exists (needs Web3) |
| Campaign.getInvestors() | InvestorListTable.tsx | `/rentor/vehicles/[id]` | ❌ To Build |

### Revenue Management

| Smart Contract Feature | UI Component | Location | Status |
|------------------------|--------------|----------|--------|
| RevenueDistributor.calculateRevenue() | RevenueDistributionDashboard.tsx | `/rentor/analytics` | ❌ To Build |
| RevenueDistributor.distributeRevenue() | DistributeRevenueButton.tsx | `/rentor/analytics` | ❌ To Build |
| RevenueDistributor.getWaterfall() | WaterfallVisualization.tsx | `/rentor/analytics` | ❌ To Build |
| RevenueToken.getHolders() | InvestorListTable.tsx | `/rentor/vehicles/[id]` | ❌ To Build |

### Telematics (via CRE)

| CRE Service | UI Component | Location | Status |
|-------------|--------------|----------|--------|
| TelematicsService.getLocation() | VehicleLocationMap.tsx | `/rentor/vehicles/[id]` | ❌ To Build |
| TelematicsService.getMileage() | MileageDisplay.tsx (auto-update) | `/rentor/vehicles/[id]` | ❌ To Build |
| TelematicsService.getUsageAnalytics() | UsageAnalytics.tsx | `/rentor/analytics` | ❌ To Build |

---

## 🔑 Renter Portal

### OnchainID & Verification

| Smart Contract Feature | UI Component | Location | Status |
|------------------------|--------------|----------|--------|
| OnchainID.createIdentity() | OnchainIDSetup.tsx | `/renter/onboarding/identity` | ❌ To Build |
| OnchainID.addClaim(DRIVER_LICENSE) | DriverLicenseUpload.tsx | `/renter/onboarding/verification` | ❌ To Build |
| OnchainID.addClaim(INSURANCE) | InsuranceUpload.tsx | `/renter/onboarding/verification` | ❌ To Build |
| ComplianceModule.checkRenter() | ComplianceCheckStep.tsx | `/renter/book/step-3` | ❌ To Build |
| CRE.verifyDriverLicense() | CREVerificationProgress.tsx | `/renter/onboarding/verification` | ❌ To Build |

### Booking & Payment

| Smart Contract Feature | UI Component | Location | Status |
|------------------------|--------------|----------|--------|
| RentalBooking.requestBooking() | BookingWizard.tsx (Step 5) | `/renter/book` | ✅ Exists (needs Web3) |
| PaymentProtocol.depositSecurity() | DepositEscrowStep.tsx | `/renter/book/step-4` | ❌ To Build |
| PaymentProtocol.processPayment() | OnChainPaymentStep.tsx | `/renter/book/step-5` | ❌ To Build |
| RentalBooking.approveBooking() | BookingStatusDisplay.tsx | `/renter/bookings/[id]` | ❌ To Build |
| RentalBooking.getBookingStatus() | BookingCard.tsx | `/renter/bookings` | ✅ Exists (needs Web3) |

### Active Rental

| Smart Contract Feature | UI Component | Location | Status |
|------------------------|--------------|----------|--------|
| RentalBooking.startRental() | VehicleUnlockButton.tsx | `/renter/bookings/[id]` | ❌ To Build |
| CRE.getVehicleLocation() | ActiveRentalDashboard.tsx (map) | `/renter/bookings/[id]` | ❌ To Build |
| CRE.getCurrentMileage() | ActiveRentalDashboard.tsx (mileage) | `/renter/bookings/[id]` | ❌ To Build |
| RentalBooking.extendRental() | ExtendRentalModal.tsx | `/renter/bookings/[id]` | ❌ To Build |
| RentalBooking.initiateReturn() | ReturnInitiationModal.tsx | `/renter/bookings/[id]` | ❌ To Build |

### Condition Reports & Return

| Smart Contract Feature | UI Component | Location | Status |
|------------------------|--------------|----------|--------|
| RentalBooking.submitConditionReport() | ConditionReportForm.tsx (pre-rental) | `/renter/bookings/[id]/pickup` | ❌ To Build |
| RentalBooking.submitConditionReport() | ConditionReportForm.tsx (post-rental) | `/renter/bookings/[id]/return` | ❌ To Build |
| IPFS.uploadPhotos() | PhotoUploader.tsx | Used in condition reports | ❌ To Build |
| CRE.assessDamage() | DamageAssessmentResult.tsx | `/renter/bookings/[id]/return` | ❌ To Build |
| RentalBooking.completeReturn() | ReturnConfirmation.tsx | `/renter/bookings/[id]/return` | ❌ To Build |
| PaymentProtocol.releaseDeposit() | DepositSettlementDisplay.tsx | `/renter/bookings/[id]/settlement` | ❌ To Build |

### Disputes

| Smart Contract Feature | UI Component | Location | Status |
|------------------------|--------------|----------|--------|
| RentalBooking.initiateDispute() | DisputeForm.tsx | `/renter/disputes/create` | ❌ To Build |
| DisputeResolution.submitEvidence() | EvidenceSubmissionForm.tsx | `/renter/disputes/[id]` | ❌ To Build |
| DisputeResolution.getDisputeStatus() | DisputeStatusTracker.tsx | `/renter/disputes/[id]` | ❌ To Build |
| CRE.adjudicateDispute() | AutoAdjudicationResult.tsx | `/renter/disputes/[id]` | ❌ To Build |

---

## 🌐 Shared Components (Cross-Portal)

### Wallet & Connection

| Web3 Feature | UI Component | Location | Status |
|--------------|--------------|----------|--------|
| wagmi.useConnect() | ConnectWalletButton.tsx | Global header | ❌ To Build |
| wagmi.useNetwork() | NetworkSelector.tsx | Wallet modal | ❌ To Build |
| wagmi.useDisconnect() | DisconnectButton.tsx | Wallet modal | ❌ To Build |
| wagmi.useBalance() | WalletBalance.tsx | Wallet modal | ❌ To Build |
| RainbowKit | WalletModal.tsx | Global | ❌ To Build |

### Transactions

| Web3 Feature | UI Component | Location | Status |
|--------------|--------------|----------|--------|
| wagmi.useContractWrite() | TransactionButton.tsx | Shared | ❌ To Build |
| wagmi.useWaitForTransaction() | TransactionStatusModal.tsx | Shared | ❌ To Build |
| wagmi.useGasPrice() | GasEstimator.tsx | Shared | ❌ To Build |
| Transaction history | TransactionHistory.tsx | All portals | ❌ To Build |

### Compliance

| Smart Contract Feature | UI Component | Location | Status |
|------------------------|--------------|----------|--------|
| ComplianceModule.checkCompliance() | ComplianceStatusBadge.tsx | Shared | ❌ To Build |
| OnchainID.getClaims() | ClaimsList.tsx | All onboarding flows | ❌ To Build |
| CRE verification | CREVerificationProgress.tsx | Shared | ❌ To Build |

### Display Components

| Web3 Feature | UI Component | Location | Status |
|--------------|--------------|----------|--------|
| Address formatting | AddressDisplay.tsx | Shared | ❌ To Build |
| Token balances | TokenBalance.tsx | Shared | ❌ To Build |
| Contract addresses | ContractAddress.tsx | Shared | ❌ To Build |
| Etherscan links | ExplorerLink.tsx | Shared | ❌ To Build |
| ENS resolution | ENSName.tsx | Shared | ❌ To Build |

---

## 📊 Component Creation Summary

### By Status

| Status | Count | Description |
|--------|-------|-------------|
| ✅ Exists | 7 | Components exist but need Web3 integration |
| ❌ To Build | 80+ | New components needed for Web3 features |

### By Priority (for Phase 3.1)

**Critical (Must Have)**:
1. ConnectWalletButton
2. NetworkSelector
3. WalletModal
4. TransactionButton
5. TransactionStatusModal
6. OnchainIDSetup

**High Priority**:
1. ComplianceStatusBadge
2. ComplianceCheckProgress
3. TokenBalance
4. AddressDisplay
5. GasEstimator

**Medium Priority**:
1. TransactionHistory
2. ClaimsList
3. ContractAddress
4. ExplorerLink

**Low Priority (Phase 3.2+)**:
- All specific feature components (condition reports, telematics, etc.)

---

## 🔗 Smart Contract Dependencies

### Contracts to Integrate (in order)

1. **Phase 3.1-3.2**:
   - OnchainID (ERC-734/735)
   - ComplianceModule
   - Basic wallet connection

2. **Phase 3.3**:
   - AssetToken (ERC-3643)
   - RevenueToken (ERC-3643)
   - PaymentProtocol (investment)
   - Campaign contract

3. **Phase 3.4**:
   - VehicleNFT
   - AssetTokenFactory
   - RevenueTokenFactory
   - RevenueDistributor

4. **Phase 3.5**:
   - RentalBooking
   - PaymentProtocol (rental)
   - DisputeResolution
   - IPFS integration

5. **Phase 3.6**:
   - CRE services (telematics, compliance, damage assessment)
   - Chainlink Automation
   - Full end-to-end testing

---

## 📁 File Structure

```
/frontend
├── /src
│   ├── /components
│   │   ├── /web3
│   │   │   ├── /wallet          # Phase 3.1
│   │   │   │   ├── ConnectWalletButton.tsx
│   │   │   │   ├── NetworkSelector.tsx
│   │   │   │   ├── WalletModal.tsx
│   │   │   │   └── AddressDisplay.tsx
│   │   │   ├── /identity        # Phase 3.2
│   │   │   │   ├── OnchainIDSetup.tsx
│   │   │   │   ├── ClaimsList.tsx
│   │   │   │   ├── VerificationFlow.tsx
│   │   │   │   └── ComplianceStatus.tsx
│   │   │   ├── /tokens          # Phase 3.3
│   │   │   │   ├── AssetTokenCard.tsx
│   │   │   │   ├── RevenueTokenCard.tsx
│   │   │   │   ├── TokenTransferModal.tsx
│   │   │   │   └── RevenueDistributionHistory.tsx
│   │   │   ├── /transactions    # Phase 3.1
│   │   │   │   ├── TransactionButton.tsx
│   │   │   │   ├── TransactionStatusModal.tsx
│   │   │   │   ├── GasEstimator.tsx
│   │   │   │   └── TransactionHistory.tsx
│   │   │   ├── /compliance      # Phase 3.2
│   │   │   │   ├── ComplianceStatusBadge.tsx
│   │   │   │   ├── ComplianceRequirementsList.tsx
│   │   │   │   └── CREVerificationProgress.tsx
│   │   │   └── /display         # Phase 3.1
│   │   │       ├── TokenBalance.tsx
│   │   │       ├── TokenApprovalStatus.tsx
│   │   │       └── ContractAddress.tsx
│   │   ├── /investor
│   │   │   ├── InvestmentModal.tsx               # Phase 3.3
│   │   │   ├── InvestorTypeSelector.tsx          # Phase 3.2
│   │   │   ├── WhitelistTierCard.tsx             # Phase 3.2
│   │   │   ├── MilestoneTracker.tsx              # Phase 3.3
│   │   │   └── ComplianceGate.tsx                # Phase 3.2
│   │   ├── /rentor
│   │   │   ├── VehicleNFTMintingWizard.tsx       # Phase 3.4
│   │   │   ├── CampaignCreationWizard.tsx        # Phase 3.4
│   │   │   ├── TokenDeploymentForm.tsx           # Phase 3.4
│   │   │   ├── InvestorListTable.tsx             # Phase 3.4
│   │   │   ├── RevenueDistributionDashboard.tsx  # Phase 3.4
│   │   │   └── MaintenanceLogger.tsx             # Phase 3.4
│   │   └── /renter
│   │       ├── ComplianceCheckStep.tsx           # Phase 3.5
│   │       ├── DepositEscrowStep.tsx             # Phase 3.5
│   │       ├── OnChainPaymentStep.tsx            # Phase 3.5
│   │       ├── ConditionReportForm.tsx           # Phase 3.5
│   │       ├── ActiveRentalDashboard.tsx         # Phase 3.5
│   │       ├── ReturnInitiationModal.tsx         # Phase 3.5
│   │       ├── DisputeForm.tsx                   # Phase 3.5
│   │       └── DisputeStatusTracker.tsx          # Phase 3.5
│   ├── /contracts
│   │   ├── /abis                # Contract ABIs
│   │   │   ├── OnchainID.json
│   │   │   ├── AssetToken.json
│   │   │   ├── RevenueToken.json
│   │   │   ├── VehicleNFT.json
│   │   │   ├── RentalBooking.json
│   │   │   └── PaymentProtocol.json
│   │   └── addresses.ts         # Contract addresses
│   ├── /hooks
│   │   └── /contracts
│   │       ├── useAssetToken.ts
│   │       ├── useRevenueToken.ts
│   │       ├── useVehicleNFT.ts
│   │       ├── useBookingContract.ts
│   │       └── usePaymentProtocol.ts
│   ├── /providers
│   │   └── Web3Provider.tsx     # WagmiConfig + RainbowKit
│   ├── /store
│   │   └── web3Store.ts         # Web3 state management
│   └── /lib
│       └── /web3
│           ├── errorHandler.ts
│           ├── formatters.ts
│           └── constants.ts
```

---

## 🚀 Quick Start Guide

To begin Phase 3.1, run:

```bash
# Install dependencies
npm install wagmi viem @rainbow-me/rainbowkit

# Copy contract ABIs
# (Manual step: copy from /contracts/out/ to /frontend/src/contracts/abis/)

# Start with wallet connection
# Create: /frontend/src/providers/Web3Provider.tsx
# Create: /frontend/src/components/web3/wallet/ConnectWalletButton.tsx
```

---

## 📝 Notes

- **Status Legend**:
  - ✅ = Component exists (needs Web3 integration)
  - ❌ = Component needs to be built from scratch

- **CRE Integration**: Components marked with CRE will initially use mock data and can be integrated with Chainlink CRE services later.

- **IPFS**: Condition reports and evidence will use IPFS. Consider Pinata or Infura for storage.

- **Testing**: All components should be tested on testnets (Goerli, Mumbai) before mainnet.
