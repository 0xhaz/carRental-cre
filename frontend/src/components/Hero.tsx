"use client";

import Link from "next/link";
import { Button, Badge } from "@/components/ui";
import { Shield, TrendingUp, Car, Coins, Lock, BarChart3 } from "lucide-react";

const Hero = () => {
  return (
    <section className="relative min-h-[85vh] flex items-center bg-white overflow-hidden">
      <div className="px-6 md:px-16 lg:px-24 xl:px-32 py-20 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left: Text content */}
          <div>
            <Badge variant="primary" className="mb-6">
              Blockchain-Powered Vehicle Investment
            </Badge>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6">
              Invest in Vehicles.{" "}
              <span className="text-primary">
                Earn Real Revenue.
              </span>
            </h1>

            <p className="text-lg text-gray-500 leading-relaxed mb-8 max-w-xl">
              Tokenized vehicle ownership powered by ERC-3643 security tokens.
              Fund vehicles through milestone-based escrow, receive ownership
              tokens, and earn quarterly rental income — all on-chain.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-10">
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
            </div>

            {/* Trust indicators */}
            <div className="flex flex-wrap items-center gap-6 text-sm text-gray-500">
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
            </div>
          </div>

          {/* Right: Abstract illustration */}
          <div className="hidden lg:flex items-center justify-center">
            <div className="relative w-full max-w-md aspect-square">
              {/* Background gradient circle */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-50 to-blue-100" />

              {/* Central car icon */}
              <div className="absolute inset-0 flex items-center justify-center">
                <Car size={120} className="text-primary opacity-15" />
              </div>

              {/* Floating badge: AssetToken */}
              <div className="absolute top-8 right-4 bg-white rounded-xl shadow-lg px-4 py-3 flex items-center gap-2 border border-blue-100">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Coins size={16} className="text-primary" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-900">AssetToken</p>
                  <p className="text-[10px] text-gray-400">Ownership</p>
                </div>
              </div>

              {/* Floating badge: RevenueToken */}
              <div className="absolute bottom-16 left-0 bg-white rounded-xl shadow-lg px-4 py-3 flex items-center gap-2 border border-green-100">
                <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                  <TrendingUp size={16} className="text-green-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-900">RevenueToken</p>
                  <p className="text-[10px] text-gray-400">Income Rights</p>
                </div>
              </div>

              {/* Floating badge: Escrow */}
              <div className="absolute top-1/2 -translate-y-1/2 -right-4 bg-white rounded-xl shadow-lg px-4 py-3 flex items-center gap-2 border border-amber-100">
                <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                  <Lock size={16} className="text-amber-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-900">Escrow</p>
                  <p className="text-[10px] text-gray-400">Milestone-Based</p>
                </div>
              </div>

              {/* Floating badge: CRE Verified */}
              <div className="absolute bottom-4 right-12 bg-white rounded-xl shadow-lg px-4 py-3 flex items-center gap-2 border border-purple-100">
                <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                  <BarChart3 size={16} className="text-purple-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-900">CRE Verified</p>
                  <p className="text-[10px] text-gray-400">Chainlink</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
