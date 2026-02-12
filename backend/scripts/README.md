# Database Scripts

This directory contains scripts for database migrations and seeding test data.

## Scripts

### 1. `migrateData.js`
Migrates existing data to the new schema.

**What it does:**
- Updates user roles: `owner` → `rentor`, `user` → `renter`
- Adds new fields to User model (compliance, preferences, blockchain fields)
- Adds new fields to Car model (fundraising, revenue, status, blockchain fields)
- Adds new fields to Booking model (deposits, condition reports, blockchain fields)

**Run:**
```bash
node backend/scripts/migrateData.js
```

**When to run:**
- After updating the MongoDB models
- Before testing the new features
- Only run ONCE per database

---

### 2. `seedTestData.js`
Seeds the database with test data for development/testing.

**What it creates:**
- 3 test users (investor, rentor, renter)
- 2 test vehicles (1 with active fundraising, 1 without)
- 1 test investment
- 1 test fundraising campaign

**Test credentials:**
```
Investor: investor@test.com / password123
Rentor:   rentor@test.com / password123
Renter:   renter@test.com / password123
```

**Run:**
```bash
node backend/scripts/seedTestData.js
```

**When to run:**
- After running migration
- When you need fresh test data
- Can be run multiple times (will create duplicates)

---

## Usage Example

```bash
# Step 1: Run migration (update existing data)
node backend/scripts/migrateData.js

# Step 2: Seed test data (create sample data)
node backend/scripts/seedTestData.js

# Step 3: Start your backend server
npm start
```

---

## Environment Variables

Make sure your `.env` file has:
```
MONGODB_URI=mongodb://localhost:27017/regshield
```

---

## Notes

- Both scripts will exit after completion
- Check console output for detailed results
- Scripts use the same models as your application
- Safe to run in development; **use caution in production**
