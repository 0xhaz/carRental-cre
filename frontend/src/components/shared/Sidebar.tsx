"use client";

import { useMemo, useState, FormEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { assets, ownerMenuLinks } from "@/constants/menuLinks";
import { Button } from "@/components/ui";
import { useUserStore } from "@/store";
import { useAppContext } from "@/context/AppContext";
import { toast } from "react-hot-toast";

export interface SidebarProps {
  menuLinks?: Array<{
    name: string;
    path: string;
    icon: any;
    coloredIcon?: any;
  }>;
  basePath?: string;
}

export function Sidebar({ menuLinks = ownerMenuLinks, basePath }: SidebarProps) {
  const pathname = usePathname();
  const [image, setImage] = useState<File | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Use both Zustand and Context during migration
  const { user: zustandUser } = useUserStore();
  const { user: contextUser, axios, fetchUser } = useAppContext();

  const user = zustandUser || contextUser;
  const userId = user?._id;

  // Generate links with user ID
  const links = useMemo(() => {
    if (!userId) return [];

    const base = basePath || `/owner/${userId}`;

    return menuLinks.map((link) => ({
      ...link,
      path: link.path ? `${base}${link.path}` : base,
    }));
  }, [userId, basePath, menuLinks]);

  const updateImage = async (e: FormEvent) => {
    e.preventDefault();
    if (!image) return;

    setIsUploadingImage(true);

    try {
      const formData = new FormData();
      formData.append("image", image);

      const { data } = await axios.post("/api/rentor/update-image", formData);

      if (data.success) {
        await fetchUser();
        toast.success("Profile image updated successfully");
        setImage(null);
      } else {
        toast.error(data.message || "Failed to update image");
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update image.";
      toast.error(message);
    } finally {
      setIsUploadingImage(false);
    }
  };

  return (
    <aside className="relative min-h-screen md:flex flex-col items-center pt-8 max-w-13 md:max-w-60 w-full border-r border-borderColor text-sm bg-white">
      {/* Profile Image */}
      <div className="group relative">
        <label htmlFor="sidebar-image" className="cursor-pointer">
          <Image
            src={user?.image ?? assets.upload_icon}
            alt={user?.name || "User"}
            className="h-9 md:h-14 w-9 md:w-14 rounded-full mx-auto object-cover"
            width={56}
            height={56}
          />
          <input
            type="file"
            id="sidebar-image"
            accept="image/*"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0] || null;
              setImage(file);
            }}
          />
          <div className="absolute hidden top-0 right-0 left-0 bottom-0 bg-black/10 rounded-full group-hover:flex items-center justify-center">
            <Image src={assets.edit_icon} alt="Edit" width={20} height={20} />
          </div>
        </label>
      </div>

      {/* Save Image Button */}
      {image && (
        <Button
          size="sm"
          onClick={updateImage}
          isLoading={isUploadingImage}
          className="absolute top-0 right-0 m-2"
        >
          Save
        </Button>
      )}

      {/* User Name */}
      <p className="mt-2 text-base font-medium max-md:hidden">{user?.name}</p>

      {/* Navigation Links */}
      <nav className="w-full mt-6">
        {links.map((link, index) => {
          const isDashboard = !link.path.includes("/");
          const active = isDashboard
            ? pathname === link.path
            : pathname === link.path || pathname.startsWith(link.path + "/");

          return (
            <Link
              key={index}
              href={link.path}
              className={`relative flex items-center gap-2 w-full py-3 pl-4 transition-colors ${
                active
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <Image
                src={active && link.coloredIcon ? link.coloredIcon : link.icon}
                alt={link.name}
                className="inline-block mr-3 w-5 h-5"
              />
              <span className="max-md:hidden">{link.name}</span>
              <div
                className={`${
                  active ? "bg-primary" : ""
                } w-1.5 h-8 rounded-l right-0 absolute`}
              />
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
