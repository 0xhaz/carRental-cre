/**
 * Contract ABIs
 * Auto-generated from Foundry compilation output
 */

// Core contracts
import VehicleNFTAbi from "./abis/VehicleNFT.json";
import RentalBookingAbi from "./abis/RentalBooking.json";
import RentalOperationsAbi from "./abis/RentalOperations.json";
import IdentityRegistryAbi from "./abis/IdentityRegistry.json";

// Payment system (native ETH)
import RegShieldPaymentProtocolAbi from "./abis/RegShieldPaymentProtocol.json";
import RentalPaymentProtocolAbi from "./abis/RentalPaymentProtocol.json";
import PaymentEscrowAbi from "./abis/PaymentEscrow.json";
import RefundManagerAbi from "./abis/RefundManager.json";
import DisputeResolverAbi from "./abis/DisputeResolver.json";

// Investor & Revenue
import InvestorRequestManagerAbi from "./abis/InvestorRequestManager.json";
import RevenueDistributorAbi from "./abis/RevenueDistributor.json";
import MultiSigWalletAbi from "./abis/MultiSigWallet.json";

// Compliance & Registries
import ComplianceRulesAbi from "./abis/ComplianceRules.json";
import RenterComplianceAbi from "./abis/RenterCompliance.json";
import OperationalComplianceAbi from "./abis/OperationalCompliance.json";
import InvestorTypeRegistryAbi from "./abis/InvestorTypeRegistry.json";
import ParticipantTypeRegistryAbi from "./abis/ParticipantTypeRegistry.json";

// Token Factories
import AssetTokenFactoryAbi from "./abis/AssetTokenFactory.json";
import RevenueTokenFactoryAbi from "./abis/RevenueTokenFactory.json";

// Identity
import ClaimIssuerAbi from "./abis/ClaimIssuer.json";

// CRE Receivers
import CampaignMonitorReceiverAbi from "./abis/CampaignMonitorReceiver.json";
import PaymentReceiverAbi from "./abis/PaymentReceiver.json";
import ComplianceReceiverAbi from "./abis/ComplianceReceiver.json";
import VehicleReceiverAbi from "./abis/VehicleReceiver.json";
import OnboardingReceiverAbi from "./abis/OnboardingReceiver.json";

// World ID
import WorldIDVerifierAbi from "./abis/WorldIDVerifier.json";

// Export ABIs (extract abi field from JSON)
export const VEHICLE_NFT_ABI = VehicleNFTAbi.abi;
export const RENTAL_BOOKING_ABI = RentalBookingAbi.abi;
export const RENTAL_OPERATIONS_ABI = RentalOperationsAbi.abi;
export const IDENTITY_REGISTRY_ABI = IdentityRegistryAbi.abi;
export const REGSHIELD_PAYMENT_PROTOCOL_ABI = RegShieldPaymentProtocolAbi.abi;
export const RENTAL_PAYMENT_PROTOCOL_ABI = RentalPaymentProtocolAbi.abi;
export const PAYMENT_ESCROW_ABI = PaymentEscrowAbi.abi;
export const REFUND_MANAGER_ABI = RefundManagerAbi.abi;
export const DISPUTE_RESOLVER_ABI = DisputeResolverAbi.abi;
export const INVESTOR_REQUEST_MANAGER_ABI = InvestorRequestManagerAbi.abi;
export const REVENUE_DISTRIBUTOR_ABI = RevenueDistributorAbi.abi;
export const MULTI_SIG_WALLET_ABI = MultiSigWalletAbi.abi;
export const COMPLIANCE_RULES_ABI = ComplianceRulesAbi.abi;
export const RENTER_COMPLIANCE_ABI = RenterComplianceAbi.abi;
export const OPERATIONAL_COMPLIANCE_ABI = OperationalComplianceAbi.abi;
export const INVESTOR_TYPE_REGISTRY_ABI = InvestorTypeRegistryAbi.abi;
export const PARTICIPANT_TYPE_REGISTRY_ABI = ParticipantTypeRegistryAbi.abi;
export const ASSET_TOKEN_FACTORY_ABI = AssetTokenFactoryAbi.abi;
export const REVENUE_TOKEN_FACTORY_ABI = RevenueTokenFactoryAbi.abi;
export const CLAIM_ISSUER_ABI = ClaimIssuerAbi.abi;
export const CAMPAIGN_MONITOR_RECEIVER_ABI = CampaignMonitorReceiverAbi.abi;
export const PAYMENT_RECEIVER_ABI = PaymentReceiverAbi.abi;
export const COMPLIANCE_RECEIVER_ABI = ComplianceReceiverAbi.abi;
export const VEHICLE_RECEIVER_ABI = VehicleReceiverAbi.abi;
export const ONBOARDING_RECEIVER_ABI = OnboardingReceiverAbi.abi;
export const WORLD_ID_VERIFIER_ABI = WorldIDVerifierAbi.abi;

// Consolidated export for easy access
export const ABIS = {
  vehicleNFT: VEHICLE_NFT_ABI,
  rentalBooking: RENTAL_BOOKING_ABI,
  rentalOperations: RENTAL_OPERATIONS_ABI,
  identityRegistry: IDENTITY_REGISTRY_ABI,
  regShieldPaymentProtocol: REGSHIELD_PAYMENT_PROTOCOL_ABI,
  rentalPaymentProtocol: RENTAL_PAYMENT_PROTOCOL_ABI,
  paymentEscrow: PAYMENT_ESCROW_ABI,
  refundManager: REFUND_MANAGER_ABI,
  disputeResolver: DISPUTE_RESOLVER_ABI,
  investorRequestManager: INVESTOR_REQUEST_MANAGER_ABI,
  revenueDistributor: REVENUE_DISTRIBUTOR_ABI,
  multiSigWallet: MULTI_SIG_WALLET_ABI,
  complianceRules: COMPLIANCE_RULES_ABI,
  renterCompliance: RENTER_COMPLIANCE_ABI,
  operationalCompliance: OPERATIONAL_COMPLIANCE_ABI,
  investorTypeRegistry: INVESTOR_TYPE_REGISTRY_ABI,
  participantTypeRegistry: PARTICIPANT_TYPE_REGISTRY_ABI,
  assetTokenFactory: ASSET_TOKEN_FACTORY_ABI,
  revenueTokenFactory: REVENUE_TOKEN_FACTORY_ABI,
  claimIssuer: CLAIM_ISSUER_ABI,
  campaignMonitorReceiver: CAMPAIGN_MONITOR_RECEIVER_ABI,
  paymentReceiver: PAYMENT_RECEIVER_ABI,
  complianceReceiver: COMPLIANCE_RECEIVER_ABI,
  vehicleReceiver: VEHICLE_RECEIVER_ABI,
  onboardingReceiver: ONBOARDING_RECEIVER_ABI,
  worldIDVerifier: WORLD_ID_VERIFIER_ABI,
} as const;

export default ABIS;
