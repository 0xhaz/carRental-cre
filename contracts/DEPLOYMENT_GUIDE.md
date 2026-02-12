# RegShield Smart Contract Deployment Guide

Complete guide for deploying RegShield smart contracts to testnet or mainnet.

---

## Prerequisites

1. **Foundry installed**:
   ```bash
   curl -L https://foundry.paradigm.xyz | bash
   foundryup
   ```

2. **Environment setup**:
   - Copy `.env.example` to `.env` (already done)
   - Configure your private key and RPC URLs
   - Set OWNER address

3. **Funded wallet**:
   - Ensure deployer wallet has sufficient ETH/testnet ETH for gas
   - Estimate: ~0.5 ETH for complete deployment on testnet

---

## Deployment Options

### Option 1: Deploy All Contracts (Recommended)

Deploy all 28 contracts in one transaction:

```bash
# Dry run (simulate)
forge script script/DeployAll.s.sol --rpc-url $SEPOLIA_RPC_URL

# Deploy to Sepolia testnet
forge script script/DeployAll.s.sol \
  --rpc-url $SEPOLIA_RPC_URL \
  --broadcast \
  --verify \
  --etherscan-api-key $ETHERSCAN_API_KEY

# Deploy to Arbitrum Sepolia
forge script script/DeployAll.s.sol \
  --rpc-url $ARBITRUM_SEPOLIA_RPC_URL \
  --broadcast \
  --verify \
  --etherscan-api-key $ARBISCAN_API_KEY

# Deploy to Base Sepolia
forge script script/DeployAll.s.sol \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --broadcast \
  --verify \
  --etherscan-api-key $ETHERSCAN_API_KEY
```

### Option 2: Deploy Step-by-Step

Deploy contracts in phases:

```bash
# 1. OnchainID Infrastructure
forge script script/01_DeployOnchainID.s.sol \
  --rpc-url $SEPOLIA_RPC_URL \
  --broadcast \
  --verify

# 2. Registries
forge script script/02_DeployRegistries.s.sol \
  --rpc-url $SEPOLIA_RPC_URL \
  --broadcast \
  --verify

# 3. Compliance Modules
forge script script/03_DeployCompliance.s.sol \
  --rpc-url $SEPOLIA_RPC_URL \
  --broadcast \
  --verify

# 4. Identity Registry
forge script script/04_DeployIdentityRegistry.s.sol \
  --rpc-url $SEPOLIA_RPC_URL \
  --broadcast \
  --verify

# 5. Vehicle & Rental
forge script script/05_DeployVehicleAndRental.s.sol \
  --rpc-url $SEPOLIA_RPC_URL \
  --broadcast \
  --verify

# 6. Payment System
forge script script/06_DeployPayment.s.sol \
  --rpc-url $SEPOLIA_RPC_URL \
  --broadcast \
  --verify

# 7. Revenue & Investor
forge script script/07_DeployRevenueAndInvestor.s.sol \
  --rpc-url $SEPOLIA_RPC_URL \
  --broadcast \
  --verify
```

---

## Post-Deployment Steps

### 1. Save Deployment Addresses

After deployment, save all contract addresses to a JSON file:

```bash
# The deployment script outputs all addresses
# Copy them to deployments/<network>.json

# Example structure:
{
  "network": "sepolia",
  "chainId": 11155111,
  "deployedAt": "2026-02-12T10:00:00Z",
  "contracts": {
    "onchainIDFactory": "0x...",
    "claimIssuer": "0x...",
    "vehicleNFT": "0x...",
    // ... all other addresses
  }
}
```

### 2. Verify Contracts on Etherscan

If `--verify` flag didn't work during deployment:

```bash
# Verify individual contract
forge verify-contract \
  <CONTRACT_ADDRESS> \
  <CONTRACT_NAME> \
  --chain-id 11155111 \
  --etherscan-api-key $ETHERSCAN_API_KEY

# Example:
forge verify-contract \
  0x1234... \
  src/vehicle/VehicleNFT.sol:VehicleNFT \
  --chain-id 11155111 \
  --etherscan-api-key $ETHERSCAN_API_KEY
```

### 3. Configure Frontend

Copy contract addresses to frontend `.env.local`:

```bash
# /frontend/.env.local
NEXT_PUBLIC_CHAIN_ID=11155111  # Sepolia

# OnchainID
NEXT_PUBLIC_ONCHAINID_FACTORY=0x...
NEXT_PUBLIC_CLAIM_ISSUER=0x...

# Core Contracts
NEXT_PUBLIC_IDENTITY_REGISTRY=0x...
NEXT_PUBLIC_VEHICLE_NFT=0x...
NEXT_PUBLIC_RENTAL_BOOKING=0x...
NEXT_PUBLIC_INVESTMENT_PAYMENT_PROTOCOL=0x...
NEXT_PUBLIC_RENTAL_PAYMENT_PROTOCOL=0x...
NEXT_PUBLIC_REVENUE_DISTRIBUTOR=0x...

# ... add all other addresses
```

### 4. Copy Contract ABIs

