/**
 * RegShield Smart Contract Addresses
 * Deployed on Sepolia Testnet (Chain ID: 11155111)
 * Last Updated: 2025-02-12
 */

// Chain configuration
export const SEPOLIA_CHAIN_ID = 11155111;
export const SUPPORTED_CHAINS = [SEPOLIA_CHAIN_ID] as const;

// Contract addresses type
export type ContractAddresses = {
  // OnchainID Infrastructure
  onchainIDFactory: `0x${string}`;
  claimIssuer: `0x${string}`;
  keyManager: `0x${string}`;

  // Registries
  trustedIssuersRegistry: `0x${string}`;
  claimTopicsRegistry: `0x${string}`;
  investorTypeRegistry: `0x${string}`;
  participantTypeRegistry: `0x${string}`;

  // Compliance Modules
  complianceRules: `0x${string}`;
  investorTypeCompliance: `0x${string}`;
  renterCompliance: `0x${string}`;
  operationalCompliance: `0x${string}`;
  transferRestrictions: `0x${string}`;
  complianceRegistry: `0x${string}`;

  // Identity Registry
  identityRegistry: `0x${string}`;

  // Vehicle & Rental System
  vehicleNFT: `0x${string}`;
  rentalBooking: `0x${string}`;
  rentalOperations: `0x${string}`;

  // Payment System
  investmentPaymentProtocol: `0x${string}`;
  investmentEscrow: `0x${string}`;
  investmentRefundManager: `0x${string}`;
  rentalPaymentProtocol: `0x${string}`;
  rentalEscrow: `0x${string}`;
  rentalRefundManager: `0x${string}`;
  disputeResolver: `0x${string}`;

  // Revenue & Investor Management
  revenueDistributor: `0x${string}`;
  investorRequestManager: `0x${string}`;
  multiSigWallet: `0x${string}`;

  // Payment Receivers (for off-chain use)
  complianceReceiver: `0x${string}`;
  paymentReceiver: `0x${string}`;
  vehicleReceiver: `0x${string}`;
  onboardingReceiver: `0x${string}`;
};

// Sepolia Testnet Addresses
export const SEPOLIA_CONTRACTS: ContractAddresses = {
  // OnchainID Infrastructure
  onchainIDFactory: "0x67e83ecfa2981c8b16ab5dca8535c1254c2bf820",
  claimIssuer: "0xc122be20cffcfe3c0b8559d628f2b0095bfd4ccf",
  keyManager: "0xb02d8e147dc5ee1749076d9b62ba69216c29f00e",

  // Registries
  trustedIssuersRegistry: "0x686b28fb0a06de87d4cfa1a01f9584b48022a8a1",
  claimTopicsRegistry: "0xeeba359aa1662b5255634b94cba2d8e7b1526bd7",
  investorTypeRegistry: "0x2ad67745ea337d94187bcda13a16ffdc1e2f67a6",
  participantTypeRegistry: "0xafe4f08f80dfe110bd37466c9b920c6d280cb3c1",

  // Compliance Modules
  complianceRules: "0xeee4e4580b103c667acfbb81bd10986b01409450",
  investorTypeCompliance: "0x53f96a9dfd9e3b68243c4c7736dbe84261165110",
  renterCompliance: "0x61bc66973794973b02b2059a2419a0a238145eb1",
  operationalCompliance: "0x8c9fb8b1d90a0c836b3a942d6e5acb19c5640f77",
  transferRestrictions: "0x0ee4990885c53d70e11f9ae7174b5665f230ab10",
  complianceRegistry: "0xce33f0a75681086f24e1a2ce68a3fb624cbdf9d9",

  // Identity Registry
  identityRegistry: "0x6f2bf8845bb10b021e2a37d9f4bf7015f86c99f5",

  // Vehicle & Rental System
  vehicleNFT: "0xfce0fd3671e99d65e0ff70b30b9238bb83d91814",
  rentalBooking: "0x144e3686533811ce108ded2249f3e18899154f86",
  rentalOperations: "0xd1b9a8d1df0285b78d6d95161dadf8375fdb6969",

  // Payment System
  investmentPaymentProtocol: "0x2b246b3e17f46a8aa9f38c82c7f66f6b6bd329cc",
  investmentEscrow: "0x3ffe3640eb086368c44fc27b188af12748d9443f",
  investmentRefundManager: "0x4385699d3d8173e15aa1040d2fa1d5fedef6a657",
  rentalPaymentProtocol: "0x9e2bc54381871191c1d7a3367f6773e18061092d",
  rentalEscrow: "0xaf7fb568ce7489f1cb770abb55d9df0e7ecba94d",
  rentalRefundManager: "0x4c1e49928736afd69b26c656f104ce25e05b5bf6",
  disputeResolver: "0x138d4fb3286ccb682a6a226f16d8a0b59d4b4e4f",

  // Revenue & Investor Management
  revenueDistributor: "0x9ad1c5ce20fdd13bd549c5d85817e4a8dc2b9c29",
  investorRequestManager: "0xe4cdeedc4e21e46092391cb54969cf3dfee03956",
  multiSigWallet: "0x095682a629123a3e6f8c7b49bd1911977743fa2b",

  // Payment Receivers (for off-chain use)
  complianceReceiver: "0x179a9560a3ffb00f96685f052c2dc33b6ae7aff9",
  paymentReceiver: "0xf3fec3fea53b2e3039c2ce5550029b0a6bf2cda4",
  vehicleReceiver: "0x439a7819c78113f9b32ebafcfbad79bf69d4f45d",
  onboardingReceiver: "0x7eb0cfb5e213233622f818cd9bf0a4c3c93330e1",
};

