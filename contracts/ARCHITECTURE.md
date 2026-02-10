# Rental Car Tokenization Platform - Architecture

## Overview
Decentralized rental car platform combining vehicle tokenization, compliant investment mechanisms, and operational rental management using ERC-3643 and Chainlink CRE.

## System Components

### 1. Core Identity & Compliance Layer

#### OnchainID System (ERC-734/735)
- **Purpose**: Blockchain-based identity for all participants
- **Participants**:
  - **Renters**: Driver license, insurance, credit score claims
  - **Investors**: Accreditation, regional eligibility, AML/KYC claims
  - **Rentors**: Business registration, vehicle ownership claims
  
**Claim Structure**:
```
Claim Topics:
- 1: KYC Verified
- 2: Accredited Investor
- 3: Regional Eligibility (per jurisdiction)
- 4: Driver License Valid
- 5: Insurance Verified
- 6: Credit Score Range
- 7: Business Registered
- 8: Vehicle Ownership Proof
```

**Trusted Issuers** (via Chainlink CRE):
- KYC providers (Jumio, Onfido)
- Government agencies (DMV, business registries)
- Insurance providers
- Credit bureaus

#### ERC-3643 Token System

**A. AssetToken (Vehicle Ownership)**
- Represents fractional or full ownership of specific vehicles
- One token contract per vehicle or fleet
- Tradeable among qualified investors
- Linked to physical vehicle via VIN

**B. RevenueToken (Investment Rights)**
- Represents rights to rental income streams
- Issued to investors who fund vehicle purchases
- Non-transferable or restricted transfer (securities)
- Automatically receives proportional rental revenue

**Benefits of Dual Token**:
- Clean separation: ownership vs. income rights
- Flexibility: Can sell asset while retaining revenue stream
- Compliance: Different regulatory treatment

#### ComplianceRules Engine

**Multi-Layer Validation**:

1. **Investor Compliance Module**
   - Accreditation verification
   - Investment limits per type
   - Regional restrictions
   - Transfer velocity limits
   - Holding period enforcement

2. **Renter Compliance Module**
   - Age verification (21+)
   - Driver license validity
   - Insurance coverage
   - Credit score minimum
   - Prior incident history

3. **Transfer Compliance Module**
   - Whitelist tier verification
   - Lock-up period checks
   - Maximum transfer size
   - Cooling-off period
   - Large transfer alerts

4. **Operational Compliance Module**
   - Vehicle registration status
   - Maintenance schedule adherence
   - Insurance coverage validity
   - Regional operating permits

### 2. Investor Management System

#### Investor Type System

```
Type 1: Retail Accredited Investor
├── Min Investment: $1,000
├── Max Investment: $50,000 per vehicle
├── Required Tier: Tier 1 (Basic KYC)
├── Transfer Limit: 10% of holdings per month
└── Lock-up: 6 months

Type 2: Institutional Investor
├── Min Investment: $50,000
├── Max Investment: $500,000 per fleet
├── Required Tier: Tier 2 (Enhanced DD)
├── Transfer Limit: 25% of holdings per month
└── Lock-up: 3 months

Type 3: Strategic Partner (Rental Companies)
├── Min Investment: $500,000
├── Max Investment: Unlimited
├── Required Tier: Tier 3 (Board Approval)
├── Transfer Limit: 50% of holdings per quarter
└── Lock-up: 12 months

Type 4: Regional Specific Investor
├── Based on Type 1-3 but with geographic restrictions
├── Must have regional eligibility claim
├── Can only invest in vehicles operating in their region
└── Additional compliance based on local regulations
```

#### Whitelist Tier System

```
Tier 1: Basic KYC
├── Identity verification
├── Address proof
├── Source of funds declaration
└── Sanctions screening

Tier 2: Enhanced Due Diligence
├── All Tier 1 requirements
├── Accredited investor verification
├── Financial statements review
├── Background check
└── Reference checks

Tier 3: Strategic Partner Review
├── All Tier 2 requirements
├── Corporate structure analysis
├── Board approval required
├── Legal opinion
└── Business plan review

Tier 4: Regional Compliance
├── Tier 1, 2, or 3 base requirements
├── Regional regulatory compliance
├── Jurisdiction-specific documentation
└── Local tax registration
```

