"use client";

import { Card, CardContent } from "@/components/ui";
import {
  Shield,
  Link2,
  Landmark,
  Coins,
  Fingerprint,
  BarChart3,
} from "lucide-react";
import { motion } from "motion/react";
import { fadeUp, staggerContainer, scrollTrigger } from "@/lib/motionVariants";

const features = [
  {
    icon: <Shield className="text-primary" size={24} />,
    title: "ERC-3643 Compliance",
    description:
      "Security tokens with built-in transfer restrictions and regulatory compliance. Only verified investors can hold and trade tokens.",
  },
  {
    icon: <Link2 className="text-primary" size={24} />,
    title: "Chainlink CRE Automation",
    description:
      "Off-chain verification of VIN validation, purchase confirmation, insurance, and registration — all automated via 5 CRE receivers.",
  },
  {
    icon: <Landmark className="text-primary" size={24} />,
    title: "Milestone-Based Escrow",
    description:
      "Investor funds held in PaymentEscrow until all 4 milestones are verified by Chainlink. No premature release of capital.",
  },
  {
    icon: <Coins className="text-primary" size={24} />,
    title: "Revenue Distribution",
    description:
      "Rental income flows through a waterfall contract: 50% to investors, 10% operator fee, remainder to platform reserves.",
  },
  {
    icon: <Fingerprint className="text-primary" size={24} />,
    title: "OnchainID Identity",
    description:
      "Decentralized identity and KYC via OnchainID. Claim-based verification for investors, rentors, and renters.",
  },
  {
    icon: <BarChart3 className="text-primary" size={24} />,
    title: "34 Smart Contracts",
    description:
      "Comprehensive on-chain infrastructure on Sepolia: ERC-721 VehicleNFT, payment systems, compliance modules, and governance.",
  },
];

export default function PlatformFeatures() {
  return (
    <section className="py-24 px-6 md:px-16 lg:px-24 xl:px-32 bg-light">
      <motion.div
        className="text-center mb-16"
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        viewport={scrollTrigger}
      >
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
          Built on Trust, Powered by Smart Contracts
        </h2>
        <p className="text-gray-500 text-lg max-w-2xl mx-auto">
          Enterprise-grade blockchain infrastructure for vehicle tokenization
        </p>
      </motion.div>

      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto"
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={scrollTrigger}
      >
        {features.map((feature) => (
          <motion.div key={feature.title} variants={fadeUp}>
            <Card
              className="bg-white border-borderColor hover:shadow-md transition-shadow h-full"
            >
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center mb-4">
                  {feature.icon}
                </div>
                <h3 className="font-semibold text-gray-900 text-lg mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
