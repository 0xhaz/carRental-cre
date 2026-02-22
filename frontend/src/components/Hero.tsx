"use client";

import Link from "next/link";
import { Button, Badge } from "@/components/ui";
import { Shield, TrendingUp, Car, Coins, Lock, BarChart3 } from "lucide-react";
import { motion } from "motion/react";
import { fadeUp, staggerContainer } from "@/lib/motionVariants";

const orbitingBadges = [
  {
    icon: <Coins size={16} className="text-primary" />,
    label: "AssetToken",
    sublabel: "Ownership",
    borderColor: "border-blue-100",
    bgColor: "bg-blue-50",
    entranceDelay: 0.4,
    orbitDelay: "0s",
  },
  {
    icon: <TrendingUp size={16} className="text-green-600" />,
    label: "RevenueToken",
    sublabel: "Income Rights",
    borderColor: "border-green-100",
    bgColor: "bg-green-50",
    entranceDelay: 0.6,
    orbitDelay: "-6s",
  },
  {
    icon: <Lock size={16} className="text-amber-600" />,
    label: "Escrow",
    sublabel: "Milestone-Based",
    borderColor: "border-amber-100",
    bgColor: "bg-amber-50",
    entranceDelay: 0.8,
    orbitDelay: "-12s",
  },
  {
    icon: <BarChart3 size={16} className="text-purple-600" />,
    label: "CRE Verified",
    sublabel: "Chainlink",
    borderColor: "border-purple-100",
    bgColor: "bg-purple-50",
    entranceDelay: 1.0,
    orbitDelay: "-18s",
  },
];

const Hero = () => {
  return (
    <section className="relative min-h-[85vh] flex items-center bg-white overflow-hidden">
      <div className="px-6 md:px-16 lg:px-24 xl:px-32 py-20 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left: Text content */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
          >
            <motion.div variants={fadeUp}>
              <Badge variant="primary" className="mb-6">
                Blockchain-Powered Vehicle Investment
              </Badge>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6"
            >
              Invest in Vehicles.{" "}
              <span className="text-primary">
                Earn Real Revenue.
              </span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="text-lg text-gray-500 leading-relaxed mb-8 max-w-xl"
            >
              Tokenized vehicle ownership powered by ERC-3643 security tokens.
              Fund vehicles through milestone-based escrow, receive ownership
              tokens, and earn quarterly rental income — all on-chain.
            </motion.p>

            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4 mb-10">
              <Link href="/investor/marketplace">
                <Button size="lg" className="w-full sm:w-auto">
                  Start Investing
                </Button>
              </Link>
              <Link href="/rentor">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto"
                >
                  List Your Vehicle
                </Button>
              </Link>
            </motion.div>

            {/* Trust indicators */}
            <motion.div variants={fadeUp} className="flex flex-wrap items-center gap-6 text-sm text-gray-500">
              <span className="flex items-center gap-2">
                <Shield size={16} className="text-primary" />
                ERC-3643 Compliant
              </span>
              <span className="flex items-center gap-2">
                <TrendingUp size={16} className="text-primary" />
                Quarterly Revenue
              </span>
              <span className="flex items-center gap-2">
                <Lock size={16} className="text-primary" />
                Escrow Protected
              </span>
            </motion.div>
          </motion.div>

          {/* Right: Abstract illustration with orbiting badges */}
          <div className="hidden lg:flex items-center justify-center">
            <div className="relative w-full max-w-md aspect-square">
              {/* Background gradient circle */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-50 to-blue-100"
              />

              {/* Central car icon */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <Car size={120} className="text-primary opacity-15" />
              </motion.div>

              {/* Orbiting badges */}
              {orbitingBadges.map((badge) => (
                <motion.div
                  key={badge.label}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: badge.entranceDelay }}
                  className="absolute inset-0 z-10"
                >
                  {/* Orbit wrapper — centered on circle, CSS animation moves it */}
                  <div
                    className="absolute top-1/2 left-1/2"
                    style={{
                      animation: `orbit 24s linear infinite`,
                      animationDelay: badge.orbitDelay,
                    }}
                  >
                    {/* Badge card — offset to center on orbit point */}
                    <div
                      className={`-translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-lg px-4 py-3 flex items-center gap-2 border ${badge.borderColor} whitespace-nowrap`}
                    >
                      <div className={`w-8 h-8 rounded-lg ${badge.bgColor} flex items-center justify-center`}>
                        {badge.icon}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-900">{badge.label}</p>
                        <p className="text-[10px] text-gray-400">{badge.sublabel}</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
