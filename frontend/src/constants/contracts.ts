/**
 * RegShield Smart Contract Addresses
 * Deployed on Sepolia Testnet (Chain ID: 11155111)
 * Last Updated: 2026-02-14
 */

// Chain configuration
export const SEPOLIA_CHAIN_ID = 11155111;
export const SUPPORTED_CHAIN_IDS = [SEPOLIA_CHAIN_ID] as const;

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

  // Token Factories
  assetTokenFactory: `0x${string}`;
  revenueTokenFactory: `0x${string}`;

  // CRE Receivers (for off-chain use)
  complianceReceiver: `0x${string}`;
  paymentReceiver: `0x${string}`;
  vehicleReceiver: `0x${string}`;
  onboardingReceiver: `0x${string}`;
  campaignMonitorReceiver: `0x${string}`;

  // World ID
  worldIDVerifier: `0x${string}`;
};

// Sepolia Testnet Addresses
export const SEPOLIA_CONTRACTS: ContractAddresses = {
  // OnchainID Infrastructure
  onchainIDFactory: "0x18560A48Cca10D5E3AF755865E66F26E056978D5",
  claimIssuer: "0x0292a5f06d3541f9d8F0BFF91cf917ce920a41a9",
  keyManager: "0xd17C0C5Fb1E15911c614BC998396a812971e509E",

  // Registries
  trustedIssuersRegistry: "0x686b28fb0a06de87d4cfa1a01f9584b48022a8a1",
  claimTopicsRegistry: "0xeeba359aa1662b5255634b94cba2d8e7b1526bd7",
  investorTypeRegistry: "0x1Ec4cF8B3bB679eA828C46F833b748A53729Bd33",
  participantTypeRegistry: "0x31cc7D9d9deA3e6933179a390d356477fdD571c6",

  // Compliance Modules
  complianceRules: "0xe81a4ABB60Eb13ac76E98F89ECd1EEd9D54b2C0f",
  investorTypeCompliance: "0x53f96a9dfd9e3b68243c4c7736dbe84261165110",
  renterCompliance: "0x61bc66973794973b02b2059a2419a0a238145eb1",
  operationalCompliance: "0x8c9fb8b1d90a0c836b3a942d6e5acb19c5640f77",
  transferRestrictions: "0x0ee4990885c53d70e11f9ae7174b5665f230ab10",
  complianceRegistry: "0xce33f0a75681086f24e1a2ce68a3fb624cbdf9d9",

  // Identity Registry
  identityRegistry: "0x188C09768E0b2D21212FCDb0faEef175e55d927A",

  // Vehicle & Rental System
  vehicleNFT: "0xfce0fd3671e99d65e0ff70b30b9238bb83d91814",
  rentalBooking: "0x144e3686533811ce108ded2249f3e18899154f86",
  rentalOperations: "0xd1b9a8d1df0285b78d6d95161dadf8375fdb6969",

  // Payment System
  investmentPaymentProtocol: "0x8c61ce72d5cf64f2d14dfee554a493668b87a082",
  investmentEscrow: "0x8e4df9a756ba09e5890f78fa56f1cfb623b4bc89",
  investmentRefundManager: "0xa1b8379afdd69b0e4fb0a697446cf5ade40fafaf",
  rentalPaymentProtocol: "0xE7a76882da96A7bF4EE54d93De478d51A573fc2c",
  rentalEscrow: "0xaf7fb568ce7489f1cb770abb55d9df0e7ecba94d",
  rentalRefundManager: "0x4c1e49928736afd69b26c656f104ce25e05b5bf6",
  disputeResolver: "0x0b4537c45202770e03ef81895a08ce13bd90131c",

  // Revenue & Investor Management
  revenueDistributor: "0xD08bc548f31557bB897eD91476d0c8d48297538D",
  investorRequestManager: "0x520efb46bc6ed01822dfc69ea7cde71b9ba6d6d2",
  multiSigWallet: "0x9D05853223fC9dc32FEc293a410A9E74Ab8c3E7A",

  // Token Factories
  assetTokenFactory: "0x1EEE958464B41716E0afaD7e44C08c5aDb1838ef",
  revenueTokenFactory: "0x1eDE15097F245c0EE8Bf911F98DaD926526E206C",

  // CRE Receivers (redeployed with CampaignMonitorReceiver)
  complianceReceiver: "0x0ea9cd084287107bca0f9785b030c22db72301fd",
  paymentReceiver: "0x2f7f8ed26b72a43988afa1f3088bd4969f39b7c2",
  vehicleReceiver: "0x73c58b5ba299faaa64103e453ba55b408c91e81b",
  onboardingReceiver: "0xf080a8b7ee2e83c9bee26a795e43d70b1d093850",
  campaignMonitorReceiver: "0x84a9b21b7d2ba6120923edaa32b283fd2e35fb94",

  // World ID
  worldIDVerifier: "0x838C9397F5c00f7010924dDc4c2E93Fcab6c0363",
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
  assetTokenFactory: "Asset Token Factory",
  revenueTokenFactory: "Revenue Token Factory",
  complianceReceiver: "Compliance Receiver",
  paymentReceiver: "Payment Receiver",
  vehicleReceiver: "Vehicle Receiver",
  onboardingReceiver: "Onboarding Receiver",
  campaignMonitorReceiver: "Campaign Monitor Receiver",
  worldIDVerifier: "World ID Verifier",
};
