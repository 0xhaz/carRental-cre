import {
  Car,
  Users,
  Wallet,
  BarChart3,
  Coins,
  Search,
  CheckCircle,
  PiggyBank,
} from "lucide-react";

const stats = [
  { icon: <Car className="text-primary" size={24} />, value: "142", label: "Vehicles Tokenized" },
  { icon: <Wallet className="text-primary" size={24} />, value: "3,850 ETH", label: "Total Invested" },
  { icon: <Users className="text-primary" size={24} />, value: "1,240+", label: "Active Investors" },
  { icon: <BarChart3 className="text-primary" size={24} />, value: "98.5%", label: "Milestone Success Rate" },
];

const steps = [
  {
    icon: <Coins className="text-primary" size={24} />,
    title: "Invest",
    description:
      "Choose a vehicle campaign and invest ETH. Funds held securely in PaymentEscrow.",
  },
  {
    icon: <Search className="text-primary" size={24} />,
    title: "CRE Verifies",
    description:
      "Chainlink CRE automatically verifies VIN, purchase, insurance, and registration milestones.",
  },
  {
    icon: <CheckCircle className="text-primary" size={24} />,
    title: "Tokens Minted",
    description:
      "Upon milestone completion, receive ERC-3643 AssetTokens (ownership) and RevenueTokens (income rights).",
  },
  {
    icon: <PiggyBank className="text-primary" size={24} />,
    title: "Earn Revenue",
    description:
      "Vehicle generates rental income. Revenue distributed to token holders quarterly via waterfall.",
  },
];

const FeaturedSection = () => {
  return (
    <>
      {/* Stats Bar */}
      <section className="bg-light border-y border-borderColor">
        <div className="px-6 md:px-16 lg:px-24 xl:px-32 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center max-w-5xl mx-auto">
            {stats.map((stat) => (
              <div key={stat.label}>
                <div className="flex items-center justify-center mb-2">
                  {stat.icon}
                </div>
                <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 px-6 md:px-16 lg:px-24 xl:px-32">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            How It Works
          </h2>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto">
            From investment to revenue in four verified steps
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative max-w-5xl mx-auto">
          {/* Connecting line (desktop only) */}
          <div className="hidden md:block absolute top-6 left-[12.5%] right-[12.5%] h-0.5 bg-borderColor" />

          {steps.map((step, i) => (
            <div
              key={step.title}
              className="flex flex-col items-center text-center relative"
            >
              {/* Step number circle */}
              <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center text-lg font-semibold mb-4 relative z-10">
                {i + 1}
              </div>

              {/* Icon */}
              <div className="w-16 h-16 rounded-xl bg-blue-50 flex items-center justify-center mb-4">
                {step.icon}
              </div>

              <h3 className="font-semibold text-gray-900 mb-2">
                {step.title}
              </h3>
              <p className="text-sm text-gray-500 max-w-48">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
};

export default FeaturedSection;
