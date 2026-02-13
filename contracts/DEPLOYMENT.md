# RegShield Contract Deployment Guide

## Issue Summary

Deploying all 28 contracts in a single transaction is hitting RPC provider limitations:
- ✅ **Simulation works perfectly** - all contracts validate correctly
- ❌ **Broadcast fails** - due to rate limits, nonce tracking issues, and transaction replacement errors

This is common with free-tier RPC endpoints (Alchemy, Infura) when deploying large contract systems.

## Solution: Phased Deployment

Deploy contracts in 7 phases to work around RPC limitations.

## Prerequisites

1. **Create `.env` file** from `.env.example`:
   ```bash
   cp .env.example .env
   ```

2. **Fill in required values**:
   ```bash
   PRIVATE_KEY=your_private_key_here          # Without 0x prefix
   OWNER=0xYourOwnerAddressHere               # Your wallet address
   SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
   ETHERSCAN_API_KEY=your_etherscan_api_key  # Optional, for verification
   ```

3. **Ensure you have Sepolia ETH** (~0.8 ETH total for all deployments)

## Deployment Commands

### Option 1: Deploy All Phases Sequentially (Recommended)
```bash
./deploy-phased.sh all
```

This will:
- Deploy all 7 phases in order
- Wait 30 seconds between phases (avoid rate limits)
- Stop if any phase fails
- Total time: ~15-20 minutes

### Option 2: Deploy Individual Phases

Deploy phases one at a time (useful if a phase fails):

```bash
# Phase 1: OnchainID Infrastructure (3 contracts)
./deploy-phased.sh 1

# After successful deployment, add addresses to .env:
# ONCHAINID_FACTORY=0x...
# CLAIM_ISSUER=0x...
# KEY_MANAGER=0x...

# Phase 2: Registries (4 contracts)
./deploy-phased.sh 2

# Add to .env:
# TRUSTED_ISSUERS_REGISTRY=0x...
# CLAIM_TOPICS_REGISTRY=0x...
# INVESTOR_TYPE_REGISTRY=0x...
# PARTICIPANT_TYPE_REGISTRY=0x...

# Phase 3: Compliance Modules (6 contracts)
./deploy-phased.sh 3

# Add to .env:
# COMPLIANCE_RULES=0x...
# INVESTOR_TYPE_COMPLIANCE=0x...
# RENTER_COMPLIANCE=0x...
# OPERATIONAL_COMPLIANCE=0x...
# TRANSFER_RESTRICTIONS=0x...
# COMPLIANCE_REGISTRY=0x...

# Phase 4: Identity Registry (1 contract)
./deploy-phased.sh 4

# Add to .env:
# IDENTITY_REGISTRY=0x...

# Phase 5: Vehicle & Rental System (3 contracts)
./deploy-phased.sh 5

# Add to .env:
# VEHICLE_NFT=0x...
# RENTAL_BOOKING=0x...
# RENTAL_OPERATIONS=0x...

# Phase 6: Payment System — Native ETH (7 contracts)
./deploy-phased.sh 6

# Add to .env:
# INVESTMENT_PAYMENT_PROTOCOL=0x...
# INVESTMENT_ESCROW=0x...
# INVESTMENT_REFUND_MANAGER=0x...
# RENTAL_PAYMENT_PROTOCOL=0x...
# RENTAL_ESCROW=0x...
# RENTAL_REFUND_MANAGER=0x...
# DISPUTE_RESOLVER=0x...

# Phase 7: Revenue & Investor Management (3 contracts)
./deploy-phased.sh 7

# Add to .env:
# REVENUE_DISTRIBUTOR=0x...
# INVESTOR_REQUEST_MANAGER=0x...
# MULTISIG_WALLET=0x...
```

## After Deployment

### 1. Extract Contract Addresses
```bash
./extract-addresses.sh
```

This creates `deployed-addresses.env` with all contract addresses.

