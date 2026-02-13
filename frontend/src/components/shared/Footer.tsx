import { assets } from "@/constants/menuLinks";
import Image from "next/image";
import Link from "next/link";
import { Separator } from "@/components/ui";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="px-6 md:px-16 lg:px-24 xl:px-32 mt-60 text-sm text-gray-500">
      <div className="flex flex-wrap justify-between items-start gap-8 pb-6">
        {/* Brand Section */}
        <div className="max-w-xs">
          <Image
            src={assets.logo}
            alt="RegShield Logo"
            className="mb-4 h-8 md:h-9"
            width={72}
            height={36}
          />
          <p className="mt-3 text-gray-600">
            Premium car rental service with a wide selection of luxury and
            everyday vehicles for all your driving needs.
          </p>
          <div className="flex items-center gap-3 mt-6">
            <Link href="#" aria-label="Facebook">
              <Image
                src={assets.facebook_logo}
                alt="Facebook"
                className="h-5 w-5 hover:opacity-70 transition-opacity"
                width={20}
                height={20}
              />
            </Link>
            <Link href="#" aria-label="Instagram">
              <Image
                src={assets.instagram_logo}
                alt="Instagram"
                className="h-5 w-5 hover:opacity-70 transition-opacity"
                width={20}
                height={20}
              />
            </Link>
            <Link href="#" aria-label="Twitter">
              <Image
                src={assets.twitter_logo}
                alt="Twitter"
                className="h-5 w-5 hover:opacity-70 transition-opacity"
                width={20}
                height={20}
              />
            </Link>
            <Link href="#" aria-label="Email">
              <Image
                src={assets.gmail_logo}
                alt="Gmail"
                className="h-5 w-5 hover:opacity-70 transition-opacity"
                width={20}
                height={20}
              />
            </Link>
          </div>
        </div>

        {/* Quick Links */}
        <div>
          <h2 className="text-base font-medium text-gray-800 uppercase mb-3">
            Quick Links
          </h2>
          <ul className="flex flex-col gap-1.5">
            <li>
              <Link href="/" className="hover:text-primary transition-colors">
                Home
              </Link>
            </li>
            <li>
              <Link
                href="/renter/browse"
                className="hover:text-primary transition-colors"
              >
                Browse Cars
              </Link>
            </li>
            <li>
              <Link
                href="/rentor"
                className="hover:text-primary transition-colors"
              >
                List Your Car
              </Link>
            </li>
            <li>
              <Link
                href="/investor/marketplace"
                className="hover:text-primary transition-colors"
              >
                Invest
              </Link>
            </li>
          </ul>
        </div>

        {/* Resources */}
        <div>
          <h2 className="text-base font-medium text-gray-800 uppercase mb-3">
            Resources
          </h2>
          <ul className="flex flex-col gap-1.5">
            <li>
              <Link href="#" className="hover:text-primary transition-colors">
                Help Center
              </Link>
            </li>
            <li>
              <Link href="#" className="hover:text-primary transition-colors">
                Terms of Service
              </Link>
            </li>
            <li>
              <Link href="#" className="hover:text-primary transition-colors">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link href="#" className="hover:text-primary transition-colors">
                Insurance
              </Link>
            </li>
          </ul>
        </div>

        {/* Contact */}
        <div>
          <h2 className="text-base font-medium text-gray-800 uppercase mb-3">
            Contact
          </h2>
          <ul className="flex flex-col gap-1.5">
            <li>1234 Luxury Drive</li>
            <li>San Francisco, CA 94107</li>
            <li>+1 (555) 123-4567</li>
            <li>info@regshield.com</li>
          </ul>
        </div>
      </div>

      <Separator className="my-6" />

      {/* Copyright */}
      <div className="flex flex-col md:flex-row gap-2 items-center justify-between py-5">
        <p>
          © {currentYear}{" "}
          <Link href="/" className="hover:text-primary transition-colors">
            RegShield
          </Link>
          . All rights reserved.
        </p>
        <ul className="flex items-center gap-4">
          <li>
            <Link href="#" className="hover:text-primary transition-colors">
              Privacy
            </Link>
          </li>
          <li>|</li>
          <li>
            <Link href="#" className="hover:text-primary transition-colors">
              Terms
            </Link>
          </li>
          <li>|</li>
          <li>
            <Link href="#" className="hover:text-primary transition-colors">
              Cookies
            </Link>
          </li>
        </ul>
      </div>
    </footer>
  );
}
