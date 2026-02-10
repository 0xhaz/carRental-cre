"use client";
import { useAppContext } from "@/context/AppContext";
import { assets, ownerMenuLinks } from "@/public/assets/assets";
import Image from "next/image";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";

import React, { useMemo, useState } from "react";
import toast from "react-hot-toast";

const Sidebar = () => {
  const location = usePathname();
  const [image, setImage] = useState<File | "">("");
  const { user, axios, fetchUser, loadingUser } = useAppContext();
  const ownerId = user?._id;

  const links = useMemo(() => {
    if (!ownerId) return [];
    return ownerMenuLinks.map(link => ({
      ...link,
      path: `/owner/${ownerId}${link.path}`,
    }));
  }, [ownerId]);

  const updateImage = async () => {
    try {
      const formData = new FormData();
      formData.append("image", image as Blob);

      const { data } = await axios.post("/api/owner/update-image", formData);

      if (data.success) {
        fetchUser();
        toast.success(data.message);
        setImage("");
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update image.";
      toast.error(message);
    }
  };

  return (
    <div className="relative min-h-screen md:flex flex-col items-center pt-8 max-w-13 md:max-w-60 w-full border-r border-borderColor text-sm">
      <div className="group relative">
        <label htmlFor="image">
          <Image
            src={user?.image ?? assets.upload_icon}
            alt="User Image"
            className="h-9 md:h-14 w-9 md:w-14 rounded-full mx-auto"
            width={40}
            height={40}
          />
          <input
            type="file"
            id="image"
            accept="image/*"
            hidden
            onChange={e => {
              const file = e.target.files?.[0] ?? null;
              setImage(file || "");
            }}
          />
          <div className="absolute hidden top-0 right-0 left-0 bottom-0 bg-black/10 rounded-full group-hover:flex items-center justify-center cursor-pointer">
            <Image src={assets.edit_icon} alt="Edit" />
          </div>
        </label>
      </div>
      {image && (
        <button
          className="absolute top-0 right-0 flex p-2 gap-1 bg-primary/10 text-primary cursor-pointer"
          onClick={updateImage}
        >
          Save <Image src={assets.check_icon} alt="Check" width={13} />
        </button>
      )}
      <p className="mt-2 text-base max-md:hidden">{user?.name}</p>

      <div className="w-full">
        {links.map((link, index) => {
          const isDashboard = link.path === `/owner/${ownerId}`;
          const active = isDashboard
            ? location === link.path
            : location === link.path || location.startsWith(link.path + "/");

          return (
            <Link
              key={index}
              href={link.path}
              className={`relative flex items-center gap-2 w-full py-3 pl-4 first:mt-6 ${
                active ? "bg-primary/10 text-primary" : "text-gray-600"
              }`}
            >
              <Image
                src={link.icon}
                alt={link.name}
                className="inline-block mr-3"
              />
              <span className="max-md:hidden">{link.name} </span>
              <div
                className={`${active ? "bg-primary" : ""} w-1.5 h-8 rounded-l right-0 absolute`}
              />
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default Sidebar;
