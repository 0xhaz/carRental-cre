"use client";
import NavbarOwner from "@/components/NavbarOwner";
import Sidebar from "@/components/Sidebar";
import { useAppContext } from "@/context/AppContext";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Toaster } from "react-hot-toast";

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const { user, showLogin, setShowLogin, isOwner } = useAppContext();
  const router = useRouter();
  const params = useParams<{ id: string }>();

  useEffect(() => {
    if (!user) {
      setShowLogin(true);
      router.replace("/");
      return;
    }

    if (!isOwner) {
      router.replace("/");
      return;
    }

    if (!params?.id || params.id === "undefined" || params.id !== user._id) {
      router.replace(`/owner/${user._id}`);
    }
  }, [user, isOwner, params?.id]);
  return (
    <div className="min-h-screen flex flex-col">
      <NavbarOwner />

      <div className="flex flex-1">
        <Toaster />
        <Sidebar />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
};

export default DashboardLayout;
