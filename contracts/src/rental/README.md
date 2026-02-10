## Rental Management System

## Contracts

- [RentalBooking.sol](./RentalBooking.sol)

  - 8-state lifecycle (REQUESTED → COMPLETED/DISPUTED)
  - Compliance integration (renter verification)
  - Payment escrow coordination
  - Pre/post condition reports
  - Extension and cancellation support
  - Dispute resolution
  - Refund policies (48hr/24hr cancellation windows)

- [RentalOperations.sol](./RentalOperations.sol)
  - Condition report creation (pre/post rental)
  - Vehicle handover and return processing
  - Damage assessment and cost calculation
  - Overdue charge calculations
  - Revenue tracking for distribution
  - Integration with VehicleNFT for mileage updates
