#!/bin/bash
# ==========================================================================
# RegShield CRE Demo — INVESTOR Role
# ==========================================================================
# Demonstrates CRE workflows relevant to the Investor:
#
#   1. Onboarding Workflow (Investor Approval) — Auto-verifies investor
#      identity using ERC-3643 IdentityRegistry and WorldID. Approved
#      investors can participate in vehicle fundraising campaigns.
#      Replaces: Manual admin approval via admin panel
#
#   2. Rental Workflow (Investment Lifecycle) — Verifies 4 milestones
#      before releasing investor funds to the rentor:
#        - VIN verification via NHTSA API
#        - Purchase/escrow verification
#        - Insurance obtained
#        - Registration completed
#      Once all 4 pass, funds are auto-released from escrow.
#      Replaces: backend/services/bookingScheduler.js + milestone logic
#
# Usage:
#   ./demo-investor.sh              # Simulation mode (mock data)
#   ./demo-investor.sh --broadcast  # Broadcast to Sepolia testnet
#
# NOTE: Rental workflow requires real on-chain data. In simulation without
#       chain data, it exits early. Use --broadcast for full demo.
# ==========================================================================

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
TARGET="staging-settings"

echo "=================================================="
echo "  INVESTOR DEMO — Investment Lifecycle Automation"
echo "=================================================="
echo ""

# --- Investor Onboarding ---
echo "=========================================="
echo "  Step 1: Investor Onboarding"
echo "=========================================="
echo ""
echo "  Scenario: A new user wants to invest in a vehicle."
echo "  CRE checks their identity on-chain (ERC-3643 registry)"
echo "  and optionally verifies WorldID (biometric proof-of-personhood)."
echo "  Verified investors are auto-approved, others are rejected."
echo ""
echo "  Backend replaced: Manual admin approval in admin panel"
echo ""

cre workflow simulate "$PROJECT_DIR/onboarding-workflow" \
  -T "$TARGET" \
  --trigger-index 0 \
  --non-interactive \
  -R "$PROJECT_DIR" \
  "$@"

echo ""
echo ""

# --- Investment Milestone Verification ---
echo "=========================================="
echo "  Step 2: Investment Milestone Verification"
echo "=========================================="
echo ""
echo "  Scenario: An investor has funded a vehicle. CRE verifies"
echo "  4 milestones before releasing escrowed funds:"
echo "    1. VEHICLE_IDENTIFIED — VIN verified via NHTSA API"
echo "    2. PURCHASE_VERIFIED  — Vehicle active + escrow funded"
echo "    3. INSURANCE_OBTAINED — Insurance expiry is valid"
echo "    4. REGISTRATION_COMPLETED — Registration expiry is valid"
echo ""
echo "  Backend replaced: bookingScheduler.js + milestone verification"
echo ""
echo "  NOTE: Requires real chain data for full demo."
echo ""

cre workflow simulate "$PROJECT_DIR/rental-workflow" \
  -T "$TARGET" \
  --trigger-index 0 \
  --non-interactive \
  -R "$PROJECT_DIR" \
  "$@"

echo ""
echo "=================================================="
echo "  INVESTOR DEMO COMPLETE"
echo "=================================================="
