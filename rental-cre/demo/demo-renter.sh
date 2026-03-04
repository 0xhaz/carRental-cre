#!/bin/bash
# ==========================================================================
# RegShield CRE Demo — RENTER Role
# ==========================================================================
# Demonstrates CRE workflows relevant to the Renter (car borrower):
#
#   1. Onboarding Workflow (Booking Approval) — Auto-validates renter
#      compliance before approving booking requests. Checks blacklist
#      status and incident history via RenterCompliance contract.
#      Replaces: Manual admin approval via admin panel
#
#   2. Compliance Workflow — Monitors vehicles the renter is using for
#      safety compliance: expired registration, expired insurance,
#      overdue maintenance. Suspends non-compliant vehicles.
#      Replaces: No automated equivalent (new CRE capability)
#
# Usage:
#   ./demo-renter.sh              # Simulation mode (mock data)
#   ./demo-renter.sh --broadcast  # Broadcast to Sepolia testnet
# ==========================================================================

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
TARGET="staging-settings"

echo "=================================================="
echo "  RENTER DEMO — Booking & Compliance Automation"
echo "=================================================="
echo ""

# --- Booking Approval ---
echo "=========================================="
echo "  Step 1: Booking Auto-Approval"
echo "=========================================="
echo ""
echo "  Scenario: A renter submits a booking request."
echo "  CRE checks their compliance status on-chain:"
echo "    - Is the renter blacklisted?"
echo "    - Any past incidents or violations?"
echo "  Compliant renters are auto-approved, risky ones rejected."
echo ""
echo "  Backend replaced: Manual admin booking approval"
echo ""

cre workflow simulate "$PROJECT_DIR/onboarding-workflow" \
  -T "$TARGET" \
  --trigger-index 0 \
  --non-interactive \
  -R "$PROJECT_DIR" \
  "$@"

echo ""
echo ""

# --- Vehicle Compliance Monitoring ---
echo "=========================================="
echo "  Step 2: Vehicle Compliance Monitoring"
echo "=========================================="
echo ""
echo "  Scenario: A renter is driving a vehicle. CRE monitors"
echo "  the vehicle's compliance status:"
echo "    - Registration expiry date"
echo "    - Insurance expiry date"
echo "    - Last maintenance date (flags if overdue >90 days)"
echo "  Non-compliant vehicles are automatically suspended."
echo ""
echo "  Backend replaced: None (new automated capability from CRE)"
echo ""

cre workflow simulate "$PROJECT_DIR/compliance-workflow" \
  -T "$TARGET" \
  --trigger-index 0 \
  --non-interactive \
  -R "$PROJECT_DIR" \
  "$@"

echo ""
echo "=================================================="
echo "  RENTER DEMO COMPLETE"
echo "=================================================="
