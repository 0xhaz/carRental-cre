#!/bin/bash
# ==========================================================================
# RegShield CRE Demo — Verify Receiver Contract Setup
# ==========================================================================
# Checks that all receiver contracts are properly configured for
# cre simulate --broadcast on Sepolia.
#
# Verifies:
#   1. MockKeystoneForwarder address is set correctly
#   2. Metadata checks are disabled (default zero values)
#   3. Receiver contracts respond on Sepolia
# ==========================================================================

set -e

RPC_URL="https://ethereum-sepolia-rpc.publicnode.com"

# MockKeystoneForwarder address from CRE bootcamp docs
MOCK_FORWARDER="0x15fC6ae953E024d975e77382eEeC56A9101f9F88"

# Receiver contracts (from contracts/.env)
NAMES="OnboardingReceiver CampaignMonitorReceiver ComplianceReceiver VehicleReceiver PaymentReceiver"
ADDRS="0xF080a8B7Ee2e83c9beE26a795e43D70b1D093850 0x84A9B21B7d2Ba6120923edAA32B283fD2E35FB94 0x0eA9cd084287107BCA0f9785B030c22Db72301fD 0x73c58B5Ba299FaAA64103E453ba55b408C91e81B 0x2f7F8ED26B72A43988AfA1f3088Bd4969f39B7C2"

echo "=================================================="
echo "  RegShield CRE Receiver Setup Verification"
echo "  MockKeystoneForwarder: $MOCK_FORWARDER"
echo "  RPC: $RPC_URL"
echo "=================================================="
echo ""

# Check if cast is available
if ! command -v cast > /dev/null 2>&1; then
  echo "  'cast' (Foundry) not found. Install from https://book.getfoundry.sh/"
  echo ""
  echo "Skipping on-chain verification. Manual check:"
  echo "  Each receiver's getForwarderAddress() should return: $MOCK_FORWARDER"
  echo "  Each receiver's getExpectedAuthor() should return: 0x0 (disabled)"
  echo "  Each receiver's getExpectedWorkflowId() should return: 0x0 (disabled)"
  exit 1
fi

PASS=0
FAIL=0

# Convert to arrays
set -- $NAMES
NAMES_ARR=("$@")
set -- $ADDRS
ADDRS_ARR=("$@")

for i in $(seq 0 $((${#NAMES_ARR[@]} - 1))); do
  name="${NAMES_ARR[$i]}"
  addr="${ADDRS_ARR[$i]}"

  echo "--- $name ($addr) ---"

  # Check forwarder address
  FORWARDER=$(cast call "$addr" "getForwarderAddress()(address)" --rpc-url "$RPC_URL" 2>/dev/null || echo "ERROR")

  if [ "$FORWARDER" = "ERROR" ]; then
    echo "  Could not read contract (may not be deployed or RPC issue)"
    FAIL=$((FAIL + 1))
    echo ""
    continue
  fi

  # Normalize to lowercase for comparison
  FORWARDER_LOWER=$(echo "$FORWARDER" | tr '[:upper:]' '[:lower:]')
  EXPECTED_LOWER=$(echo "$MOCK_FORWARDER" | tr '[:upper:]' '[:lower:]')

  if [ "$FORWARDER_LOWER" = "$EXPECTED_LOWER" ]; then
    echo "  [PASS] Forwarder: $FORWARDER (correct)"
  else
    echo "  [FAIL] Forwarder: $FORWARDER (expected $MOCK_FORWARDER)"
    FAIL=$((FAIL + 1))
    echo ""
    continue
  fi

  # Check expected author (should be 0x0 = disabled)
  AUTHOR=$(cast call "$addr" "getExpectedAuthor()(address)" --rpc-url "$RPC_URL" 2>/dev/null || echo "ERROR")
  if echo "$AUTHOR" | grep -q "0x0000000000000000000000000000000000000000"; then
    echo "  [PASS] Author check: disabled (0x0)"
  else
    echo "  [WARN] Author check: $AUTHOR (set - may need to disable for simulation)"
  fi

  # Check expected workflow ID (should be 0x0 = disabled)
  WORKFLOW_ID=$(cast call "$addr" "getExpectedWorkflowId()(bytes32)" --rpc-url "$RPC_URL" 2>/dev/null || echo "ERROR")
  if echo "$WORKFLOW_ID" | grep -q "0x0000000000000000000000000000000000000000000000000000000000000000"; then
    echo "  [PASS] Workflow ID check: disabled (0x0)"
  else
    echo "  [WARN] Workflow ID check: $WORKFLOW_ID (set - may need to disable for simulation)"
  fi

  PASS=$((PASS + 1))
  echo ""
done

echo "=================================================="
echo "  Result: $PASS verified, $FAIL failed"
if [ $FAIL -eq 0 ]; then
  echo "  All receivers ready for: cre workflow simulate --broadcast"
else
  echo "  Fix issues above before running --broadcast"
fi
echo "=================================================="
