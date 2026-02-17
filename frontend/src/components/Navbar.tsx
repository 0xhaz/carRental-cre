import Image from "next/image";
import NavItems from "./NavItems";
import Link from "next/link";

const Navbar = () => {
  return (
    <nav
      className={`flex items-center justify-between px-6 md:px-16 lg:px-24 xl:px-32 py-4 text-gray-600 border-b border-borderColor relative transition-all bg-light`}
    >
      <Link href="/">
        <Image src="/assets/logo.png" alt="Logo" className="h-8" width={120} height={32} />
      </Link>

      <div>
        <NavItems />
      </div>
    </nav>
  );
};

export default Navbar;
