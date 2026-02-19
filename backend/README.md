# RegShield Backend API

Express.js 5 REST API server for the RegShield platform. Handles authentication, vehicle management, bookings, investment campaigns, KYC verification, and syncs with on-chain smart contracts on Ethereum Sepolia.

---

## Tech Stack

| Category | Technology |
| --- | --- |
| Runtime | Node.js (ES Modules) |
| Framework | Express.js v5 |
| Database | MongoDB (Mongoose v9) |
| Auth | JWT + Ethereum Wallet Signatures |
| Blockchain | Ethers.js v6 (Sepolia) |
| File Upload | Multer v2 + ImageKit CDN |
| Scheduling | node-cron v4 |

---

## Quick Start

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- ImageKit account (for image uploads)

### Installation

```bash
cd backend
npm install
```

### Environment Variables

Create a `.env` file in the backend directory:

```bash
# Server
PORT=3002

# MongoDB
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net

# Auth
JWT_SECRET=your_jwt_secret

# ImageKit CDN
IMAGEKIT_PUBLIC_KEY=your_public_key
IMAGEKIT_PRIVATE_KEY=your_private_key
IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/your_id

# Blockchain (Sepolia)
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
SCHEDULER_PRIVATE_KEY=your_wallet_private_key
INVESTMENT_PAYMENT_PROTOCOL=0x8c61ce72d5cf64f2d14dfee554a493668b87a082
```

### Run

```bash
# Development (with hot reload)
npm run server

# Production
npm start

# Seed test data
npm run seed

# Create admin account
npm run create-admin
```

The server starts on `http://localhost:3002`.

---

## Project Structure

```
backend/
├── server.js                  # Entry point — mounts routes, starts scheduler
├── configs/
│   ├── db.js                  # MongoDB connection (database: car-rental)
│   └── imageKit.js            # ImageKit CDN client
├── middleware/
│   ├── auth.js                # JWT protect + admin role guard
│   └── multer.js              # File upload middleware
├── models/
│   ├── User.js                # User accounts (renter, rentor, investor, admin)
│   ├── Car.js                 # Vehicle listings with NFT/token links
│   ├── Booking.js             # Rental bookings with on-chain tx tracking
│   ├── Campaign.js            # Investment fundraising campaigns
│   ├── Investment.js          # Individual investment records
│   ├── RenterProfile.js       # Renter details (license, insurance)
│   ├── Review.js              # Vehicle reviews and ratings
│   ├── kycModel.js            # KYC verification records
│   └── Notification.js        # User notifications (30+ types)
├── controllers/               # Route handlers (one per domain)
├── routes/                    # Express routers (one per domain)
├── services/
│   └── campaignScheduler.js   # Hourly cron: expires campaigns, triggers refunds
├── utils/
│   └── verifySignature.js     # Viem-based wallet signature verifier
├── scripts/                   # Seed data, admin creation, migrations
└── uploads/                   # Local file storage (kyc/, licenses/, milestones/)
```

---

## Authentication

The API supports two authentication methods:

### 1. Email/Password (JWT)

```
POST /api/user/register  →  { name, email, password }
POST /api/user/login     →  { email, password }
→ Returns JWT token
```

### 2. Wallet Signature (Ethereum)

```
POST /api/user/wallet/nonce   →  { walletAddress }  →  Returns nonce (5-min TTL)
POST /api/user/wallet/verify  →  { walletAddress, signature }  →  Returns JWT token
POST /api/user/wallet/bind    →  { walletAddress, signature }  →  Links wallet to account
```

All protected routes require the JWT in the `Authorization` header.

---

## User Roles

| Role | Description |
| --- | --- |
| `renter` | Books vehicles, manages rental profile |
| `rentor` | Lists vehicles, manages campaigns and bookings |
| `investor` | Invests in vehicle campaigns, claims revenue |
| `admin` | Manages KYC, milestones, platform operations |

---

## API Reference

### User Routes (`/api/user`)

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| POST | `/register` | Public | Register with email/password |
| POST | `/login` | Public | Login with email/password |
| GET | `/data` | JWT | Get current user profile |
| GET | `/cars` | Public | List all available vehicles |
| GET | `/cars/:id` | Public | Get vehicle details |
| POST | `/update-role` | JWT | Switch role (renter/rentor/investor) |
| POST | `/wallet/nonce` | Public | Request wallet auth nonce |
| POST | `/wallet/verify` | Public | Verify wallet signature |
| POST | `/wallet/bind` | JWT | Bind wallet to existing account |