// Get contracts for current chain
export function getContracts(chainId: number): ContractAddresses {
  if (chainId === SEPOLIA_CHAIN_ID) {
    return SEPOLIA_CONTRACTS;
  }
  throw new Error(`Unsupported chain ID: ${chainId}`);
}

// Etherscan URLs
export const ETHERSCAN_BASE_URL: Record<number, string> = {
  [SEPOLIA_CHAIN_ID]: "https://sepolia.etherscan.io",
};

export function getEtherscanUrl(
  chainId: number,
  address: string,
  type: "address" | "tx" = "address",
): string {
  const baseUrl = ETHERSCAN_BASE_URL[chainId];
  if (!baseUrl) throw new Error(`No Etherscan URL for chain ${chainId}`);
  return `${baseUrl}/${type}/${address}`;
}

// Contract names mapping for display
export const CONTRACT_NAMES: Record<keyof ContractAddresses, string> = {
  onchainIDFactory: "OnchainID Factory",
  claimIssuer: "Claim Issuer",
  keyManager: "Key Manager",
  trustedIssuersRegistry: "Trusted Issuers Registry",
  claimTopicsRegistry: "Claim Topics Registry",
  investorTypeRegistry: "Investor Type Registry",
  participantTypeRegistry: "Participant Type Registry",
  complianceRules: "Compliance Rules",
  investorTypeCompliance: "Investor Type Compliance",
  renterCompliance: "Renter Compliance",
  operationalCompliance: "Operational Compliance",
  transferRestrictions: "Transfer Restrictions",
  complianceRegistry: "Compliance Registry",
  identityRegistry: "Identity Registry",
  vehicleNFT: "Vehicle NFT",
  rentalBooking: "Rental Booking",
  rentalOperations: "Rental Operations",
  investmentPaymentProtocol: "Investment Payment Protocol",
  investmentEscrow: "Investment Escrow",
  investmentRefundManager: "Investment Refund Manager",
  rentalPaymentProtocol: "Rental Payment Protocol",
  rentalEscrow: "Rental Escrow",
  rentalRefundManager: "Rental Refund Manager",
  revenueDistributor: "Revenue Distributor",
  investorRequestManager: "Investor Request Manager",
  multiSigWallet: "MultiSig Wallet",
  disputeResolver: "Dispute Resolver",
  complianceReceiver: "Compliance Receiver",
  paymentReceiver: "Payment Receiver",
  vehicleReceiver: "Vehicle Receiver",
  onboardingReceiver: "Onboarding Receiver",
};
