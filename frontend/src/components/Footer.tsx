import { assets } from "@/constants/menuLinks";
import Image from "next/image";
import Link from "next/link";

const Footer = () => {
  return (
    <div className="px-6 md:px-16 lg:px-24 xl:px-32 mt-60 text-sm text-gray-500">
      <div className="flex flex-wrap justify-between items-start gap-8 pb-6 border-borderColor border-b">
        <div>
          <Image src={assets.logo} alt="logo" className="mb-4 h-8 md:h-9" />
          <p className="max-w-80 mt-3">
            Premium car rental service with a wide selection of luxury and
            everyday vehicles for all your driving needs.
          </p>
          <div className="flex items-center gap-3 mt-6">
            <Link href="#">
              <Image
                src={assets.facebook_logo}
                alt="Facebook"
                className="h-5 w-5"
              />
            </Link>
            <Link href="#">
              <Image
                src={assets.instagram_logo}
                alt="Instagram"
                className="h-5 w-5"
              />
            </Link>
            <Link href="#">
              <Image
                src={assets.twitter_logo}
                alt="Twitter"
                className="h-5 w-5"
              />
            </Link>
            <Link href="#">
              <Image src={assets.gmail_logo} alt="Gmail" className="h-5 w-5" />
            </Link>
          </div>
        </div>

        <div>
          <h2 className="text-base font-medium text-gray-800 uppercase">
            Quick Links
          </h2>
          <ul className="mt-3 flex flex-col gap-1.5 ">
            <li>
              <Link href="/">Home</Link>
            </li>
            <li>
              <Link href="/cars">Browse Cars</Link>
            </li>
            <li>
              <Link href="#">List Your Car</Link>
            </li>
            <li>
              <Link href="#">About Us</Link>
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-base font-medium text-gray-800 uppercase">
            Resources
          </h2>
          <ul className="mt-3 flex flex-col gap-1.5 ">
            <li>
              <Link href="#">Help Center</Link>
            </li>
            <li>
              <Link href="#">Terms of Service</Link>
            </li>
            <li>
              <Link href="#">Privacy Policy</Link>
            </li>
            <li>
              <Link href="#">Insurance</Link>
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-base font-medium text-gray-800 uppercase">
            Contact
          </h2>
          <ul className="mt-3 flex flex-col gap-1.5 ">
            <li>1234 Luxury Drive</li>
            <li>San Francisco, CA 94107</li>
            <li>+1 (555) 123-4567</li>
            <li>info@example.com</li>
          </ul>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-2 items-center justify-between py-5">
        <p>
          © {new Date().getFullYear()} <a href="#">CarRental</a>. All rights
          reserved.
        </p>
        <ul className="flex items-center gap-4">
          <li>
            <Link href="#">Privacy</Link>
          </li>
          <li> | </li>
          <li>
            <Link href="#">Terms</Link>
          </li>
          <li> | </li>
          <li>
            <Link href="#">Cookies</Link>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default Footer;
