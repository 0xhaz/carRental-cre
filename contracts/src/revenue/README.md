# Revenue Distribution System

Distributes rental revenue to RevenueToken holders using a transparent waterfall model and a gas-efficient dividend-per-share accumulator pattern (no holder iteration required).

## Contract

### RevenueDistributor.sol — Revenue Waterfall

**Inheritance:** `IRevenueDistributor`, `Ownable`, `ReentrancyGuard`

**Revenue Waterfall (per rental payment):**

```
Gross Revenue
├── 15%  → Platform Fee         → Protocol treasury (withdrawPlatformFees)
├── 10%  → Maintenance Reserve  → Per-vehicle escrow (withdrawMaintenanceReserve, owner-only)
├──  5%  → Insurance            → Vehicle operator / rentor (withdrawOperatorFees)
├── 10%  → Operating Costs      → Vehicle operator / rentor (withdrawOperatorFees)
├── 10%  → Operator Fee         → Vehicle operator / rentor (withdrawOperatorFees)
└── 50%  → Net Distributable    → RevenueToken holders (pull-based claim)
```

**Operator Total:** Insurance (5%) + Operating Costs (10%) + Operator Fee (10%) = **25%** withdrawable by the rentor via `withdrawOperatorFees()`.

**Stored as basis points:** `platformFeePercent = 1500`, `maintenancePercent = 1000`, `insurancePercent = 500`, `operatingPercent = 1000`, `operatorPercent = 1000`

**Distribution Algorithm — Dividend-Per-Share Accumulator:**

No iteration over token holders is needed. Each `distributeRevenue()` call increases a cumulative accumulator:

```
_revenuePerTokenAccumulated[vehicleId] += (netDistributable * PRECISION) / totalSupply
```

Holders claim their proportional share lazily at any time via `claimRevenue()`:

```
claimable = holderBalance * (currentAccumulator - holderCheckpoint) / PRECISION
```

On claim, the holder's checkpoint advances to the current accumulator. `PRECISION = 1e18`.

**Revenue Flow:**

1. `addRevenue(vehicleId, amount)` — called by RentalPaymentProtocol after rental completion. Accumulates gross revenue
2. `distributeRevenue(vehicleId)` — anyone can call. Applies waterfall, updates accumulator, records distribution
3. `claimRevenue(vehicleId)` — holder pulls their share. ETH sent directly to holder
4. `batchDistribute(vehicleIds[])` / `batchClaimRevenue(vehicleIds[])` — batch operations

**Vehicle Registration:**

- `registerVehicle(vehicleId, revenueToken)` — links a vehicle to its RevenueToken for distribution
- `setVehicleOperator(vehicleId, operator)` — sets the rentor address for operator fee withdrawal

**Fee Withdrawal:**

| Function | Access | Description |
| --- | --- | --- |
| `withdrawPlatformFees(recipient)` | owner | Withdraws accumulated 15% protocol treasury |
| `withdrawMaintenanceReserve(vehicleId, recipient, amount)` | owner | Withdraws per-vehicle 10% maintenance reserve |
| `withdrawOperatorFees(vehicleId)` | vehicle operator or owner | Withdraws 25% operator share (insurance + operating + operator) |

**Fee Configuration:** `updateFeePercentages(platform, maintenance, insurance, operating, operator)` — owner can adjust. Total must be < 10000 bps.

**Key Events:** `VehicleRegistered`, `RevenueReceived`, `WaterfallApplied`, `RevenueDistributed`, `RevenueClaimed`, `FeesWithdrawn`

## Interfaces

- [IRevenueDistributor.sol](../interfaces/revenue/IRevenueDistributor.sol)
