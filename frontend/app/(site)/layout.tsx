"use client";
import Navbar from "@/components/Navbar";
import "../../app/globals.css";
import Footer from "@/components/Footer";
import { useState } from "react";
import { usePathname } from "next/navigation";
import LoginModal from "@/components/LoginModal";
import { Toaster } from "react-hot-toast";
import { useAppContext } from "@/context/AppContext";

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { showLogin, setShowLogin } = useAppContext();
  const isOwnerPath = usePathname().startsWith("/owner");

  const onClose = () => {
    setShowLogin(false);
  };
  return (
    <>
      <Toaster />
      {showLogin && <LoginModal onClose={onClose} />}
      {!isOwnerPath && <Navbar />}
      {children}
      {!isOwnerPath && <Footer />}
    </>
  );
}
