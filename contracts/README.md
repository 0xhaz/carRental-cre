# Rental Car Tokenization Platform - Proof of Concept

A decentralized platform combining vehicle tokenization, compliant investment mechanisms, and operational rental management using **ERC-3643** and **Chainlink Runtime Environment (CRE)**.

## 🏗️ Architecture Overview

### Core Components

1. **Identity Layer (OnchainID - ERC-734/735)**
   - Blockchain-based identity for renters, investors, and rentors
   - Claim-based verification system
   - Trusted issuer management

2. **Token Layer (ERC-3643)**
   - **AssetToken**: Vehicle ownership tokens
   - **RevenueToken**: Investment return rights
   - Modular compliance with 4 investor types

3. **Payment Protocol (RegShieldPaymentProtocol)**
   - Dual-purpose: Investment capital raising + Rental payments
   - Multi-type refunds (Automatic, Manual, Dispute, Emergency)
   - Milestone-based escrow for investments

4. **Vehicle Registry (NFT-based)**
   - Each vehicle as unique NFT
   - Linked to Asset/Revenue tokens
   - Maintenance and incident tracking

5. **Rental Management**
   - Full booking lifecycle (Request → Active → Complete)
   - Condition reporting (pre/post rental)
   - Dispute resolution

6. **Chainlink CRE Integration**
   - Identity verification service
   - Vehicle telematics service
   - Damage assessment (AI-powered)
   - Valuation service

## 📁 Project Structure

```
rental-car-poc/
├── contracts/
│   ├── OnchainID.sol                 # ERC-734/735 identity
│   ├── ERC3643Token.sol              # Compliant security tokens
│   ├── PaymentProtocol.sol           # Escrow & refunds
│   └── RentalManagement.sol          # Vehicle NFT & bookings
├── chainlink-cre/
│   ├── identity-verification-service.js
│   └── vehicle-telematics-service.js
├── docs/
│   └── ARCHITECTURE.md               # Detailed architecture
└── README.md                         # This file
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Hardhat or Foundry
- Chainlink Node (for CRE deployment)
- PostgreSQL (for off-chain data)

### Installation

```bash
# Clone repository
git clone <repo-url>
cd rental-car-poc

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration
```

### Environment Variables

```env
# Blockchain
PRIVATE_KEY=your_private_key
RPC_URL=your_rpc_url
ETHERSCAN_API_KEY=your_etherscan_key

# Chainlink CRE
CHAINLINK_NODE_URL=your_chainlink_node
TEE_ATTESTATION_KEY=your_tee_key

# External APIs (for CRE services)
JUMIO_API_URL=https://api.jumio.com
JUMIO_API_KEY=your_key

ONFIDO_API_URL=https://api.onfido.com
ONFIDO_API_KEY=your_key

DMV_API_URL=your_dmv_api
INSURANCE_VERIFIER_API_URL=your_insurance_api

GEOTAB_API_URL=https://my.geotab.com
GEOTAB_API_KEY=your_key

# Payment
USDC_TOKEN_ADDRESS=0x...
```

## 📝 Deployment Guide

### 1. Deploy Core Contracts

```bash
# Compile contracts
npx hardhat compile

# Deploy identity factory
npx hardhat run scripts/deploy-identity.js --network <network>

# Deploy compliance module
npx hardhat run scripts/deploy-compliance.js --network <network>

# Deploy payment protocol
npx hardhat run scripts/deploy-payment.js --network <network>

# Deploy vehicle registry
npx hardhat run scripts/deploy-registry.js --network <network>

# Deploy rental booking
npx hardhat run scripts/deploy-rental.js --network <network>
```

### 2. Configure System

```bash
# Set up trusted issuers for identity claims
npx hardhat run scripts/setup-trusted-issuers.js --network <network>

# Configure compliance rules
npx hardhat run scripts/setup-compliance.js --network <network>

# Grant roles
npx hardhat run scripts/grant-roles.js --network <network>
```

### 3. Deploy Chainlink CRE Services

```bash
# Package CRE services
cd chainlink-cre
npm run package

# Deploy to Chainlink node
chainlink cre deploy identity-verification-service.js
chainlink cre deploy vehicle-telematics-service.js

# Configure service endpoints
chainlink cre configure --service identity-verification \
  --endpoint wss://your-node/identity-verify
```

## 🔄 Complete User Flows

### Flow 1: Investor Onboarding & Investment

1. **Create Identity**
```javascript
// Investor creates OnchainID
const identityFactory = await ethers.getContractAt("OnchainIDFactory", FACTORY_ADDRESS);
const tx = await identityFactory.createIdentity(investor.address);
const identity = await identityFactory.getIdentity(investor.address);
```

2. **KYC Verification (via CRE)**
```javascript
// CRE service verifies investor
const creRequest = {
  userId: investor.address,
  investorType: 1, // Retail
  personalInfo: {...},
  documents: {...}
};

