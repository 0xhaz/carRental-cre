## Payment Contracts

## Contracts

- [RegShieldPaymentProtocol.sol](./RegShieldPaymentProtocol.sol) - Investment payments

  - Capital raising for vehicle purchases
  - Milestone-based fund releases
  - Investment tracking (integrated with InvestorRequestManager)
  - Escrow management

- [RentalPaymentProtocol.sol](./RentalPaymentProtocol.sol) - Rental payments

  - Booking and deposits
  - Security deposit management
  - Rental fee processing
  - Revenue distribution to RevenueToken holders

- [PaymentEscrow.sol](./PaymentEscrow.sol) - Escrow system

  - Holds funds securely
  - Release/refund mechanisms
  - Used by both payment protocols

- [RefundManager.sol](./RefundManager.sol) - Refund handling
  - 4 refund types: Automatic, Manual, Dispute, Emergency
  - Integrated with dispute resolution
