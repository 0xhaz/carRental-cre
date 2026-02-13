#!/bin/bash

# RegShield Deployment Script
# This script handles deployment with proper error handling

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}   RegShield Platform Deployment${NC}"
echo -e "${GREEN}================================================${NC}"

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${RED}Error: .env file not found${NC}"
    echo "Please create .env from .env.example"
    exit 1
fi

# Source environment
source .env

# Validate environment variables
if [ -z "$PRIVATE_KEY" ] || [ -z "$OWNER" ] || [ -z "$SEPOLIA_RPC_URL" ]; then
    echo -e "${RED}Error: Required environment variables not set${NC}"
    echo "Please check PRIVATE_KEY, OWNER, and SEPOLIA_RPC_URL in .env"
    exit 1
fi

echo -e "${YELLOW}Step 1: Running simulation...${NC}"
forge script script/DeployAll.s.sol \
    --rpc-url $SEPOLIA_RPC_URL \
    -vvv

if [ $? -ne 0 ]; then
    echo -e "${RED}Simulation failed! Fix errors before deploying.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Simulation successful!${NC}"
echo ""
echo -e "${YELLOW}Step 2: Deploying to Sepolia testnet...${NC}"
echo -e "${YELLOW}This will cost real ETH. Press Ctrl+C to cancel or wait 10 seconds...${NC}"
sleep 10

# Deploy with broadcasting
forge script script/DeployAll.s.sol \
    --rpc-url $SEPOLIA_RPC_URL \
    --broadcast \
    --slow \
    -vvv \
    --verify \
    --etherscan-api-key $ETHERSCAN_API_KEY

if [ $? -eq 0 ]; then
    echo -e "${GREEN}================================================${NC}"
    echo -e "${GREEN}   Deployment Complete!${NC}"
    echo -e "${GREEN}================================================${NC}"
    echo ""
    echo "Deployment artifacts saved to:"
    echo "  broadcast/DeployAll.s.sol/11155111/run-latest.json"
    echo ""
    echo "Contract addresses saved. Next steps:"
    echo "1. Copy ABIs to frontend: out/**/*.json"
    echo "2. Update frontend .env with deployed addresses"
    echo "3. Verify contracts on Etherscan (if not auto-verified)"
else
    echo -e "${RED}Deployment failed. Check error messages above.${NC}"
    exit 1
fi
