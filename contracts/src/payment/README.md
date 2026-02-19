# Payment System

Handles both investment payments (capital raising for vehicle purchases) and rental payments (renter booking fees). Includes escrow management, milestone-based fund release, refund processing, and dispute resolution.

## Contracts

### RegShieldPaymentProtocol.sol — Investment Payment Protocol

**Inheritance:** `IPaymentProtocol`, `Ownable`, `ReentrancyGuard`, `Pausable`

**Constructor params:** `complianceRules`, `identityRegistry`

The core investment payment contract. Manages capital raising campaigns for vehicle purchases with milestone-based escrow release and automatic token minting.

**Default Payment Settings:**

| Setting | Value |
| --- | --- |
| Confirmation period | 24 hours |
| Dispute window | 7 days |
| Refund window | 30 days |
| Max payment | 10 ETH |
| Min payment | 0.001 ETH |
| Escrow fee | 0.1% (10 bps) |

**Payment States:** `PENDING`, `CONFIRMED`, `DISPUTED`, `REFUNDED`, `EXPIRED`, `CANCELLED`

**The 4 Investment Milestones:**

| Milestone | Verification | Description |
| --- | --- | --- |
| `VEHICLE_IDENTIFIED` | NHTSA VIN API (via CRE) | Vehicle purchase agreement located |
| `PURCHASE_VERIFIED` | On-chain check (via CRE) | Title transfer confirmed, NFT active |
| `INSURANCE_OBTAINED` | VehicleNFT expiry (via CRE) | Insurance policy issued and recorded |
| `REGISTRATION_COMPLETED` | VehicleNFT expiry (via CRE) | DMV records updated |

**Investment Flow:**

1. Investor calls `initiateVehicleInvestment(vehicleId, rentor, amount, reason)` — validates investor compliance, escrows funds
2. CRE Payment Workflow calls `completeVehicleMilestone(vehicleId, milestone)` for each milestone as they are verified
3. When all 4 milestones complete, the contract automatically:
   - Batch-releases all PENDING investor escrows
   - Mints AssetToken + RevenueToken proportional to each investor's payment amount
4. Rentor co-investment: `initiateRentorCoInvestment(vehicleId, amount, reason)` — payer==payee, validates vehicle ownership

**Campaign Failure:** `batchCancelVehiclePayments(vehicleId)` — batch-cancels all PENDING payments for a vehicle. Triggered by CampaignMonitorReceiver when campaign fails or is cancelled.

**Token Registration:** `registerVehicleTokens(vehicleId, assetToken, revenueToken)` — links the deployed token pair to a vehicle for automatic minting on fund release.

**Key Events:** `VehicleInvestmentInitiated`, `RentorCoInvestmentInitiated`, `VehicleMilestoneCompleted`, `VehicleMilestonesFullyCompleted`, `InvestmentFundsReleased`, `InvestorTokensMinted`, `CampaignPaymentsBatchCancelled`

---

### RentalPaymentProtocol.sol — Rental Payment Protocol

**Inheritance:** `IRentalPaymentProtocol`, `Ownable`, `ReentrancyGuard`, `Pausable`

**Constructor params:** `paymentEscrow`, `identityRegistry`, `participantTypeRegistry`, `renterCompliance`

Handles renter payment collection, escrow management, penalty enforcement, and revenue routing for rental bookings.

**Fee Rates (defaults, adjustable):**

| Fee | Rate |
| --- | --- |
| Platform Fee | 5% (500 bps) |
| Maintenance Reserve | 2% (200 bps) |
| Max combined | 20% cap |

**Rental Payment States:**

| State | Description |
| --- | --- |
| PENDING | Booking created |
| ESCROWED | Funds locked in PaymentEscrow |
| ACTIVE | Rental in progress |
| PROCESSING | Return evaluation underway |
| COMPLETED | Successfully completed |
| DISPUTED | Dispute raised |
| REFUNDED | Funds returned |
| CANCELLED | Booking cancelled |

**Penalty Reasons:** `NONE`, `DAMAGE`, `LATE_RETURN`, `EXCESSIVE_MILEAGE`, `CLEANING_FEE`, `MISSING_FUEL`, `TOLL_VIOLATION`, `TRAFFIC_VIOLATION`, `OTHER`

**Payment Flow:**

1. `createRentalBooking(bookingId, vehicleId, rentor, rentalFee, securityDeposit, startTime, endTime)` — renter pays `rentalFee + securityDeposit + escrowFee`. State: `PENDING → ESCROWED`
2. `startRental(paymentId)` — authorized operator activates rental at/after startTime. State: `ESCROWED → ACTIVE`
3. `completeRental(paymentId, penaltyAmount, reason, description)` — settles rental. Penalty (up to deposit cap) stays with rentor, remaining deposit returns to renter. Revenue forwarded to `RevenueDistributor.addRevenue()`. State: `ACTIVE → COMPLETED`
4. `cancelRental(paymentId)` — full refund before startTime via `paymentEscrow.refundEscrow()`