#### Large Transfer Detection

**Thresholds**:
- Absolute: >$100,000 or >10,000 tokens
- Relative: >5% of total token supply
- Velocity: >3 transfers in 24 hours

**Actions**:
1. Automatic hold (24-48 hours)
2. Compliance officer notification
3. Review queue entry
4. Enhanced transaction monitoring
5. Post-review release or rejection

### 3. Payment Protocol System

#### A. RegShieldPaymentProtocol (Investment Payments)

**Purpose**: Handle capital raising and investment transactions

**Flow**:
```
1. Investment Commitment
   ├── Investor creates commitment
   ├── Funds escrowed in PaymentEscrow
   ├── Compliance checks via OnchainID
   └── RevenueTokens reserved

2. Milestone Validation (via Chainlink CRE)
   ├── Vehicle identified and inspected
   ├── Purchase agreement verified
   ├── Insurance obtained
   └── Registration completed

3. Fund Release
   ├── Milestone confirmation
   ├── Funds released to rentor
   ├── RevenueTokens minted to investor
   └── AssetToken created (linked to VIN)

4. Revenue Distribution
   ├── Rental income accumulated
   ├── Operating costs deducted
   ├── Net revenue calculated
   └── Proportional distribution to RevenueToken holders
```

**Refund Types**:
- **Automatic Refund**: Campaign fails to meet minimum
- **Manual Refund**: Compliance officer decision
- **Dispute Refund**: Arbitration result
- **Emergency Refund**: Critical issue (fraud, safety)

#### B. RentalPaymentProtocol (Operational Payments)

**Purpose**: Handle renter payments and deposits

**Flow**:
```
1. Booking & Deposit
   ├── Renter requests booking
   ├── Compliance checks (OnchainID + CRE)
   ├── Security deposit escrowed
   └── Rental fee payment scheduled

2. Active Rental
   ├── Vehicle released (IoT unlock via CRE)
   ├── Telematics monitoring
   ├── Payment processing (time-based)
   └── Condition tracking

3. Return & Settlement
   ├── Vehicle returned
   ├── Condition assessment (CRE + IoT)
   ├── Damage/penalty calculation
   ├── Deposit settlement
   └── Final payment to RevenueToken holders

4. Revenue Distribution
   ├── Rental revenue collected
   ├── Platform fees deducted
   ├── Maintenance reserve allocated
   ├── Net revenue to RevenueToken holders
   └── Automatic distribution via smart contract
```

**Payment States**:
- PENDING: Initial creation
- ESCROWED: Funds locked
- ACTIVE: Rental in progress
- PROCESSING: Return evaluation
- COMPLETED: Funds distributed
- DISPUTED: Arbitration needed
- REFUNDED: Funds returned
- CANCELLED: Booking cancelled

### 4. Vehicle Registry System

#### VehicleNFT Contract

**Each vehicle represented as unique NFT**:

```
VehicleNFT {
  tokenId: uint256 (unique)
  vin: string (Vehicle Identification Number)
  metadata: {
    make: string
    model: string
    year: uint256
    color: string
    mileage: uint256 (updated via CRE)
    registrationExpiry: uint256
    insuranceExpiry: uint256
  }
  assetToken: address (linked ERC-3643 AssetToken)
  revenueToken: address (linked ERC-3643 RevenueToken)
  status: enum (Available, Rented, Maintenance, Retired)
  currentBooking: uint256 (if rented)
  maintenanceSchedule: uint256[] (timestamp array)
  incidentHistory: uint256[] (incident IDs)
}
```