// CRE returns attestation
const attestation = await identityVerificationService.verifyInvestorIdentity(creRequest);
```

3. **Add Claims to OnchainID**
```javascript
// Add KYC claim
await identity.addClaim(
  1, // CLAIM_KYC
  1, // ECDSA signature
  CRE_ISSUER_ADDRESS,
  attestation.signature,
  attestation.data,
  attestation.uri,
  expiresAt
);

// Add accredited investor claim
await identity.addClaim(2, ...); // CLAIM_ACCREDITED_INVESTOR
```

4. **Register as Investor**
```javascript
const compliance = await ethers.getContractAt("InvestorComplianceModule", COMPLIANCE_ADDRESS);
await compliance.registerInvestor(
  investor.address,
  1, // InvestorType.Retail
  50000, // $50k max investment
  "" // No regional restriction
);
```

5. **Make Investment**
```javascript
// Create investment payment
const payment = await paymentProtocol.createPayment(
  0, // PaymentType.Investment
  rentor.address,
  amount,
  USDC_ADDRESS,
  vehicleReferenceId,
  "Investment in Vehicle ABC123",
  { value: amount }
);

// System escrows payment and verifies compliance
await paymentProtocol.escrowPaymentWithMilestones(
  paymentId,
  [VEHICLE_PURCHASE_MILESTONE, REGISTRATION_MILESTONE],
  releaseTime
);
```

6. **Vehicle Purchase & Token Minting**
```javascript
// Once milestones complete, funds released
await paymentProtocol.completeMilestone(paymentId, VEHICLE_PURCHASE_MILESTONE);
await paymentProtocol.completeMilestone(paymentId, REGISTRATION_MILESTONE);
await paymentProtocol.releasePayment(paymentId);

// Mint AssetToken and RevenueToken
const assetToken = await ERC3643Token.deploy(...);
const revenueToken = await ERC3643Token.deploy(...);

await assetToken.mint(investor.address, assetTokenAmount);
await revenueToken.mint(investor.address, revenueTokenAmount);

// Mint Vehicle NFT
await vehicleRegistry.mintVehicle(
  rentor.address,
  vehicleMetadata,
  assetToken.address,
  revenueToken.address
);
```

### Flow 2: Renter Booking & Rental

1. **Create Renter Identity**
```javascript
const tx = await identityFactory.createIdentity(renter.address);
const identity = await identityFactory.getIdentity(renter.address);
```

2. **Renter Verification (via CRE)**
```javascript
const creRequest = {
  userId: renter.address,
  personalInfo: {...},
  driverLicense: {...},
  insuranceInfo: {...}
};

const attestation = await identityVerificationService.verifyRenterIdentity(creRequest);
```

3. **Add Renter Claims**
```javascript
await identity.addClaim(1, ...); // CLAIM_KYC
await identity.addClaim(4, ...); // CLAIM_DRIVER_LICENSE
await identity.addClaim(5, ...); // CLAIM_INSURANCE
await identity.addClaim(6, ...); // CLAIM_CREDIT_SCORE
```

4. **Request Booking**
```javascript
const booking = await rentalBooking.requestBooking(
  vehicleId,
  startTime,
  endTime,
  ratePerDay,
  securityDeposit,
  { value: totalCost + securityDeposit }
);
```

5. **Compliance Approval**
```javascript
// Compliance officer reviews CRE attestation
await rentalBooking.approveBooking(bookingId);
```

6. **Start Rental**
```javascript
// Operator records pre-rental condition
const preCondition = {
  timestamp: Date.now(),
  mileage: 45000,
  fuelLevel: 100,
  photoHashes: [...],
  damageNotes: [],
  inspector: operator.address,
  signature: "0x..."
};

await rentalBooking.startRental(bookingId, preCondition);

// CRE unlocks vehicle via IoT
// Telematics monitoring begins
```

7. **Active Rental Monitoring (via CRE)**
```javascript
// CRE continuously monitors vehicle
const monitoring = await vehicleTelematicsService.monitorVehicle({
  vehicleId,
  bookingId,
  geofence: {...},
  maxSpeed: 120,
  expectedReturnTime
});

// Alerts sent if violations detected
if (monitoring.alerts.length > 0) {
  // Send notifications
}
```

8. **Return & Settlement**
```javascript
// Renter initiates return
await rentalBooking.initiateReturn(bookingId);

// Operator inspects vehicle
const postCondition = {...};

// CRE assesses damage
const damageAssessment = await vehicleTelematicsService.assessVehicleDamage({
  vehicleId,
  bookingId,
  preRentalPhotos,
  postRentalPhotos
});

// Complete return
await rentalBooking.completeReturn(
  bookingId,
  postCondition,
  damageAssessment.totalEstimatedCost
);

