"use client";

import { usePathname } from "next/navigation";
import { Toaster } from "react-hot-toast";
import { Header, Footer, AuthModal } from "@/src/components/shared";
import { useAppContext } from "@/context/AppContext";

export default function RootLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const { showLogin, setShowLogin } = useAppContext();
  const pathname = usePathname();

  // Determine if we should show the public navbar/footer
  const isPublicRoute = pathname === "/" || pathname.startsWith("/onboarding");
  const isInvestorRoute = pathname.startsWith("/investor");
  const isRentorRoute = pathname.startsWith("/rentor");
  const isRenterRoute = pathname.startsWith("/renter");

  const onClose = () => {
    setShowLogin(false);
  };

  return (
    <>
      <Toaster position="top-center" />
      {showLogin && <AuthModal onClose={onClose} />}

      {/* Show public Header only on public routes */}
      {isPublicRoute && <Header />}

      {/* Main content */}
      {children}

      {/* Show Footer only on public routes */}
      {isPublicRoute && <Footer />}
    </>
  );
}