```bash
# Copy ABIs from out/ to frontend
cd /path/to/RegShield

# Create ABI directory in frontend
mkdir -p frontend/src/contracts/abis

# Copy main contract ABIs
cp contracts/out/VehicleNFT.sol/VehicleNFT.json frontend/src/contracts/abis/
cp contracts/out/AssetToken.sol/AssetToken.json frontend/src/contracts/abis/
cp contracts/out/RevenueToken.sol/RevenueToken.json frontend/src/contracts/abis/
cp contracts/out/RentalBooking.sol/RentalBooking.json frontend/src/contracts/abis/
cp contracts/out/RegShieldPaymentProtocol.sol/RegShieldPaymentProtocol.json frontend/src/contracts/abis/
cp contracts/out/RentalPaymentProtocol.sol/RentalPaymentProtocol.json frontend/src/contracts/abis/
cp contracts/out/RevenueDistributor.sol/RevenueDistributor.json frontend/src/contracts/abis/
cp contracts/out/OnchainIDFactory.sol/OnchainIDFactory.json frontend/src/contracts/abis/
cp contracts/out/IdentityRegistry.sol/IdentityRegistry.json frontend/src/contracts/abis/

# Copy all other necessary ABIs
```

---

## Deployment Checklist

Before deploying to mainnet:

- [ ] All contracts compile without errors
- [ ] All tests pass (`forge test`)
- [ ] Contracts deployed to testnet
- [ ] Contracts verified on Etherscan
- [ ] Frontend successfully interacts with testnet contracts
- [ ] Security audit completed (recommended for mainnet)
- [ ] Gas optimization reviewed
- [ ] Multi-sig wallet configured for admin functions
- [ ] Emergency pause mechanism tested
- [ ] Upgrade path documented (if using proxies)

---

## Network Configuration

### Supported Testnets

| Network | Chain ID | RPC URL | Explorer |
|---------|----------|---------|----------|
| Sepolia | 11155111 | $SEPOLIA_RPC_URL | https://sepolia.etherscan.io |
| Arbitrum Sepolia | 421614 | $ARBITRUM_SEPOLIA_RPC_URL | https://sepolia.arbiscan.io |
| Optimism Sepolia | 11155420 | $OPTIMISM_SEPOLIA_RPC_URL | https://sepolia-optimism.etherscan.io |
| Base Sepolia | 84532 | $BASE_SEPOLIA_RPC_URL | https://sepolia.basescan.org |

### Mainnet Deployment

**Cost Estimate**: ~1-2 ETH (varies with gas prices)

```bash
# Deploy to Ethereum Mainnet
forge script script/DeployAll.s.sol \
  --rpc-url $MAINNET_RPC_URL \
  --broadcast \
  --verify \
  --etherscan-api-key $ETHERSCAN_API_KEY \
  --slow  # Use slower, more reliable gas estimation
```

---

## Troubleshooting

### Out of Gas

Increase gas limit:
```bash
--gas-limit 30000000
```

### Verification Failed

Try manual verification:
```bash
forge flatten src/vehicle/VehicleNFT.sol > flattened.sol
# Then verify manually on Etherscan
```

### Nonce Too Low

Reset nonce:
```bash
# Check current nonce on Etherscan
# Use --nonce flag to specify correct nonce
```

### RPC Rate Limiting

Use alternative RPC or add delays:
```bash
--slow --delay 5  # 5 second delay between transactions
```

---

## Contract Addresses (Example - Replace After Deployment)

### Sepolia Testnet

```
# OnchainID Infrastructure
ONCHAINID_FACTORY=0x...
CLAIM_ISSUER=0x...
KEY_MANAGER=0x...

# Registries
TRUSTED_ISSUERS_REGISTRY=0x...
CLAIM_TOPICS_REGISTRY=0x...
INVESTOR_TYPE_REGISTRY=0x...
PARTICIPANT_TYPE_REGISTRY=0x...

# Compliance
COMPLIANCE_RULES=0x...
INVESTOR_TYPE_COMPLIANCE=0x...
RENTER_COMPLIANCE=0x...
OPERATIONAL_COMPLIANCE=0x...
TRANSFER_RESTRICTIONS=0x...
COMPLIANCE_REGISTRY=0x...

# Identity
IDENTITY_REGISTRY=0x...

# Vehicle & Rental
VEHICLE_NFT=0x...
RENTAL_BOOKING=0x...
RENTAL_OPERATIONS=0x...

# Payment
PAYMENT_ESCROW=0x...
REFUND_MANAGER=0x...
INVESTMENT_PAYMENT_PROTOCOL=0x...
RENTAL_PAYMENT_PROTOCOL=0x...

# Revenue & Investor
REVENUE_DISTRIBUTOR=0x...
INVESTOR_REQUEST_MANAGER=0x...
MULTISIG_WALLET=0x...
```

---

## Security Considerations

1. **Private Keys**: Never commit private keys to git
2. **Multi-Sig**: Use multi-sig wallet for admin functions on mainnet
3. **Rate Limiting**: Implement rate limiting on critical functions
4. **Circuit Breakers**: Test emergency pause functionality
5. **Audits**: Get professional security audit before mainnet
6. **Bug Bounty**: Consider bug bounty program after mainnet launch
7. **Monitoring**: Set up monitoring for critical events
8. **Upgrades**: Document upgrade procedures if using proxies

---

## Support

For deployment issues:
- Check Foundry documentation: https://book.getfoundry.sh/
- Review contract tests: `forge test -vvv`
- Check gas usage: `forge test --gas-report`
- Review deployment logs in `broadcast/` directory

---

## Next Steps After Deployment

1. **Test basic functionality**: Mint test VehicleNFT, create test booking
2. **Configure compliance rules**: Set up investor types, whitelist tiers
3. **Add trusted issuers**: Register KYC providers
4. **Set up monitoring**: Monitor contract events
5. **Integrate frontend**: Connect frontend to deployed contracts
6. **Documentation**: Update API documentation with contract addresses
