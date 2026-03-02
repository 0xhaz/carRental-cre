# Database Scripts

Utility scripts for database operations.

## Scripts

### `migrateData.js`
Migrates existing data to the new schema.

- Updates user roles: `owner` → `rentor`, `user` → `renter`
- Adds new fields to User, Car, and Booking models

```bash
node backend/scripts/migrateData.js
```

### `createAdmin.js`
Creates an admin account.

```bash
node backend/scripts/createAdmin.js
```

### `fixWalletIndex.js`
Fixes wallet address indexing issues.

```bash
node backend/scripts/fixWalletIndex.js
```

### `patchInvestorRecords.js`
Patches investor records for data consistency.

```bash
node backend/scripts/patchInvestorRecords.js
```

## Environment Variables

Make sure your `.env` file has:
```
MONGODB_URI=mongodb://localhost:27017/regshield
```
