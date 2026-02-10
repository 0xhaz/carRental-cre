"use client";
import Hero from "@/components/Hero";
import CarCard from "@/components/CarCard";
import FeaturedSection from "@/components/FeaturedSection";
import Banner from "@/components/Banner";
import Testimonial from "@/components/Testimonial";
import Newsletter from "@/components/Newsletter";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { Toaster } from "react-hot-toast";

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
