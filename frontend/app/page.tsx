import Hero from "@/components/Hero";
import FeaturedSection from "@/components/FeaturedSection";
import Banner from "@/components/Banner";
import PlatformFeatures from "@/components/landing/PlatformFeatures";
import TokenLifecycle from "@/components/landing/TokenLifecycle";
import CTASection from "@/components/landing/CTASection";

export default function Home() {
  return (
    <>
      <Hero />
      <FeaturedSection />
      <Banner />
      <PlatformFeatures />
      <TokenLifecycle />
      <CTASection />
    </>
  );
}
