# Chainlink CRE Receiver Contracts

On-chain endpoints for Chainlink CRE (Compute Runtime Environment) workflows. Each receiver inherits from `ReceiverTemplate` which validates the calling Forwarder address and optionally the workflow ID, owner, and name before routing reports to the appropriate platform contracts.

## Base Contract

### ReceiverTemplate (Abstract)

**Location:** `contracts/src/interfaces/cre/ReceiverTemplate.sol`

**Inheritance:** `IReceiver`, `Ownable`, `IERC165`

**Constructor param:** `forwarderAddress` (Chainlink CRE Forwarder contract — required, cannot be address(0))

Provides configurable security validation for all CRE `onReport()` calls:

1. Validates `msg.sender == s_forwarderAddress`
2. Decodes metadata: `(bytes32 workflowId, bytes10 workflowName, address workflowOwner)`
3. Validates workflow ID, author, and/or name if configured
4. Calls `_processReport(report)` — the abstract hook each receiver implements

**Configurable Security Fields:**

| Field | Description |
| --- | --- |
| `s_forwarderAddress` | Only this Chainlink Forwarder can call `onReport()` |
| `s_expectedAuthor` | If set, rejects reports from other workflow owners |
| `s_expectedWorkflowName` | If set, rejects other workflow names |
| `s_expectedWorkflowId` | If set, rejects other workflow IDs |

---

## Receiver Contracts

### OnboardingReceiver.sol — Investor & Booking Approval

**Constructor params:** `forwarderAddress`, `investorRequestManager`, `rentalBooking`

**Triggered by:** Onboarding CRE Workflow (`onboarding-workflow`)

Routes KYC/AML verification results and booking approval decisions from the off-chain CRE workflow to on-chain contracts.

**Report format:** `abi.encode(ReportAction action, bytes actionData)`

| Action | Target Contract | Call |
| --- | --- | --- |
| `APPROVE_INVESTOR` | InvestorRequestManager | `approveRequest(address)` |
| `REJECT_INVESTOR` | InvestorRequestManager | `rejectRequest(address, string reason)` |
| `APPROVE_BOOKING` | RentalBooking | `approveBooking(uint256 bookingId)` |
| `REJECT_BOOKING` | RentalBooking | `rejectBooking(uint256 bookingId, string reason)` |

---

### PaymentReceiver.sol — Milestone Verification

**Constructor params:** `forwarderAddress`, `paymentProtocol`

**Triggered by:** Payment CRE Workflow (`rental-workflow`)

Routes milestone verification data from the off-chain CRE workflow (which calls NHTSA VIN API and checks on-chain state) to `RegShieldPaymentProtocol.completeMilestone()`.

**Report format:** `abi.encode(uint256 paymentId, string milestoneName)`

**Milestone names:** `"VEHICLE_IDENTIFIED"`, `"PURCHASE_VERIFIED"`, `"INSURANCE_OBTAINED"`, `"REGISTRATION_COMPLETED"`

**Requirement:** Must be registered as an authorized operator on `RegShieldPaymentProtocol` via `setAuthorizedOperator()`.

---

### VehicleReceiver.sol — Vehicle Telematics

**Constructor params:** `forwarderAddress`, `vehicleNFT`

**Triggered by:** Vehicle Telematics CRE Workflow (`vehicle-workflow`)

Routes vehicle telemetry data (GPS/IoT, damage detection, maintenance events) from the off-chain CRE workflow to VehicleNFT.

**Report format:** `abi.encode(ReportAction action, bytes actionData)`

| Action | VehicleNFT Call | Decoded Args |
| --- | --- | --- |
| `UPDATE_MILEAGE` | `updateMileage(tokenId, newMileage)` | `(uint256, uint256)` |
| `RECORD_MAINTENANCE` | `recordMaintenance(tokenId, description, cost)` | `(uint256, string, uint256)` |
| `RECORD_INCIDENT` | `recordIncident(tokenId, description, estimatedCost, bookingId)` | `(uint256, string, uint256, uint256)` |
| `RESOLVE_INCIDENT` | `resolveIncident(tokenId, incidentId, actualCost)` | `(uint256, uint256, uint256)` |
| `UPDATE_METADATA` | `updateMetadataField(tokenId, field, value)` | `(uint256, string, string)` |

---

### ComplianceReceiver.sol — Regulatory Compliance

**Constructor params:** `forwarderAddress`, `renterCompliance`, `operationalCompliance`

**Triggered by:** Compliance CRE Workflow (`compliance-workflow`)

Routes compliance updates (expired registrations, blacklisting, maintenance flags) from the off-chain CRE workflow to on-chain compliance contracts.

**Report format:** `abi.encode(ReportAction action, bytes actionData)`

| Action | Target | Decoded Args |
| --- | --- | --- |
| `RECORD_INCIDENT` | RenterCompliance | `(address renter, uint256 vehicleId, string incidentType)` |
| `BLACKLIST_RENTER` | RenterCompliance | `(address renter, string reason)` |
| `REMOVE_BLACKLIST` | RenterCompliance | `(address renter)` |
| `RENEW_REGISTRATION` | OperationalCompliance | `(uint256 vehicleId, uint256 newExpiryDate)` |
| `RENEW_INSURANCE` | OperationalCompliance | `(uint256 vehicleId, uint256 newExpiryDate)` |
| `RECORD_MAINTENANCE` | OperationalCompliance | `(uint256 vehicleId, string type, string notes)` |
| `SUSPEND_VEHICLE` | OperationalCompliance | `(uint256 vehicleId, string reason)` |
| `LIFT_SUSPENSION` | OperationalCompliance | `(uint256 vehicleId)` |

---

### CampaignMonitorReceiver.sol — Campaign Failure & Refunds

**Constructor params:** `forwarderAddress`, `paymentProtocol`

**Triggered by:** Campaign Monitor CRE Workflow (`campaign-workflow`)

Receives reports when fundraising campaigns fail (deadline passed + underfunded) or are cancelled, and triggers batch refunds for all investors.

**Report format:** `abi.encode(uint256 vehicleId, string action)`

| Action | Description | Result |
| --- | --- | --- |
| `"CAMPAIGN_FAILED"` | Deadline passed, minimum funding not met | Batch cancel + refund all pending payments |
| `"CAMPAIGN_CANCELLED"` | Rentor manually cancelled | Batch cancel + refund all pending payments |

Calls `RegShieldPaymentProtocol.batchCancelVehiclePayments(vehicleId)`. Must be registered as an authorized operator on the protocol.

---

## Deployed Addresses (Sepolia)

| Contract | Address |
| --- | --- |
| Onboarding Receiver | `0xf080a8b7ee2e83c9bee26a795e43d70b1d093850` |
| Payment Receiver | `0x2f7f8ed26b72a43988afa1f3088bd4969f39b7c2` |
| Vehicle Receiver | `0x73c58b5ba299faaa64103e453ba55b408c91e81b` |
| Compliance Receiver | `0x0ea9cd084287107bca0f9785b030c22db72301fd` |
| Campaign Monitor Receiver | `0x84a9b21b7d2ba6120923edaa32b283fd2e35fb94` |

## Interfaces

- [ReceiverTemplate.sol](../interfaces/cre/ReceiverTemplate.sol)
- [IReceiver.sol](../interfaces/cre/IReceiver.sol)
