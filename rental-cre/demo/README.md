# RegShield CRE Demo Scripts

Role-based demo scripts for walking through CRE workflow simulations.

## Prerequisites

- `cre` CLI installed (`cre version` to verify)
- `cast` (Foundry) for setup verification
- Run from any directory (scripts auto-detect project root)

## Verify Setup

Before running demos, verify receiver contracts are ready:
```bash
./verify-setup.sh
```
This checks that all 5 receiver contracts on Sepolia have the correct MockKeystoneForwarder address and metadata checks are disabled.

## Demo Scripts (by Role)

### Rentor (Vehicle Owner)
```bash
./demo-rentor.sh              # Simulation mode
./demo-rentor.sh --broadcast  # Broadcast to Sepolia
```
Demonstrates:
1. **Campaign Monitor** — Detects expired/underfunded campaigns, triggers batch refunds
2. **Vehicle Telematics** — Fetches mileage data, updates VehicleNFT on-chain

### Investor
```bash
./demo-investor.sh              # Simulation mode
./demo-investor.sh --broadcast  # Broadcast to Sepolia
```
Demonstrates:
1. **Investor Onboarding** — Auto-verifies identity (ERC-3643 + WorldID), approves/rejects
2. **Investment Lifecycle** — 4-milestone verification (VIN, escrow, insurance, registration) before fund release

### Renter (Car Borrower)
```bash
./demo-renter.sh              # Simulation mode
./demo-renter.sh --broadcast  # Broadcast to Sepolia
```
Demonstrates:
1. **Booking Approval** — Checks renter compliance/blacklist, auto-approves bookings
2. **Compliance Monitoring** — Detects expired registration/insurance, overdue maintenance

### Admin (Full Platform)
```bash
./demo-admin.sh              # Simulation mode
./demo-admin.sh --broadcast  # Broadcast to Sepolia
```
Runs all 5 workflows sequentially with logs saved to `output/`.

## Role → Workflow → Backend Mapping

| Role | Demo Script | CRE Workflows | Replaces |
|------|------------|---------------|----------|
| Rentor | demo-rentor.sh | campaign + vehicle | campaignScheduler.js, revenueSyncService.js |
| Investor | demo-investor.sh | onboarding + rental | Manual admin approval, bookingScheduler.js |
| Renter | demo-renter.sh | onboarding + compliance | Manual approval, (new capability) |
| Admin | demo-admin.sh | All 5 workflows | All backend schedulers |

## Simulation vs Broadcast

| Mode | Command | What happens |
|------|---------|-------------|
| Simulation | `./demo-rentor.sh` | Dry run with mock data, no gas needed |
| Broadcast | `./demo-rentor.sh --broadcast` | Real transactions on Sepolia testnet |

## Receiver Contracts (Sepolia)

| Contract | Address |
|----------|---------|
| OnboardingReceiver | 0xF080a8B7Ee2e83c9beE26a795e43D70b1D093850 |
| CampaignMonitorReceiver | 0x84A9B21B7d2Ba6120923edAA32B283fD2E35FB94 |
| ComplianceReceiver | 0x0eA9cd084287107BCA0f9785B030c22Db72301fD |
| VehicleReceiver | 0x73c58B5Ba299FaAA64103E453ba55b408C91e81B |
| PaymentReceiver | 0x2f7F8ED26B72A43988AfA1f3088Bd4969f39B7C2 |

MockKeystoneForwarder: `0x15fC6ae953E024d975e77382eEeC56A9101f9F88`
