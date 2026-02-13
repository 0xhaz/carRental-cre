#!/bin/bash

# RegShield Phased Deployment Script
# Deploys contracts in phases to avoid RPC rate limits

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}   RegShield Phased Deployment${NC}"
echo -e "${GREEN}================================================${NC}"

# Check .env
if [ ! -f .env ]; then
    echo -e "${RED}Error: .env file not found${NC}"
    exit 1
fi

source .env

# Validate env vars
if [ -z "$PRIVATE_KEY" ] || [ -z "$OWNER" ] || [ -z "$SEPOLIA_RPC_URL" ]; then
    echo -e "${RED}Error: Required environment variables not set${NC}"
    exit 1
fi

PHASE=${1:-1}

case $PHASE in
    1)
        echo -e "${BLUE}Phase 1: Deploying OnchainID Infrastructure${NC}"
        forge script script/01_DeployOnchainID.s.sol \
            --rpc-url $SEPOLIA_RPC_URL \
            --broadcast \
            --slow \
            --legacy \
            -vv \
            --verify \
            --etherscan-api-key $ETHERSCAN_API_KEY
        ;;
    2)
        echo -e "${BLUE}Phase 2: Deploying Registries${NC}"
        forge script script/02_DeployRegistries.s.sol \
            --rpc-url $SEPOLIA_RPC_URL \
            --broadcast \
            --slow \
            --legacy \
            -vv \
            --verify \
            --etherscan-api-key $ETHERSCAN_API_KEY
        ;;
    3)
        echo -e "${BLUE}Phase 3: Deploying Compliance Modules${NC}"
        forge script script/03_DeployCompliance.s.sol \
            --rpc-url $SEPOLIA_RPC_URL \
            --broadcast \
            --slow \
            --legacy \
            -vv \
            --verify \
            --etherscan-api-key $ETHERSCAN_API_KEY
        ;;
    4)
        echo -e "${BLUE}Phase 4: Deploying Identity Registry${NC}"
        forge script script/04_DeployIdentityRegistry.s.sol \
            --rpc-url $SEPOLIA_RPC_URL \
            --broadcast \
            --slow \
            --legacy \
            -vv \
            --verify \
            --etherscan-api-key $ETHERSCAN_API_KEY
        ;;
    5)
        echo -e "${BLUE}Phase 5: Deploying Vehicle & Rental System${NC}"
        forge script script/05_DeployVehicleAndRental.s.sol \
            --rpc-url $SEPOLIA_RPC_URL \
            --broadcast \
            --slow \
            --legacy \
            -vv \
            --verify \
            --etherscan-api-key $ETHERSCAN_API_KEY
        ;;
    6)
        echo -e "${BLUE}Phase 6: Deploying Payment System (Native ETH)${NC}"
        forge script script/06_DeployPayment.s.sol \
            --rpc-url $SEPOLIA_RPC_URL \
            --broadcast \
            --slow \
            --legacy \
            -vv \
            --verify \
            --etherscan-api-key $ETHERSCAN_API_KEY
        ;;
    7)
        echo -e "${BLUE}Phase 7: Deploying Revenue & Investor Management${NC}"
        forge script script/07_DeployRevenueAndInvestor.s.sol \
            --rpc-url $SEPOLIA_RPC_URL \
            --broadcast \
            --slow \
            --legacy \
            -vv \
            --verify \
            --etherscan-api-key $ETHERSCAN_API_KEY
        ;;
    8)
        echo -e "${BLUE}Phase 8: Deploying CRE Receiver Proxies${NC}"
        if [ -z "$CRE_FORWARDER" ]; then
            echo -e "${RED}Error: CRE_FORWARDER address not set in .env${NC}"
            echo -e "${YELLOW}Set CRE_FORWARDER to the Chainlink Forwarder address on target chain${NC}"
            exit 1
        fi
        forge script script/08_DeployCREReceivers.s.sol \
            --rpc-url $SEPOLIA_RPC_URL \
            --broadcast \
            --slow \
            --legacy \
            -vv \
            --verify \
            --etherscan-api-key $ETHERSCAN_API_KEY
        ;;
    all)
        echo -e "${YELLOW}Deploying all phases sequentially...${NC}"
        for i in {1..8}; do
            echo ""
            echo -e "${YELLOW}=== Starting Phase $i ===${NC}"
            sleep 5
            ./deploy-phased.sh $i
            if [ $? -ne 0 ]; then
                echo -e "${RED}Phase $i failed. Stopping.${NC}"
                exit 1
            fi
            echo -e "${GREEN}Phase $i complete!${NC}"
            echo -e "${YELLOW}Waiting 30 seconds before next phase...${NC}"
            sleep 30
        done
        echo -e "${GREEN}All phases deployed successfully!${NC}"
        ;;
    *)
        echo -e "${RED}Invalid phase number${NC}"
        echo "Usage: ./deploy-phased.sh [1-8|all]"
        echo ""
        echo "Phases:"
        echo "  1 - OnchainID Infrastructure"
        echo "  2 - Registries"
        echo "  3 - Compliance Modules"
        echo "  4 - Identity Registry"
        echo "  5 - Vehicle & Rental System"
        echo "  6 - Payment System (Native ETH)"
        echo "  7 - Revenue & Investor Management"
        echo "  8 - CRE Receiver Proxies (requires CRE_FORWARDER in .env)"
        echo "  all - Deploy all phases sequentially"
        exit 1
        ;;
esac

if [ $? -eq 0 ]; then
    echo -e "${GREEN}Phase $PHASE deployment complete!${NC}"
else
    echo -e "${RED}Phase $PHASE deployment failed.${NC}"
    exit 1
fi
