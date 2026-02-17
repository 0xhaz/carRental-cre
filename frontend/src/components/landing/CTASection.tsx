import Link from "next/link";
import { Button } from "@/components/ui";
import { ArrowRight } from "lucide-react";

export default function CTASection() {
  return (
    <section className="py-24 px-6 md:px-16 lg:px-24 xl:px-32">
      <div className="max-w-4xl mx-auto bg-gradient-to-br from-primary to-blue-700 rounded-2xl p-12 md:p-16 text-center text-white">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">
          Ready to Get Started?
        </h2>
        <p className="text-blue-100 text-lg mb-10 max-w-2xl mx-auto">
          Join the future of vehicle ownership. Whether you&apos;re looking to
          invest, list your vehicles, or rent — RegShield has a place for you.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/investor/marketplace">
            <Button
              size="lg"
              className="bg-white text-primary hover:bg-blue-50 gap-2"
            >
              Start Investing <ArrowRight size={18} />
            </Button>
          </Link>
          <Link href="/rentor">
            <Button
              size="lg"
              variant="outline"
              className="border-white text-white hover:bg-white/10"
            >
              List a Vehicle
            </Button>
          </Link>
          <Link href="/renter/browse">
            <Button
              size="lg"
              variant="outline"
              className="border-white text-white hover:bg-white/10"
            >
              Browse Rentals
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
