import { Title, Card } from "@/components/ui";
import { assets } from "@/constants/menuLinks";
import Image from "next/image";

const testimonials = [
  {
    name: "Emma Rodriguez",
    location: "Barcelona, Spain",
    image: assets.testimonial_image_1,
    testimonial:
      "Exceptional service and attention to detail. Everything was handled professionally and efficiently from start to finish. Highly recommended!",
    rating: 5,
  },
  {
    name: "Liam Johnson",
    location: "New York, USA",
    image: assets.testimonial_image_2,
    testimonial:
      "I'm truly impressed by the quality and consistency. The entire process was smooth, and the results exceeded all expectations. Thank you!",
    rating: 5,
  },
  {
    name: "Sophia Lee",
    location: "Seoul, South Korea",
    image: assets.testimonial_image_1,
    testimonial:
      "Fantastic experience! From start to finish, the team was professional, responsive, and genuinely cared about delivering great results.",
    rating: 5,
  },
];

export function Testimonial() {
  return (
    <section className="py-28 px-6 md:px-16 lg:px-24 xl:px-44">
      <Title
        title="What Our Customers Say"
        subtitle="Hear from our satisfied clients about their experiences with our services."
        align="center"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mt-12">
        {testimonials.map((testimonial, index) => (
          <Card
            key={index}
            className="p-6 hover:-translate-y-1 hover:shadow-xl transition-all duration-500"
          >
            {/* User Info */}
            <div className="flex items-center gap-3 mb-4">
              <Image
                className="w-12 h-12 rounded-full object-cover"
                src={testimonial.image}
                alt={testimonial.name}
                width={48}
                height={48}
              />
              <div>
                <p className="text-xl font-semibold text-gray-900">
                  {testimonial.name}
                </p>
                <p className="text-sm text-gray-500">{testimonial.location}</p>
              </div>
            </div>

            {/* Rating */}
            <div className="flex items-center gap-1 mb-4">
              {Array.from({ length: testimonial.rating }).map((_, i) => (
                <Image
                  key={i}
                  src={assets.star_icon}
                  alt="star"
                  className="w-5 h-5"
                  width={20}
                  height={20}
                />
              ))}
            </div>

            {/* Testimonial Text */}
            <p className="text-gray-600 font-light leading-relaxed">
              "{testimonial.testimonial}"
            </p>
          </Card>
        ))}
      </div>
    </section>
  );
}