### Rentor Routes (`/api/rentor`)

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| POST | `/add-car` | JWT | Add a vehicle listing |
| POST | `/update-car/:carId` | JWT | Update vehicle details |
| GET | `/cars` | JWT | Get rentor's vehicles |
| GET | `/vehicle/:vehicleId` | JWT | Get a single vehicle |
| POST | `/toggle-car` | JWT | Toggle vehicle availability |
| POST | `/delete-car` | JWT | Delete a vehicle |
| POST | `/vehicle/:vehicleId/set-nft-id` | JWT | Set on-chain NFT ID |
| POST | `/vehicle/:vehicleId/set-tokens` | JWT | Set asset/revenue token addresses |
| GET | `/vehicles-pending-registration` | JWT | Get vehicles awaiting token registration |
| POST | `/vehicle/:vehicleId/complete-registration` | JWT | Mark registration complete |
| GET | `/dashboard` | JWT | Dashboard summary |
| POST | `/update-image` | JWT | Upload profile image |
| POST | `/vehicle/:vehicleId/milestone-documents` | JWT | Upload milestone proof (10MB, JPEG/PNG/PDF) |
| GET | `/vehicle/:vehicleId/milestone-documents` | JWT | Get milestone documents |
| GET | `/vehicle-by-nft/:nftId` | JWT | Look up vehicle by NFT ID |

### Renter Routes (`/api/renter`)

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| POST | `/profile` | JWT | Create/update renter profile (license upload) |
| GET | `/profile` | JWT | Get renter profile |
| POST | `/booking` | JWT | Submit booking request |
| GET | `/bookings` | JWT | Get renter's bookings |
| GET | `/booking/:id` | JWT | Get booking details |
| PUT | `/booking/:id/cancel` | JWT | Cancel a booking |

### Booking Routes (`/api/bookings`)

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| POST | `/check-availability` | Public | Check vehicle availability for dates |
| POST | `/create` | JWT | Create a booking |
| GET | `/user` | JWT | Get user's bookings |
| GET | `/rentor` | JWT | Get rentor's bookings |
| GET | `/:id` | JWT | Get booking by ID |
| POST | `/change-status` | JWT | Update booking status |
| PATCH | `/:id/onchain` | JWT | Sync on-chain booking state / tx hashes |

### Investment Routes (`/api/investments`)

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/marketplace` | Public | Browse active campaigns |
| POST | `/create-campaign` | JWT | Create fundraising campaign |
| POST | `/create` | JWT | Make an investment |
| GET | `/portfolio` | JWT | Get investor's portfolio |
| GET | `/rentor-campaigns` | JWT | Get rentor's campaigns |
| GET | `/vehicle/:vehicleId` | Public | Get vehicle investment details |
| GET | `/campaign/:campaignId` | Public | Get campaign details |
| PUT | `/campaign/:campaignId` | JWT | Update campaign |
| POST | `/campaign/:campaignId/pause` | JWT | Pause campaign |
| POST | `/campaign/:campaignId/co-invest` | JWT | Record rentor co-investment |
| DELETE | `/campaign/:campaignId` | JWT | Cancel campaign |
| POST | `/vehicle/:vehicleNftId/milestone-completed` | JWT | Sync milestone completion |
| POST | `/vehicle/:vehicleNftId/funds-released` | JWT | Sync funds release |
| POST | `/vehicle/:vehicleNftId/revenue-distributed` | JWT | Sync revenue distribution |
| POST | `/vehicle/:vehicleNftId/revenue-claimed` | JWT | Sync revenue claim |
| POST | `/record-transfer` | JWT | Record token transfer |
| POST | `/record-dispute-resolution` | JWT | Record dispute resolution |
| GET | `/:investmentId` | JWT | Get investment details |

### KYC Routes (`/api/kyc`)

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| POST | `/submit` | JWT | Submit KYC documents (10MB, JPEG/PNG/PDF) |
| GET | `/status` | JWT | Get user's KYC status |
| POST | `/request-upgrade` | JWT | Request investor tier upgrade |
| GET | `/investors` | Admin | List all investor users |
| GET | `/pending` | Admin | Get pending KYC submissions |
| GET | `/:id` | Admin | Get KYC record |
| POST | `/:id/approve` | Admin | Approve KYC |
| POST | `/:id/reject` | Admin | Reject KYC |
| POST | `/:id/approve-upgrade` | Admin | Approve tier upgrade |
| POST | `/:id/reject-upgrade` | Admin | Reject tier upgrade |
| POST | `/:id/notify-upgrade-wallet` | Admin | Notify wallet creation |
| POST | `/:id/downgrade` | Admin | Downgrade investor |
| POST | `/:id/blockchain` | Admin | Update blockchain registration status |

### Review Routes (`/api/reviews`)

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| POST | `/create` | JWT | Create a review (1 per booking) |
| GET | `/vehicle/:vehicleId` | Public | Get vehicle reviews |
| GET | `/user` | JWT | Get user's reviews |
| POST | `/respond/:reviewId` | JWT | Rentor responds to review |
| GET | `/can-review/:bookingId` | JWT | Check if review is allowed |

### Notification Routes (`/api/notifications`)

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/` | JWT | Get user's notifications |
| POST | `/mark-read/:notificationId` | JWT | Mark as read |
| POST | `/mark-all-read` | JWT | Mark all as read |
| DELETE | `/:notificationId` | JWT | Delete notification |

