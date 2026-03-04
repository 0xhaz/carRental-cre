#!/bin/bash
# ==========================================================================
# RegShield CRE Demo — RENTOR Role
# ==========================================================================
# Demonstrates CRE workflows relevant to the Rentor (vehicle owner):
#
#   1. Campaign Workflow — Monitors fundraising campaigns for the rentor's
#      vehicles. Detects expired/underfunded campaigns and triggers batch
#      refunds to investors automatically.
#      Replaces: backend/services/campaignScheduler.js
#
#   2. Vehicle Workflow — Tracks vehicle telematics (mileage, maintenance).
#      Updates on-chain VehicleNFT metadata with real telemetry data.
#      Replaces: Manual mileage tracking (part of revenueSyncService.js)
#
# Usage:
#   ./demo-rentor.sh              # Simulation mode (mock data)
#   ./demo-rentor.sh --broadcast  # Broadcast to Sepolia testnet
# ==========================================================================

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
TARGET="staging-settings"

echo "=================================================="
echo "  RENTOR DEMO — Vehicle Owner Automation"
echo "=================================================="
echo ""

# --- Campaign Monitoring ---
echo "=========================================="
echo "  Step 1: Campaign Monitor"
echo "=========================================="
echo ""
echo "  Scenario: The rentor listed a vehicle for fundraising."
echo "  CRE checks if the campaign deadline has passed and whether"
echo "  minimum funding was reached. If not, it auto-refunds investors."
echo ""
echo "  Backend replaced: campaignScheduler.js (hourly cron job)"
echo ""

cre workflow simulate "$PROJECT_DIR/campaign-workflow" \
  -T "$TARGET" \
  --trigger-index 0 \
  --non-interactive \
  -R "$PROJECT_DIR" \
  "$@"

echo ""
echo ""

# --- Vehicle Telematics ---
echo "=========================================="
echo "  Step 2: Vehicle Telematics"
echo "=========================================="
echo ""
echo "  Scenario: The rentor's vehicle is on the road."
echo "  CRE fetches telemetry data (odometer/mileage) and updates"
echo "  the VehicleNFT on-chain if mileage delta exceeds 50 miles."
echo ""
echo "  Backend replaced: Vehicle mileage tracking in revenueSyncService.js"
echo ""

cre workflow simulate "$PROJECT_DIR/vehicle-workflow" \
  -T "$TARGET" \
  --trigger-index 0 \
  --non-interactive \
  -R "$PROJECT_DIR" \
  "$@"

echo ""
echo "=================================================="
echo "  RENTOR DEMO COMPLETE"
echo "=================================================="
