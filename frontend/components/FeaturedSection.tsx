"use client";
import Title from "./Title";
import CarCard from "./CarCard";
import { assets } from "@/public/assets/assets";
import Image from "next/image";
import Link from "next/link";
import { useAppContext } from "@/context/AppContext";

const FeaturedSection = () => {
  const { cars } = useAppContext();
  return (
    <div className="flex flex-col items-center py-24 px-6 md:px-16 lg:px-24 xl:px-32">
      <div>
        <Title
          title="Featured Vehicles"
          subtitle="Explore our selection of premium vehicles available for your next adventure."
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mt-18">
        {cars.slice(0, 6).map(car => (
          <div key={car._id}>
            <CarCard car={car} />
          </div>
        ))}
      </div>

      <Link href="/renter/browse" className="flex items-center justify-center gap-2 px-6 py-2 border border-borderColor hover:bg-gray-50 rounded-md mt-18 cursor-pointer">
        Explore All Cars
        <Image src={assets.arrow_icon} alt="Arrow" />
      </Link>
    </div>
  );
};

export default FeaturedSection;