### 2. Copy to Frontend
```bash
cp deployed-addresses.env ../../frontend/.env.contracts
```

### 3. Copy ABIs
```bash
# Copy contract ABIs to frontend
cp -r out/ ../../frontend/src/contracts/abis/
```

### 4. Verify Contracts on Etherscan

If auto-verification fails, manually verify:

```bash
forge verify-contract \
  <CONTRACT_ADDRESS> \
  src/<PATH>/<CONTRACT>.sol:<CONTRACT> \
  --chain sepolia \
  --etherscan-api-key $ETHERSCAN_API_KEY
```

Example:
```bash
forge verify-contract \
  0x1234... \
  src/vehicle/VehicleNFT.sol:VehicleNFT \
  --chain sepolia \
  --etherscan-api-key $ETHERSCAN_API_KEY
```

## Troubleshooting

### Error: "nonce too low" or "nonce mismatch"
**Cause:** Previous deployment attempt left some transactions on-chain

**Fix:**
```bash
# Clear broadcast cache
rm -rf broadcast/*/11155111/*.json
rm -rf cache/

# Try deployment again
```

### Error: "HTTP 429" or "rate limit exceeded"
**Cause:** RPC provider rate limiting

**Fix:**
1. Wait 1-2 minutes
2. Use phased deployment instead of all-at-once
3. Consider upgrading to paid RPC tier

### Error: "replacement transaction underpriced"
**Cause:** Trying to replace a pending transaction with insufficient gas

**Fix:**
```bash
# Wait for pending transactions to complete
sleep 60

# Clear broadcast cache and retry
rm -rf broadcast/*/11155111/*.json
./deploy-phased.sh <phase_number>
```

### Some contracts deployed but script failed mid-way
**Cause:** Partial deployment due to RPC errors

**Fix:**
1. Check which contracts actually deployed:
   ```bash
   ./extract-addresses.sh
   ```

2. Add deployed addresses to `.env`

3. Continue with next phase that hasn't been deployed yet

## Deployment Order (Dependencies)

Each phase depends on previous phases being deployed and their addresses added to `.env`:

```
Phase 1: OnchainID Infrastructure
  ↓
Phase 2: Registries
  ↓ (needs INVESTOR_TYPE_REGISTRY)
Phase 3: Compliance Modules
  ↓ (needs INVESTOR_TYPE_REGISTRY, IDENTITY_REGISTRY)
Phase 4: Identity Registry
  ↓ (needs all registries + compliance)
Phase 5: Vehicle & Rental
  ↓ (needs IDENTITY_REGISTRY, PARTICIPANT_TYPE_REGISTRY)
Phase 6: Payment System (Native ETH)
  ↓ (needs IDENTITY_REGISTRY, PARTICIPANT_TYPE_REGISTRY, RENTER_COMPLIANCE)
Phase 7: Revenue & Investor
  (needs IDENTITY_REGISTRY, INVESTOR_TYPE_REGISTRY)
```

## Total Deployment Summary

- **Total Contracts:** 32
- **Estimated Gas Cost:** ~0.8 ETH on Sepolia
- **Deployment Time:** 15-20 minutes (phased) or 5-10 minutes (all-at-once, if successful)
- **Chain:** Sepolia Testnet (Chain ID: 11155111)

## Next Steps After Successful Deployment

1. ✅ All contracts deployed and verified on Etherscan
2. ✅ Addresses saved to `deployed-addresses.env`
3. ➡️ **Frontend Integration:**
   - Copy ABIs to frontend
   - Update frontend `.env` with contract addresses
   - Configure wagmi/viem with contract addresses and ABIs
   - Test contract interactions from UI

4. ➡️ **Initial Configuration:**
   - Register trusted issuers
   - Set up compliance rules
   - Configure payment token
   - Add initial vehicle NFTs for testing

5. ➡️ **Testing:**
   - Test vehicle registration
   - Test rental flow
   - Test investment flow
   - Test payment processing
