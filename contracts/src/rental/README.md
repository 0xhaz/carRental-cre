# Rental Management System

Manages the full rental lifecycle from booking request through vehicle handover, active rental, return processing, damage assessment, and dispute resolution.

## Contracts

### RentalBooking.sol — Booking Lifecycle Manager

**Inheritance:** `IRentalBooking`, `Ownable`, `ReentrancyGuard`

**Constructor params:** `vehicleNFT`, `renterCompliance`, `rentalPaymentProtocol`

**Constants:**

| Name | Value |
| --- | --- |
| MAX_EXTENSIONS | 5 per booking |
| MIN_BOOKING_DURATION | 1 hour |
| MAX_BOOKING_DURATION | 90 days |

**Booking Status Lifecycle:**

```
REQUESTED → PENDING_APPROVAL → APPROVED → ACTIVE → PENDING_RETURN → COMPLETED
                                  ↓           ↓                          ↓
                              CANCELLED    CANCELLED                 DISPUTED
```

| Status | Description |
| --- | --- |
| REQUESTED | Initial request submitted by renter |
| PENDING_APPROVAL | Awaiting rentor/CRE approval |
| APPROVED | Approved, ready for vehicle pickup |
| ACTIVE | Vehicle in renter's possession |
| PENDING_RETURN | Return initiated, awaiting inspection |
| COMPLETED | Rental finalized, deposit settled |
| CANCELLED | Cancelled by renter, rentor, or system |
| DISPUTED | Renter disputes charges after completion |

**Booking Flow:**

1. `requestBooking(vehicleId, startTime, endTime, ratePerDay, securityDeposit)` — validates vehicle availability, time range, and renter compliance. State: `REQUESTED → PENDING_APPROVAL`
2. `approveBooking(bookingId)` — approver re-validates compliance. State: `APPROVED`
3. `startRental(bookingId, preCondition)` — called by RentalOperations. Marks vehicle `Rented`, sets current booking on VehicleNFT. State: `ACTIVE`
4. `extendRental(bookingId, additionalDays)` — renter pays extension fee. Up to 5 extensions allowed
5. `initiateReturn(bookingId)` — starts return process, calculates overdue minutes. State: `PENDING_RETURN`
6. `completeReturn(bookingId, postCondition, damageCharges)` — called by RentalOperations. Returns deposit minus damages, marks vehicle `Available`. State: `COMPLETED`

**Cancellation Refund Policy:**

| Timing | Refund |
| --- | --- |
| > 48 hours before start | 100% |
| 24-48 hours before start | 50% |
| < 24 hours before start | 0% |

**Dispute Flow:** Renter calls `disputeCharges(bookingId, amount, reason)` after completion → `DISPUTED`. Approver calls `resolveDispute(bookingId, finalCharges)` — adjusts charges, state returns to `COMPLETED`.

**Condition Reports:** `ConditionReport { timestamp, mileage, fuelLevel (0-100), photoHashes[], damageNotes[], inspector, signature }` — captured at both pre-rental and post-rental.

**Key Query Functions:** `calculateBookingCost`, `isVehicleAvailable`, `isBookingOverdue`

---

### RentalOperations.sol — On-Ground Operations

**Inheritance:** `IRentalOperations`, `Ownable`

**Constructor params:** `rentalBooking`, `vehicleNFT`

Handles the physical aspects of rentals: condition inspections, vehicle handover/return, damage assessment, overdue calculations, and revenue recording.

**Vehicle Handover Flow:**

1. `createPreRentalReport(bookingId, vehicleId, mileage, fuelLevel, photoHashes, damageNotes)` — stores baseline condition and mileage
2. `performHandover(bookingId, preReport)` — calls `rentalBooking.startRental()`

**Vehicle Return Flow:**

1. `createPostRentalReport(bookingId, vehicleId, mileage, fuelLevel, photoHashes, damageNotes)` — validates mileage hasn't decreased, updates VehicleNFT mileage
2. `processReturn(bookingId, postReport)` — calls `rentalBooking.initiateReturn()`
3. `assessDamage(bookingId, damages[], costs[], evidenceHashes[])` — creates DamageAssessment, records incident on VehicleNFT if cost > 0
4. `approveDamageAssessment(bookingId, assessmentId, finalCost)` — approves assessment, calls `rentalBooking.completeReturn()` with final charges

**Overdue Charges:** `calculateOverdueCharges(bookingId)` — `overdueHours * overdueRatePerHour`, capped at `rentalCost * maxOverduePercentage / 10000` (default: 50% cap).

**Revenue Tracking:** `recordRevenue(vehicleId, bookingId, rentalRevenue, damageRevenue, overdueCharges)` — appends `RevenueRecord` per vehicle for audit trail.

**Key Query Functions:** `getDamageAssessment`, `getBookingAssessments`, `getVehicleRevenue`, `getMileageDriven`

## Interfaces

- [IRentalBooking.sol](../interfaces/rental/IRentalBooking.sol)
- [IRentalOperations.sol](../interfaces/rental/IRentalOperations.sol)