**Functions**:
- `mintVehicle()`: Create new vehicle NFT (rentor only)
- `updateStatus()`: Change operational status
- `recordMaintenance()`: Log maintenance event
- `recordIncident()`: Log damage/incident
- `updateMileage()`: Update from telematics (CRE)
- `linkTokens()`: Associate Asset/Revenue tokens

### 5. Rental Management System

#### RentalBooking Contract

**Booking Lifecycle**:

```
States:
- REQUESTED: Renter initiated
- PENDING_APPROVAL: Compliance checks running (CRE)
- APPROVED: Ready for pickup
- ACTIVE: Vehicle in renter possession
- PENDING_RETURN: Return process initiated
- COMPLETED: Successfully closed
- CANCELLED: Cancelled by renter/system
- DISPUTED: Issue requiring resolution
```

**Booking Structure**:
```
Booking {
  id: uint256
  vehicleId: uint256 (NFT token ID)
  renter: address (OnchainID)
  startTime: uint256
  endTime: uint256
  ratePerDay: uint256
  securityDeposit: uint256
  status: BookingStatus
  paymentId: uint256 (link to payment escrow)
  preCondition: ConditionReport (photos, mileage, fuel)
  postCondition: ConditionReport (populated at return)
  extensionCount: uint256
  overdueMinutes: uint256
}
```

**Key Functions**:
- `requestBooking()`: Create new booking request
- `approveBooking()`: System approval after compliance
- `startRental()`: Activate rental (unlock vehicle)
- `extendRental()`: Add time (with additional payment)
- `initiateReturn()`: Begin return process
- `completeReturn()`: Finalize after inspection
- `reportIssue()`: Flag problem during rental
- `disputeCharges()`: Contest damage/fees

#### RentalOperations Contract

**Vehicle Handover**:
```
Pickup Process:
1. Renter arrives at location
2. Condition inspection (photos via CRE)
3. Pre-rental report generated
4. Vehicle IoT unlocked via CRE
5. Booking status → ACTIVE
6. Telematics monitoring begins
```

**Condition Tracking**:
```
ConditionReport {
  timestamp: uint256
  mileage: uint256
  fuelLevel: uint8 (percentage)
  photoHashes: bytes32[] (IPFS)
  damageNotes: string[]
  inspectorId: address (OnchainID)
  signature: bytes
}
```

**Automated Monitoring** (via Chainlink CRE):
- Real-time GPS location
- Mileage accumulation
- Speed monitoring (for insurance)
- Geofencing violations
- Maintenance alerts
- Unauthorized usage detection

**Return Process**:
```
1. Renter initiates return in app
2. Return location verification
3. Post-rental condition inspection
4. Damage assessment (CRE AI analysis)
5. Cost calculation
6. Deposit settlement
7. Vehicle status → Available
8. Revenue distributed to RevenueToken holders
```

**Dispute Resolution**:
- Evidence submission period (48 hours)
- CRE-based automated adjudication (minor)
- Human arbitrator for complex cases
- Multi-signature resolution
- Appeals process

### 6. Chainlink CRE Integration Layer

#### CRE Services Architecture

**Service 1: Identity Verification Service**
```
Purpose: Verify claims for OnchainID system
Inputs:
  - User data (name, DOB, address, SSN)
  - Document uploads (license, passport)
  - Investor accreditation data
Outputs:
  - Signed claim attestations
  - Claim topic assignments
  - Verification confidence scores

APIs Accessed:
  - KYC: Jumio, Onfido, Sumsub
  - Accreditation: VerifyInvestor API
  - Credit: Experian, Equifax
  - DMV: State databases
  - Insurance: Carrier verification APIs
```

**Service 2: Compliance Validation Service**
```
Purpose: Real-time compliance checking
Inputs:
  - Transaction details
  - Participant OnchainIDs
  - Historical data
Outputs:
  - Compliance approval/rejection
  - Risk scores
  - Flagged conditions

Checks:
  - Sanctions screening (OFAC, UN)
  - PEP (Politically Exposed Person)
  - Adverse media
  - Regional restrictions
  - Transfer limits
```

