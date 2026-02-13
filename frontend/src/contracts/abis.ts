/**
 * Contract ABIs
 * Auto-generated from Foundry compilation output
 */

import VehicleNFTAbi from "./abis/VehicleNFT.json";
import RentalBookingAbi from "./abis/RentalBooking.json";
import RentalOperationsAbi from "./abis/RentalOperations.json";
import PaymentTokenAbi from "./abis/MockPaymentToken.json";
import RentalPaymentProtocolAbi from "./abis/RentalPaymentProtocol.json";
import InvestorRequestManagerAbi from "./abis/InvestorRequestManager.json";
import RevenueDistributorAbi from "./abis/RevenueDistributor.json";
import IdentityRegistryAbi from "./abis/IdentityRegistry.json";

// Export ABIs (extract abi field from JSON)
export const VEHICLE_NFT_ABI = VehicleNFTAbi.abi as const;
export const RENTAL_BOOKING_ABI = RentalBookingAbi.abi as const;
export const RENTAL_OPERATIONS_ABI = RentalOperationsAbi.abi as const;
export const PAYMENT_TOKEN_ABI = PaymentTokenAbi.abi as const;
export const RENTAL_PAYMENT_PROTOCOL_ABI = RentalPaymentProtocolAbi.abi as const;
export const INVESTOR_REQUEST_MANAGER_ABI = InvestorRequestManagerAbi.abi as const;
export const REVENUE_DISTRIBUTOR_ABI = RevenueDistributorAbi.abi as const;
export const IDENTITY_REGISTRY_ABI = IdentityRegistryAbi.abi as const;

// Consolidated export for easy access
export const ABIS = {
  vehicleNFT: VEHICLE_NFT_ABI,
  rentalBooking: RENTAL_BOOKING_ABI,
  rentalOperations: RENTAL_OPERATIONS_ABI,
  paymentToken: PAYMENT_TOKEN_ABI,
  rentalPaymentProtocol: RENTAL_PAYMENT_PROTOCOL_ABI,
  investorRequestManager: INVESTOR_REQUEST_MANAGER_ABI,
  revenueDistributor: REVENUE_DISTRIBUTOR_ABI,
  identityRegistry: IDENTITY_REGISTRY_ABI,
} as const;

export default ABIS;
