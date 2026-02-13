"use client";
import Hero from "@/components/Hero";
import FeaturedSection from "@/components/FeaturedSection";
import Banner from "@/components/Banner";
import { Testimonial } from "@/components/shared";
import { Newsletter } from "@/components/shared";

export default function Home() {
  return (
    <>
      <Hero />
      <FeaturedSection />
      <Banner />
      <Testimonial />
      <Newsletter />
    </>
  );
}
