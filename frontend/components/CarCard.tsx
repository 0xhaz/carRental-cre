import { assets } from "@/public/assets/assets";
import Image from "next/image";
import Link from "next/link";

interface CarCardProps {
  car: any;
}

const CarCard = ({ car }: CarCardProps) => {
  const currency = process.env.NEXT_PUBLIC_CURRENCY || "$";
  return (
    <Link href={`/car-details/${car._id}`}>
      <div className="group rounded-xl overflow-hidden shadow-lg hover:-translate-y-1 transition-all duration-500 cursor-pointer">
        <div className="relative h-48 overflow-hidden">
          <Image
            src={car.image}
            alt="Car Image"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            width={400}
            height={300}
          />
          {car.isAvailable && (
            <p className="absolute top-4 left-4 bg-primary/90 text-white text-xs px-2.5 py-1 rounded-full">
              Available Now
            </p>
          )}

          <div className="absolute bottom-4 right-4 bg-black/80 backdrop-blur-sm text-white px-3 py-2 rounded-lg">
            <span className="font-semibold">
              {currency}
              {car.pricePerDay}
            </span>
            <span className="text-sm text-white/80"> / day</span>
          </div>
        </div>
        <div className="p-4 sm:p-5">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h3 className="text-lg font-medium">
                {car.brand} {car.model}
              </h3>
              <p className="text-muted-foreground text-sm">
                {car.category} · {car.year}{" "}
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-y-2 text-gray-600">
            <div className="flex items-center text-sm text-muted-foreground">
              <Image src={assets.users_icon} alt="" className="h-4 mr-2" />
              <span>{car.seating_capacity} Seats</span>
            </div>
            <div className="flex items-center text-sm text-muted-foreground">
              <Image src={assets.fuel_icon} alt="" className="h-4 mr-2" />
              <span>{car.fuel_type}</span>
            </div>
            <div className="flex items-center text-sm text-muted-foreground">
              <Image src={assets.car_icon} alt="" className="h-4 mr-2" />
              <span>{car.transmission}</span>
            </div>
            <div className="flex items-center text-sm text-muted-foreground">
              <Image src={assets.location_icon} alt="" className="h-4 mr-2" />
              <span>{car.location}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default CarCard;