// Payments automatically settled:
// - Rental fee to rentor
// - Deposit refund (minus damages) to renter
// - Net revenue distributed to RevenueToken holders
```

### Flow 3: Revenue Distribution

1. **Revenue Accumulation**
```javascript
// After each completed rental
const rentalRevenue = booking.totalCost;
await vehicleRegistry.addRevenue(vehicleId, rentalRevenue);
```

2. **Periodic Distribution (via Chainlink Automation)**
```javascript
// Triggered daily/weekly
await revenueDistributor.distributeRevenue(vehicleToken);

// Waterfall applied:
// 15% → Platform fee
// 10% → Maintenance reserve
// 5% → Insurance
// 10% → Operating costs
// 60% → RevenueToken holders (proportional)
```

3. **Investor Receives Revenue**
```javascript
// RevenueToken holders automatically receive distributions
// No action needed - funds arrive in wallet
```

## 🧪 Testing

### Unit Tests

```bash
# Run all tests
npx hardhat test

# Run specific test suite
npx hardhat test test/OnchainID.test.js
npx hardhat test test/ERC3643Token.test.js
npx hardhat test test/PaymentProtocol.test.js
npx hardhat test test/RentalManagement.test.js
```

### Integration Tests

```bash
# Test complete flows
npx hardhat test test/integration/investment-flow.test.js
npx hardhat test test/integration/rental-flow.test.js
```

### CRE Service Tests

```bash
cd chainlink-cre
npm test

# Test specific service
npm test -- identity-verification-service.test.js
```

## 📊 Example Scenarios

### Scenario 1: Retail Investor

**Profile:**
- Type: Retail Accredited Investor
- Investment: $10,000 in 2024 Tesla Model 3
- Expected Return: 15% annually

**Journey:**
1. Complete KYC via Jumio
2. Verify accredited status ($200k+ income)
3. Pass compliance checks
4. Invest $10,000 via escrow
5. Receive RevenueTokens
6. Earn ~$1,500/year from rental income (distributed monthly)

### Scenario 2: Strategic Partner

**Profile:**
- Type: Strategic Partner (Car Rental Company)
- Investment: $1M in fleet of 50 vehicles
- Goal: Expand operations with capital

**Journey:**
1. Enhanced KYC + business verification
2. Board approval process (Tier 3)
3. Investment with 12-month lock-up
4. Receive significant RevenueToken stake
5. Potential operational partnership
6. Higher returns due to scale

### Scenario 3: Regional Investor

**Profile:**
- Type: Regional (California only)
- Investment: $25,000
- Restriction: Can only invest in CA-operated vehicles

**Journey:**
1. KYC + regional eligibility claim
2. Register with CA restriction
3. Browse CA vehicles only
4. Invest in compliant vehicles
5. Transfer restrictions enforced by smart contract

## 🔐 Security Considerations

### Smart Contract Security
- Multi-signature for critical operations
- Time locks on parameter changes
- Circuit breakers (pause functionality)
- Role-based access control (RBAC)
- Comprehensive test coverage

### CRE Security
- TEE (Trusted Execution Environment) for data processing
- Hardware-backed cryptographic signing
- Zero-knowledge proofs for sensitive data
- Secure API credential management
- Audit logging

### Operational Security
- KYC/AML compliance
- Ongoing monitoring
- Dispute resolution process
- Insurance coverage requirements
- Regular security audits

## 📈 Key Metrics Dashboard

### For Rentors
- Total vehicles tokenized
- Total capital raised
- Average utilization rate
- Revenue per vehicle
- Maintenance costs
- Investor satisfaction

### For Investors
- Portfolio value
- Revenue earned (monthly/total)
- ROI percentage
- Vehicle performance
- Risk metrics
- Liquidity events

### For Renters
- Booking history
- Total spent
- Loyalty rewards
- Incident history
- Credit score impact

## 🛠️ Development Roadmap

### Phase 1: MVP (Current PoC)
- ✅ Core smart contracts
- ✅ Basic CRE services
- ✅ Essential flows
- ⏳ Frontend UI
- ⏳ Testnet deployment

### Phase 2: Beta
- Multi-chain support
- Advanced telematics
- Dynamic pricing
- Insurance integration
- Mobile app

### Phase 3: Production
- Mainnet launch
- Institutional partnerships
- Secondary market
- DAO governance
- Global expansion

## 🤝 Contributing

Contributions welcome! Please see CONTRIBUTING.md for guidelines.

## 📄 License

MIT License - see LICENSE.md

## 📞 Support

- Documentation: https://docs.example.com
- Discord: https://discord.gg/example
- Email: support@example.com

## 🙏 Acknowledgments

- Chainlink for CRE infrastructure
- ERC-3643 standard contributors
- OpenZeppelin for contract libraries
- Community testers and advisors