**Service 3: Vehicle Telematics Service**
```
Purpose: Aggregate and validate vehicle data
Inputs:
  - IoT device data (GPS, OBD-II)
  - Vehicle API data (Tesla, connected cars)
  - Third-party telematics
Outputs:
  - Real-time location
  - Mileage updates
  - Maintenance alerts
  - Incident detection
  - Usage analytics

IoT Providers:
  - Geotab
  - Samsara
  - Verizon Connect
  - Vehicle OEM APIs
```

**Service 4: Valuation & Pricing Service**
```
Purpose: Dynamic vehicle valuation and pricing
Inputs:
  - Vehicle metadata
  - Current mileage
  - Market data
  - Maintenance history
  - Incident history
Outputs:
  - Current market value
  - Depreciation rate
  - Recommended rental rate
  - Investment return projections

Data Sources:
  - Kelly Blue Book API
  - Edmunds API
  - Black Book
  - Local rental market data
  - Demand forecasting
```

**Service 5: Damage Assessment Service**
```
Purpose: AI-powered damage detection
Inputs:
  - Pre/post rental photos
  - Video walkarounds
  - Inspector notes
Outputs:
  - Damage severity classification
  - Repair cost estimates
  - Liability determination
  - Evidence package for disputes

Technologies:
  - Computer vision (damage detection)
  - Cost estimation models
  - Comparative analysis
  - Confidence scoring
```

**Service 6: Revenue Calculation Service**
```
Purpose: Calculate and distribute rental revenue
Inputs:
  - Rental transactions
  - Operating costs
  - Maintenance expenses
  - RevenueToken holder registry
Outputs:
  - Net revenue per vehicle
  - Distribution amounts per holder
  - Tax documentation data
  - Performance metrics

Calculations:
  - Gross rental income
  - Platform fees (e.g., 15%)
  - Maintenance reserve (e.g., 10%)
  - Insurance costs
  - Net distributable income
  - Per-token distribution amount
```

#### CRE-to-Contract Communication

**Attestation Pattern**:
```
1. CRE Service completes computation
2. Generates attestation with:
   - Computation result
   - Input data hash
   - Timestamp
   - Cryptographic proof (TEE signature)
3. Submits attestation on-chain
4. Smart contract verifies proof
5. Contract executes based on result
```

**Example: Renter Approval Flow**
```
User requests booking
    ↓
Smart contract calls CRE
    ↓
CRE Service accesses:
  - DMV API (license valid?)
  - Insurance API (coverage active?)
  - Credit bureau (score > threshold?)
  - Incident database (clean record?)
    ↓
CRE generates attestation:
  {
    approved: true/false,
    expiresAt: timestamp,
    confidenceScore: 0-100,
    flags: [],
    signature: 0x...
  }
    ↓
Attestation posted on-chain
    ↓
Smart contract verifies signature
    ↓
Booking approved/rejected
```

### 7. Revenue Distribution Mechanism

#### Revenue Waterfall

```
Gross Rental Income (100%)
    ↓
├─ Platform Fee (15%)
│  └─ Protocol treasury
├─ Maintenance Reserve (10%)
│  └─ Per-vehicle escrow
├─ Insurance Premium (5%)
│  └─ Coverage payments
├─ Operating Costs (10%)
│  └─ Gas, cleaning, parking
└─ Net Distributable (60%)
   └─ To RevenueToken Holders (proportional)
```

#### Automated Distribution

**Trigger**: Chainlink Automation (daily/weekly)

**Process**:
```
1. Calculate period revenue per vehicle
2. Apply waterfall deductions
3. Query RevenueToken holder balances
4. Calculate per-holder amounts
5. Execute batch transfers
6. Emit distribution events
7. Update accounting records
```

