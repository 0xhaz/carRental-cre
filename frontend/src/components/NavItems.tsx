"use client";
import { useAppContext } from "@/context/AppContext";
import { assets, menuLinks } from "@/constants/menuLinks";
import Image from "next/image";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState, type Dispatch, type SetStateAction } from "react";
import { toast } from "react-hot-toast";

interface NavItemsProps {
  setShowLogin: (value: boolean) => void;
}

const NavItems = () => {
  const location = usePathname();
  const [open, setOpen] = useState(false);
  const isOwnerPath = location.startsWith("/owner") || location.startsWith("/rentor");
  const router = useRouter();

  const { setShowLogin, user, logout, isOwner, axios, setIsOwner } =
    useAppContext();

  const ownerId = user?._id;

  const changeRole = async () => {
    try {
      const { data } = await axios.post("/api/owner/change-role");

      if (!data.success) {
        toast.error(data.message);
        return false;
      }

      setIsOwner(true);
      toast.success(data.message);
      return true;
    } catch (error: any) {
      toast.error(error?.message ?? "An unexpected error occurred.");
      return false;
    }
  };

  const handleOwnerCta = async () => {
    setOpen(false);

    if (!user) {
      setShowLogin(true);
      return;
    }

    if (!isOwner) {
      const ok = await changeRole();
      if (!ok) return;
    }

    if (!ownerId) {
      toast.error("Missing user Id, please login again.");
      return;
    }

    // Navigate to new rentor portal instead of old owner portal
    router.push(`/rentor`);
  };

  return (
    <div className="flex items-center gap-4">
      <nav
        className={`max-sm:fixed max-sm:h-screen max-sm:w-full max-sm:top-16 max-sm:border-t border-borderColor right-0 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-8 max-sm:p-4 transition-all duration-300 z-50  ${open ? "max-sm:translate-x-0" : "max-sm:translate-x-full"}`}
      >
        {menuLinks.map(link => {
          const isActive =
            location === link.path || location.startsWith(link.path + "/");

          return (
            <Link
              key={link.path}
              href={link.path}
              onClick={() => setOpen(false)}
              className={`transition-colors
              ${isActive ? "text-gray-900 font-semibold" : "text-gray-600"}`}
            >
              {link.name}
            </Link>
          );
        })}

        <div className="hidden lg:flex items-center text-sm gap-2 border border-borderColor px-3 rounded-full max-w-56">
          <input
            type="text"
            className="py-1.5 w-full bg-transparent outline-none placeholder-gray-500"
            placeholder="Search products"
          />

          <Image src={assets.search_icon} alt="Search" />
        </div>

        <div className="flex max-sm:flex-col items-start sm:items-center gap-6">
          <button className="cursor-pointer" onClick={handleOwnerCta}>
            {isOwner ? "Dashboard" : "List Cars"}
          </button>

          <button
            onClick={() => {
              user ? logout() : setShowLogin(true);
              setOpen(false);
            }}
            className="cursor-pointer px-8 py-2 bg-primary hover:bg-primary-dull transition-all text-white rounded-lg"
          >
            {user ? "Logout" : "Login"}
          </button>
        </div>
      </nav>

      {/* Mobile Menu Toggle Button */}
      <button
        className="sm:hidden cursor-pointer"
        aria-label="Menu"
        onClick={() => setOpen(!open)}
      >
        <Image src={open ? assets.close_icon : assets.menu_icon} alt="Menu" />
      </button>

      {/* Mobile drawer */}
      <nav
        className={`sm:hidden fixed top-16 right-0 h-screen w-full border-t border-borderColor
        flex flex-col items-start gap-4 p-4 transition-all duration-300 z-50
        
        ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        {menuLinks.map(link => {
          const isActive =
            location === link.path || location.startsWith(link.path + "/");

          return (
            <Link
              key={link.path}
              href={link.path}
              onClick={() => setOpen(false)}
              className={`transition-colors ${
                isActive
                  ? "text-gray-900 font-semibold bg-light"
                  : "text-gray-600 bg-white"
              }`}
            >
              {link.name}
            </Link>
          );
        })}

        {/* Mobile extras */}
        {!isOwnerPath && (
          <button
            type="button"
            onClick={handleOwnerCta}
            className="cursor-pointer"
          >
            {isOwner ? "Dashboard" : "List Cars"}
          </button>
        )}

        <button
          onClick={() => {
            setShowLogin(true);
            setOpen(false);
          }}
          className="cursor-pointer px-8 py-2 bg-primary hover:bg-primary-dull transition-all text-white rounded-lg"
        >
          Login
        </button>
      </nav>
    </div>
  );
};

export default NavItems;
