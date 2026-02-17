import Link from "next/link";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Badge,
} from "@/components/ui";
import { TrendingUp, Car, Key, CheckCircle } from "lucide-react";

const roles = [
  {
    icon: <TrendingUp className="text-primary" size={28} />,
    badge: "Earn Returns",
    title: "Investor",
    description:
      "Fund vehicle purchases and earn passive income from rental revenue.",
    benefits: [
      "Invest ETH in tokenized vehicle campaigns",
      "Receive ERC-3643 AssetTokens + RevenueTokens",
      "Earn 50% of rental revenue quarterly",
      "Trade tokens on compliant secondary markets",
    ],
    ctaText: "Explore Investments",
    ctaLink: "/investor/marketplace",
    accentColor: "bg-primary",
    primary: true,
  },
  {
    icon: <Car className="text-green-600" size={28} />,
    badge: "Operate & Earn",
    title: "Rentor (Vehicle Owner)",
    description:
      "List vehicles, raise capital through tokenized campaigns, and manage your fleet.",
    benefits: [
      "Mint VehicleNFT for each listed vehicle",
      "Raise capital via investor-backed campaigns",
      "Earn 10% operator fee on all bookings",
      "Milestone-verified acquisition process",
    ],
    ctaText: "List a Vehicle",
    ctaLink: "/rentor",
    accentColor: "bg-green-500",
    primary: false,
  },
  {
    icon: <Key className="text-amber-600" size={28} />,
    badge: "Drive & Experience",
    title: "Renter",
    description:
      "Browse verified vehicles and book short-term rentals with crypto payments.",
    benefits: [
      "Browse compliance-verified vehicle fleet",
      "Pay securely in ETH via smart contracts",
      "OnchainID-based identity verification",
      "Transparent pricing with no hidden fees",
    ],
    ctaText: "Browse Vehicles",
    ctaLink: "/renter/browse",
    accentColor: "bg-amber-500",
    primary: false,
  },
];

const Banner = () => {
  return (
    <section className="py-24 px-6 md:px-16 lg:px-24 xl:px-32 bg-white">
      <div className="text-center mb-16">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
          Three Roles, One Platform
        </h2>
        <p className="text-gray-500 text-lg max-w-2xl mx-auto">
          Whether you invest, operate, or rent — RegShield has you covered.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {roles.map((role) => (
          <Card
            key={role.title}
            className="p-0 overflow-hidden hover:-translate-y-1 transition-all duration-300"
          >
            {/* Colored top accent bar */}
            <div className={`h-1.5 ${role.accentColor}`} />

            <CardHeader className="pt-8">
              <div className="w-14 h-14 rounded-xl bg-blue-50 flex items-center justify-center mb-4">
                {role.icon}
              </div>
              <Badge variant="primary" className="w-fit mb-2">
                {role.badge}
              </Badge>
              <CardTitle>{role.title}</CardTitle>
              <CardDescription className="mt-2">
                {role.description}
              </CardDescription>
            </CardHeader>

            <CardContent>
              <ul className="space-y-3">
                {role.benefits.map((benefit) => (
                  <li
                    key={benefit}
                    className="flex items-start gap-2 text-sm text-gray-600"
                  >
                    <CheckCircle
                      size={16}
                      className="text-green-500 mt-0.5 shrink-0"
                    />
                    {benefit}
                  </li>
                ))}
              </ul>
            </CardContent>

            <CardFooter>
              <Link href={role.ctaLink} className="w-full">
                <Button
                  variant={role.primary ? "default" : "outline"}
                  className="w-full"
                >
                  {role.ctaText}
                </Button>
              </Link>
            </CardFooter>
          </Card>
        ))}
      </div>
    </section>
  );
};

export default Banner;
