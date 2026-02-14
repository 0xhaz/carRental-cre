#!/bin/bash

# Extract deployed contract addresses from broadcast artifacts
# Saves to deployed-addresses.env for easy frontend integration

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

OUTPUT_FILE="deployed-addresses.env"

echo -e "${BLUE}Extracting deployed contract addresses...${NC}"
echo ""

# Create output file with header
cat > $OUTPUT_FILE << EOF
# RegShield Deployed Contract Addresses
# Generated on $(date)
# Network: Sepolia (Chain ID: 11155111)

EOF

# Function to extract contract address from broadcast file
# Usage: extract_address <script_name> <contract_name> <var_name> [index]
# index is 0-based, defaults to 0. Use when a contract is deployed multiple times.
extract_address() {
    local script_name=$1
    local contract_name=$2
    local var_name=$3
    local index=${4:-0}

    local broadcast_file="broadcast/${script_name}.s.sol/11155111/run-latest.json"

    if [ -f "$broadcast_file" ]; then
        local address=$(cat $broadcast_file | jq -r "[.transactions[] | select(.contractName == \"$contract_name\") | .contractAddress] | .[$index]")
        if [ -n "$address" ] && [ "$address" != "null" ]; then
            echo "${var_name}=${address}" >> $OUTPUT_FILE
            echo -e "${GREEN}✓${NC} $var_name ($contract_name): $address"
        else
            echo "  $var_name ($contract_name): Not found"
        fi
    fi
}

echo "OnchainID Infrastructure:"
extract_address "01_DeployOnchainID" "OnchainIDFactory" "ONCHAINID_FACTORY"
extract_address "01_DeployOnchainID" "ClaimIssuer" "CLAIM_ISSUER"
extract_address "01_DeployOnchainID" "KeyManager" "KEY_MANAGER"
echo "" >> $OUTPUT_FILE

echo ""
echo "Registries:"
extract_address "02_DeployRegistries" "TrustedIssuersRegistry" "TRUSTED_ISSUERS_REGISTRY"
extract_address "02_DeployRegistries" "ClaimTopicsRegistry" "CLAIM_TOPICS_REGISTRY"
extract_address "02_DeployRegistries" "InvestorTypeRegistry" "INVESTOR_TYPE_REGISTRY"
extract_address "02_DeployRegistries" "ParticipantTypeRegistry" "PARTICIPANT_TYPE_REGISTRY"
echo "" >> $OUTPUT_FILE

echo ""
echo "Compliance Modules:"
extract_address "03_DeployCompliance" "ComplianceRules" "COMPLIANCE_RULES"
extract_address "03_DeployCompliance" "InvestorTypeCompliance" "INVESTOR_TYPE_COMPLIANCE"
extract_address "03_DeployCompliance" "RenterCompliance" "RENTER_COMPLIANCE"
extract_address "03_DeployCompliance" "OperationalCompliance" "OPERATIONAL_COMPLIANCE"
extract_address "03_DeployCompliance" "TransferRestrictions" "TRANSFER_RESTRICTIONS"
extract_address "03_DeployCompliance" "ComplianceRegistry" "COMPLIANCE_REGISTRY"
echo "" >> $OUTPUT_FILE

echo ""
echo "Identity Registry:"
extract_address "04_DeployIdentityRegistry" "IdentityRegistry" "IDENTITY_REGISTRY"
echo "" >> $OUTPUT_FILE

echo ""
echo "Vehicle & Rental:"
extract_address "05_DeployVehicleAndRental" "VehicleNFT" "VEHICLE_NFT"
extract_address "05_DeployVehicleAndRental" "RentalBooking" "RENTAL_BOOKING"
extract_address "05_DeployVehicleAndRental" "RentalOperations" "RENTAL_OPERATIONS"
echo "" >> $OUTPUT_FILE

echo ""
echo "Payment System (Native ETH):"
# Investment payment: RegShieldPaymentProtocol is deployed first, then 1st PaymentEscrow, 1st RefundManager
extract_address "06_DeployPayment" "RegShieldPaymentProtocol" "INVESTMENT_PAYMENT_PROTOCOL"
extract_address "06_DeployPayment" "PaymentEscrow" "INVESTMENT_ESCROW" 0
extract_address "06_DeployPayment" "RefundManager" "INVESTMENT_REFUND_MANAGER" 0
# Rental payment: RentalPaymentProtocol next, then 2nd PaymentEscrow, 2nd RefundManager
extract_address "06_DeployPayment" "RentalPaymentProtocol" "RENTAL_PAYMENT_PROTOCOL"
extract_address "06_DeployPayment" "PaymentEscrow" "RENTAL_ESCROW" 1
extract_address "06_DeployPayment" "RefundManager" "RENTAL_REFUND_MANAGER" 1
# Dispute resolution
extract_address "06_DeployPayment" "DisputeResolver" "DISPUTE_RESOLVER"
echo "" >> $OUTPUT_FILE

echo ""
echo "Revenue & Investor:"
extract_address "07_DeployRevenueAndInvestor" "RevenueDistributor" "REVENUE_DISTRIBUTOR"
extract_address "07_DeployRevenueAndInvestor" "InvestorRequestManager" "INVESTOR_REQUEST_MANAGER"
extract_address "07_DeployRevenueAndInvestor" "MultiSigWallet" "MULTISIG_WALLET"
echo "" >> $OUTPUT_FILE

echo ""
echo "CRE Receivers:"
extract_address "08_DeployCREReceivers" "ComplianceReceiver" "COMPLIANCE_RECEIVER"
extract_address "08_DeployCREReceivers" "PaymentReceiver" "PAYMENT_RECEIVER"
extract_address "08_DeployCREReceivers" "VehicleReceiver" "VEHICLE_RECEIVER"
extract_address "08_DeployCREReceivers" "OnboardingReceiver" "ONBOARDING_RECEIVER"
extract_address "08_DeployCREReceivers" "CampaignMonitorReceiver" "CAMPAIGN_MONITOR_RECEIVER"

echo ""
echo -e "${GREEN}Addresses saved to: $OUTPUT_FILE${NC}"
echo ""
echo "Copy this file to your frontend .env to integrate with deployed contracts"
