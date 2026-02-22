"use client";

import { Fragment } from "react";
import { Badge } from "@/components/ui";
import {
  Wallet,
  Lock,
  CheckCircle,
  Coins,
  TrendingUp,
  ArrowRight,
  ArrowDown,
} from "lucide-react";
import { motion } from "motion/react";
import { fadeUp, staggerContainer, scrollTrigger } from "@/lib/motionVariants";

const stages = [
  {
    icon: <Wallet className="text-blue-600" size={24} />,
    bgColor: "bg-blue-50",
    title: "Investment",
    subtitle: "Investor funds ETH into vehicle campaign",
  },
  {
    icon: <Lock className="text-amber-600" size={24} />,
    bgColor: "bg-amber-50",
    title: "Escrow",
    subtitle: "ETH held in PaymentEscrow contract",
  },
  {
    icon: <CheckCircle className="text-green-600" size={24} />,
    bgColor: "bg-green-50",
    title: "Milestone Verification",
    subtitle: "Chainlink CRE verifies 4 milestones",
  },
  {
    icon: <Coins className="text-purple-600" size={24} />,
    bgColor: "bg-purple-50",
    title: "Token Minting",
    subtitle: "AssetTokens + RevenueTokens issued",
  },
  {
    icon: <TrendingUp className="text-emerald-600" size={24} />,
    bgColor: "bg-emerald-50",
    title: "Revenue",
    subtitle: "Quarterly rental income distributed",
  },
];

export default function TokenLifecycle() {
  return (
    <section className="py-24 px-6 md:px-16 lg:px-24 xl:px-32 bg-white">
      <motion.div
        className="text-center mb-16"
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        viewport={scrollTrigger}
      >
        <Badge variant="primary" className="mb-4">
          Token Lifecycle
        </Badge>
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
          From Capital to Revenue
        </h2>
        <p className="text-gray-500 text-lg max-w-2xl mx-auto">
          The complete journey of a tokenized vehicle investment
        </p>
      </motion.div>

      {/* Desktop: Horizontal flow */}
      <motion.div
        className="hidden md:flex items-start justify-between gap-2 max-w-5xl mx-auto"
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={scrollTrigger}
      >
        {stages.map((stage, i) => (
          <Fragment key={stage.title}>
            <motion.div
              variants={fadeUp}
              className="flex flex-col items-center text-center flex-1"
            >
              <div
                className={`w-16 h-16 rounded-2xl ${stage.bgColor} flex items-center justify-center mb-3`}
              >
                {stage.icon}
              </div>
              <h3 className="font-semibold text-sm text-gray-900 mb-1">
                {stage.title}
              </h3>
              <p className="text-xs text-gray-500 max-w-32">
                {stage.subtitle}
              </p>
            </motion.div>
            {i < stages.length - 1 && (
              <motion.div variants={fadeUp} className="flex items-center pt-6">
                <ArrowRight className="text-borderColor" size={20} />
              </motion.div>
            )}
          </Fragment>
        ))}
      </motion.div>

      {/* Mobile: Vertical flow */}
      <motion.div
        className="md:hidden flex flex-col items-center gap-2"
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={scrollTrigger}
      >
        {stages.map((stage, i) => (
          <Fragment key={stage.title}>
            <motion.div
              variants={fadeUp}
              className="flex items-center gap-4 w-full max-w-sm"
            >
              <div
                className={`w-14 h-14 rounded-xl ${stage.bgColor} flex items-center justify-center shrink-0`}
              >
                {stage.icon}
              </div>
              <div>
                <h3 className="font-semibold text-sm text-gray-900">
                  {stage.title}
                </h3>
                <p className="text-xs text-gray-500">{stage.subtitle}</p>
              </div>
            </motion.div>
            {i < stages.length - 1 && (
              <motion.div variants={fadeUp}>
                <ArrowDown className="text-borderColor" size={20} />
              </motion.div>
            )}
          </Fragment>
        ))}
      </motion.div>
    </section>
  );
}
