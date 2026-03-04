#!/bin/bash
# ==========================================================================
# RegShield CRE Demo — ADMIN Role (Full Platform Overview)
# ==========================================================================
# Runs all 5 CRE workflows sequentially to demonstrate the complete
# RegShield autonomous automation platform.
#
# Workflow order (by role context):
#   1. Onboarding   — Investor/renter approval (identity + compliance)
#   2. Campaign      — Fundraising campaign monitoring + batch refunds
#   3. Rental        — Investment milestone verification + fund release
#   4. Vehicle       — Telematics monitoring + mileage updates
#   5. Compliance    — Registration/insurance/maintenance monitoring
#
# Usage:
#   ./demo-admin.sh              # Simulation mode (mock data)
#   ./demo-admin.sh --broadcast  # Broadcast to Sepolia testnet
# ==========================================================================

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
TARGET="staging-settings"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
OUTPUT_DIR="$SCRIPT_DIR/output"

mkdir -p "$OUTPUT_DIR"

echo "=================================================="
echo "  ADMIN DEMO — Full Platform Automation"
echo "  $(date)"
echo "=================================================="
echo ""
echo "  This demo runs all 5 CRE workflows that replace"
echo "  centralized backend cron jobs with decentralized"
echo "  Chainlink CRE automation."
echo ""

WORKFLOWS="onboarding-workflow campaign-workflow rental-workflow vehicle-workflow compliance-workflow"
LABELS="Onboarding Campaign Rental Vehicle Compliance"
REPLACES="'Manual admin approval' 'campaignScheduler.js' 'bookingScheduler.js + milestones' 'revenueSyncService.js (partial)' 'New CRE capability'"

set -- $WORKFLOWS
WORKFLOW_ARR=("$@")
set -- $LABELS
LABEL_ARR=("$@")

PASS=0
FAIL=0
STEP=1

for i in $(seq 0 $((${#WORKFLOW_ARR[@]} - 1))); do
  workflow="${WORKFLOW_ARR[$i]}"
  label="${LABEL_ARR[$i]}"

  echo "=========================================="
  echo "  Step $STEP/5: $label Workflow"
  echo "=========================================="
  echo ""

  OUTPUT_FILE="$OUTPUT_DIR/${workflow}_${TIMESTAMP}.log"

  if cre workflow simulate "$PROJECT_DIR/$workflow" \
    -T "$TARGET" \
    --trigger-index 0 \
    --non-interactive \
    -R "$PROJECT_DIR" \
    "$@" \
    2>&1 | tee "$OUTPUT_FILE"; then
    echo ""
    echo "  [PASS] $label workflow"
    PASS=$((PASS + 1))
  else
    echo ""
    echo "  [FAIL] $label workflow"
    FAIL=$((FAIL + 1))
  fi
  echo ""
  STEP=$((STEP + 1))
done

echo "=================================================="
echo "  ADMIN DEMO COMPLETE"
echo "  Result: $PASS passed, $FAIL failed"
echo "  Logs: $OUTPUT_DIR/"
echo "=================================================="
