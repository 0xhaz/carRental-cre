import { assets } from "@/public/assets/assets";
import Image from "next/image";
import React from "react";

const Banner = () => {
  return (
    <div className="flex flex-col md:flex-row md:items-start items-center justify-between px-8 md:pl-14 pt-10 bg-linear-to-r from-[#0558fe] to-[#a9cfff] max-w-6xl mx-3 md:mx-auto rounded-2xl overflow-hidden">
      <div className="text-white">
        <h2 className="text-3xl font-medium">Do You Own a Luxury Car?</h2>
        <p className="mt-2">
          Monetize your vehicle effortlessly by listing it on CarRental
        </p>
        <p className="max-w-100">
          We take care of insurance, driver verfication and secure payments - so
          you can earn passive income, stress-free
        </p>
        <button className="px-6 py-2 bg-white hover:bg-slate-100 transition-all text-primary rounded-lg text-sm mt-4 cursor-pointer">
          List Your Car
        </button>
      </div>
      <Image
        src={assets.banner_car_image}
        alt="Banner Car"
        className="max-h-70 mt-10"
      />
    </div>
  );
};

export default Banner;
