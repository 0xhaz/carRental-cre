# Vehicle Registry System

Represents physical vehicles as on-chain ERC-721 NFTs with rich metadata, maintenance history, incident tracking, and links to the ERC-3643 security tokens.

## Contract

### VehicleNFT.sol — Vehicle NFT (ERC-721)

**Inheritance:** `ERC721`, `Ownable`, `IVehicleNFT`

**Token:** `"RegShield Vehicle"` (symbol: `RSVEH`). Token IDs start at 1.

Each physical vehicle registered on the platform gets a VehicleNFT that stores its real-world attributes and serves as the anchor for the entire tokenization system.

**Vehicle Status Enum:** `Available`, `Rented`, `Maintenance`, `Retired`

**Vehicle Metadata (stored per token):**

| Field | Type | Description |
| --- | --- | --- |
| `vin` | string | Vehicle Identification Number (unique, immutable after mint) |
| `make` | string | Manufacturer (e.g., "Toyota") |
| `model` | string | Model name (e.g., "Camry") |
| `year` | uint256 | Model year |
| `color` | string | Vehicle color |
| `mileage` | uint256 | Current odometer reading (monotonically increasing) |
| `registrationExpiry` | uint256 | Registration expiry timestamp |
| `insuranceExpiry` | uint256 | Insurance expiry timestamp |

**Linked Tokens:** Each VehicleNFT can be linked to an AssetToken (ownership) and RevenueToken (income rights) via `linkTokens()` — a one-time operation.

**Access Control:**

| Modifier | Who | Used For |
| --- | --- | --- |
| `onlyOperator` | Owner or addresses in `operators` mapping | Mint, metadata updates, maintenance/incident recording, mileage |
| `onlyRentalContract` | Owner or `rentalBookingContract` | Status updates, setting current booking |

**Key Functions:**

| Function | Access | Description |
| --- | --- | --- |
| `mintVehicle(to, metadata, assetToken, revenueToken)` | operator | Mints NFT with VIN uniqueness check. Status set to Available |
| `updateStatus(tokenId, newStatus)` | rentalContract | Changes vehicle status (Available/Rented/Maintenance/Retired) |
| `linkTokens(tokenId, assetToken, revenueToken)` | operator | One-time token linking (reverts if already linked) |
| `updateMileage(tokenId, newMileage)` | operator | Monotonically increasing only — cannot decrease |
| `recordMaintenance(tokenId, description, cost)` | operator | Appends MaintenanceRecord, returns `maintenanceId` |
| `recordIncident(tokenId, description, estimatedCost, bookingId)` | operator | Appends IncidentRecord, returns `incidentId` |
| `resolveIncident(tokenId, incidentId, actualCost)` | operator | Marks incident resolved, updates final cost |
| `setCurrentBooking(tokenId, bookingId)` | rentalContract | Links/clears active booking (0 = no booking) |
| `updateMetadataField(tokenId, field, value)` | operator | Updates color, make, or model by field name (VIN is immutable) |

**Query Functions:** `getVehicleInfo`, `getVehicleMetadata`, `getMaintenanceHistory`, `getIncidentHistory`, `isVINRegistered`, `getTokenIdByVIN`

**Maintenance History:** Array of `MaintenanceRecord { timestamp, description, cost, performer }` per vehicle.

**Incident History:** Array of `IncidentRecord { timestamp, description, estimatedCost, bookingId, reporter, resolved }` per vehicle.

**Events:** `VehicleMinted`, `VehicleStatusUpdated`, `TokensLinked`, `MileageUpdated`, `MaintenanceRecorded`, `IncidentRecorded`, `IncidentResolved`, `BookingUpdated`, `MetadataUpdated`

**Interactions:**

- Called by `RentalBooking` — status changes, booking assignment
- Called by `RentalOperations` — mileage updates, incident recording
- Called by `VehicleReceiver` (CRE) — mileage, maintenance, incidents, metadata updates from off-chain telematics

## Interfaces

- [IVehicleNFT.sol](../interfaces/vehicle/IVehicleNFT.sol)