---

## Background Services

### Campaign Scheduler

Runs every hour (and once on startup) via `node-cron`:

1. Finds active campaigns past their deadline
2. If underfunded (below `minFundingRequired` threshold): cancels campaign, refunds all investors, resets vehicle fundraising, notifies rentor
3. If funded: marks campaign as `funded`, notifies rentor
4. Optionally triggers `batchCancelVehiclePayments()` on-chain via `RegShieldPaymentProtocol`

---

## On-Chain Sync Endpoints

The backend maintains a Web2 mirror of on-chain state. These endpoints are called by the frontend after successful blockchain transactions:

| Endpoint | On-Chain Event |
| --- | --- |
| `POST /investments/vehicle/:nftId/milestone-completed` | `PaymentReceiver` milestone report |
| `POST /investments/vehicle/:nftId/funds-released` | Escrow release after all milestones |
| `POST /investments/vehicle/:nftId/revenue-distributed` | `RevenueDistributor.distributeRevenue()` |
| `POST /investments/vehicle/:nftId/revenue-claimed` | `RevenueDistributor.claimRevenue()` |
| `PATCH /bookings/:id/onchain` | Rental booking on-chain state changes |
| `POST /rentor/vehicle/:id/set-nft-id` | `VehicleNFT.mint()` |
| `POST /rentor/vehicle/:id/set-tokens` | `TokenFactory` deployment |

---

## Data Models

### User
Email/password or wallet-based accounts with role system, compliance flags, and optional `onchainIdAddress` link.

### Car (Vehicle)
Vehicle listings with VIN, NFT token ID, linked asset/revenue token addresses, fundraising state, and revenue tracking.

### Booking
Rental bookings with pricing breakdown, payment tracking (offline/bank/crypto), on-chain tx hashes, pre/post condition reports, and damage assessment.

### Campaign
Fundraising campaigns with target/current amounts, investor type restrictions, duration, milestone tracking, and co-investment support.

### Investment
Individual investment records linking investor → vehicle → campaign with token amounts, revenue tracking, and lock-up periods.

### KYC
Full KYC lifecycle: document submission, personal/investor/renter/business info, compliance checks (sanctions, PEP, AML), blockchain registration status. Expires after 1 year.

### RenterProfile
Renter details: personal info, driver's license (with images), insurance, booking stats. Auto-validates age requirement (21+).

### Review
Vehicle reviews with multi-dimensional ratings (condition, cleanliness, communication), rentor responses. One review per booking.

### Notification
30+ notification types covering bookings, payments, investments, KYC, campaigns, and system events.

---

## Scripts

| Command | Description |
| --- | --- |
| `npm run seed` | Clear all data and seed test users, vehicles, bookings, campaigns |
| `npm run create-admin` | Create admin account (`admin@regshield.com` / `Admin@123456`) |
| `node scripts/migrateData.js` | Migrate old schema to new role system |
| `node scripts/checkDatabase.js` | Inspect database state |
| `node scripts/clearTestData.js` | Clear all test data |

---

## File Uploads

| Category | Path | Max Size | Formats |
| --- | --- | --- | --- |
| KYC Documents | `/uploads/kyc/` | 10MB | JPEG, PNG, PDF |
| Driver's License | `/uploads/licenses/` | 10MB | JPEG, PNG, PDF |
| Milestone Proofs | `/uploads/milestones/` | 10MB | JPEG, PNG, PDF |

Profile images are uploaded to ImageKit CDN.