**Key Events:** `RentalBookingCreated`, `RentalStarted`, `RentalCompleted`, `PenaltyApplied`, `RevenueDistributed`

---

### PaymentEscrow.sol — Secure Fund Custody

**Inheritance:** `IPaymentEscrow`, `Ownable`, `ReentrancyGuard`, `Pausable`

**Constructor params:** `paymentProtocol` (only this address can call core functions)

Holds funds securely for both investment and rental payments. Charges a configurable escrow fee.

**Defaults:**

| Setting | Value |
| --- | --- |
| Escrow fee | 0.1% (10 bps) |
| Max fee | 10% (1000 bps) |
| Default duration | 31 days |

**Escrow States:** `ACTIVE`, `RELEASED`, `REFUNDED`, `EXPIRED`

**Key Functions:**

| Function | Description |
| --- | --- |
| `createEscrow(paymentId, payer, payee, amount, duration)` | Creates escrow. Fee = `amount * feeRate / 10000`. Holds `amount + fee` |
| `releaseEscrow(escrowId)` | Sends `amount` to payee. Fee stays in contract |
| `refundEscrow(escrowId)` | Returns `amount + fee` to payer |
| `emergencyRefund(escrowId)` | Emergency authority bypass — returns all to payer |
| `processExpiredEscrow(escrowId)` | Auto-refunds after expiry (permissionless) |
| `withdrawFees(recipient, amount)` | Owner withdraws accumulated fees |

---

### RefundManager.sol — Refund Processing

**Inheritance:** `IRefundManager`, `Ownable`, `ReentrancyGuard`, `Pausable`

**Constructor params:** `paymentProtocol`, `paymentEscrow`

Manages refund requests with type-based eligibility and approval workflows.

**Refund Types:**

| Type | Eligible States | Flow |
| --- | --- | --- |
| AUTOMATIC | PENDING, EXPIRED | Auto-approved, processed immediately |
| MANUAL | CONFIRMED | Requires compliance officer approval + 1h delay |
| DISPUTE | DISPUTED | Requires approval + processing delay |
| EMERGENCY | Any except REFUNDED | Emergency authority bypass, immediate |

**Refund Reasons:** `PAYMENT_CANCELLATION`, `DISPUTE_RESOLUTION`, `COMPLIANCE_FAILURE`, `ADMIN_OVERRIDE`, `EXPIRED`, `OTHER`

**Key Functions:** `requestRefund`, `approveRefund`, `rejectRefund`, `processRefund`, `emergencyRefund`, `processAutomaticRefund`

---

### DisputeResolver.sol — Dispute Arbitration

**Inheritance:** `IDisputeResolver`, `Ownable`, `ReentrancyGuard`

**Constructor params:** `paymentProtocol`

Oracle-based dispute resolution system with quorum voting.

**Defaults:** Review period = 48 hours, minimum quorum = 2 oracle votes.

**Dispute States:** `FILED`, `UNDERREVIEW`, `RESOLVED`, `APPEALED`, `CLOSED`

**Dispute Outcomes:** `PENDING`, `FAVOR_PAYER`, `FAVOR_PAYEE`, `PARTIAL_REFUND`, `ESCALATED`

**Dispute Flow:**

1. `fileDispute(paymentId, reason, evidenceHash)` — called by PaymentProtocol. State: `FILED`
2. Authorized oracles call `submitOracleVote(disputeId, favorsPayer, reasoning)`. First vote → `UNDERREVIEW`
3. `resolveDispute(disputeId)` — tallies votes when quorum reached. Majority wins; tie = `PARTIAL_REFUND`. State: `RESOLVED`
4. `appealDispute(disputeId, reason)` — disputer or respondent can appeal. State: `APPEALED`
5. `closeDispute(disputeId)` — owner closes resolved/appealed dispute. State: `CLOSED`
6. `emergencyResolve(disputeId, outcome, refundAmount)` — owner admin override

## Interfaces

- [IPaymentProtocol.sol](../interfaces/payment/IPaymentProtocol.sol)
- [IRentalPaymentProtocol.sol](../interfaces/payment/IRentalPaymentProtocol.sol)
- [IPaymentEscrow.sol](../interfaces/payment/IPaymentEscrow.sol)
- [IRefundManager.sol](../interfaces/payment/IRefundManager.sol)
- [IDisputeResolver.sol](../interfaces/payment/IDisputeResolver.sol)