**Smart Contract**:
```solidity
contract RevenueDistributor {
  mapping(address => uint256) public revenueTokens; // ERC-3643 addresses
  mapping(address => uint256) public accumulatedRevenue;
  
  function distributeRevenue(address vehicleToken) external {
    // Called by Chainlink Automation
    uint256 revenue = accumulatedRevenue[vehicleToken];
    
    // Apply waterfall
    uint256 platformFee = revenue * 15 / 100;
    uint256 maintenance = revenue * 10 / 100;
    uint256 insurance = revenue * 5 / 100;
    uint256 operating = revenue * 10 / 100;
    uint256 distributable = revenue - platformFee - maintenance - insurance - operating;
    
    // Get RevenueToken holders
    address revenueToken = revenueTokens[vehicleToken];
    address[] memory holders = getTokenHolders(revenueToken);
    uint256 totalSupply = IERC20(revenueToken).totalSupply();
    
    // Distribute proportionally
    for (uint i = 0; i < holders.length; i++) {
      uint256 balance = IERC20(revenueToken).balanceOf(holders[i]);
      uint256 amount = distributable * balance / totalSupply;
      payable(holders[i]).transfer(amount);
    }
    
    accumulatedRevenue[vehicleToken] = 0;
  }
}
```

## Data Flow Diagrams

### Investment Flow
```
Investor → RegShieldPayment → Escrow → Compliance Check (CRE) 
    → Approval → Fund Release → Vehicle Purchase 
    → AssetToken Minted → RevenueToken Minted → Investor
```

### Rental Flow
```
Renter → Booking Request → Compliance Check (CRE) 
    → Approval → Deposit Escrow → Vehicle Unlock (CRE/IoT)
    → Active Rental → Telematics Monitoring (CRE)
    → Return → Condition Check (CRE) → Settlement
    → Revenue Distribution → RevenueToken Holders
```

### Compliance Flow
```
User Action → OnchainID Claims → Compliance Module
    → CRE Verification Services → External APIs
    → Attestation Generation → On-chain Verification
    → Approval/Rejection → User Notification
```

## Security Considerations

1. **Multi-signature Controls**: Critical operations require multiple signers
2. **Time Locks**: Changes to core parameters have delay periods
3. **Circuit Breakers**: Emergency pause functionality
4. **Rate Limiting**: Prevent spam/DOS attacks
5. **Access Control**: Role-based permissions (RBAC)
6. **Audit Trails**: Comprehensive event logging
7. **Oracle Security**: CRE cryptographic proofs
8. **Private Key Management**: Hardware security modules
9. **Smart Contract Audits**: Third-party security reviews
10. **Bug Bounty Program**: Incentivized vulnerability disclosure

## Scalability Strategy

1. **Layer 2 Deployment**: Use L2 for high-frequency operations
2. **Batch Processing**: Group operations to reduce gas costs
3. **State Channels**: Off-chain state for active rentals
4. **Sharding**: Separate contracts per region/fleet
5. **IPFS**: Store large data (photos, documents) off-chain
6. **Indexing**: The Graph protocol for efficient queries
7. **Caching**: CRE-based caching layer for frequent reads

## Regulatory Compliance

1. **Securities Law**: RevenueTokens as registered securities
2. **AML/KYC**: Comprehensive identity verification
3. **Regional Regulations**: Jurisdiction-specific modules
4. **Tax Reporting**: Automated 1099 generation
5. **Data Privacy**: GDPR/CCPA compliance via CRE
6. **Consumer Protection**: Transparent terms, dispute resolution
7. **Insurance**: Adequate coverage, proof of coverage
8. **Licensing**: Rental business permits per jurisdiction

## Future Enhancements

1. **Cross-chain Support**: Multi-chain deployment
2. **Dynamic Pricing**: AI-driven rate optimization
3. **Loyalty Programs**: Token-based rewards
4. **Insurance Protocol**: Decentralized insurance pool
5. **Secondary Market**: P2P token trading
6. **Fleet Management**: Enterprise dashboard
7. **Carbon Credits**: Offset tracking for EVs
8. **Subscription Model**: Monthly unlimited rentals
9. **Peer-to-Peer**: Direct renter-owner matching
10. **DAO Governance**: Token holder voting on parameters
