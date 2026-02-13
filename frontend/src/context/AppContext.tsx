"use client";
import { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";

axios.defaults.baseURL = process.env.NEXT_PUBLIC_BASE_URL;

type AppContextType = {
  router: ReturnType<typeof useRouter>;
  currency: string | undefined;
  axios: typeof axios;
  user: any;
  setUser: (user: any) => void;
  token: string | null;
  setToken: (token: string | null) => void;
  isOwner: boolean;
  setIsOwner: (isOwner: boolean) => void;
  fetchUser: () => Promise<void>;
  showLogin: boolean;
  setShowLogin: (value: boolean) => void;
  logout: () => void;
  fetchCars: () => Promise<void>;
  cars: any[];
  setCars: (cars: any[]) => void;
  pickupDate: string;
  setPickupDate: (date: string) => void;
  returnDate: string;
  setReturnDate: (date: string) => void;
  loadingUser: boolean;
};

export const AppContext = createContext<AppContextType>({} as AppContextType);

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const currency = process.env.NEXT_PUBLIC_CURRENCY;
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [isOwner, setIsOwner] = useState<boolean>(false);
  const [showLogin, setShowLogin] = useState<boolean>(false);
  const [pickupDate, setPickupDate] = useState<string>("");
  const [returnDate, setReturnDate] = useState<string>("");
  const [cars, setCars] = useState<any[]>([]);
  const [loadingUser, setLoadingUser] = useState<boolean>(true);

  // Function to check if user is logged in
  const fetchUser = async () => {
    try {
      setLoadingUser(true);
      const { data } = await axios.get("/api/user/data");

      if (data.success) {
        setUser(data.user);
        setIsOwner(data.user.role === "owner");
      } else {
        router.push("/");
        setUser(null);
      }
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        toast.error(error.message);
      } else {
        toast.error("An unexpected error occurred.");
      }
    } finally {
      setLoadingUser(false);
    }
  };

  // Function to fetch all cars
  const fetchCars = async () => {
    try {
      const { data } = await axios.get("/api/user/cars");
      data.success ? setCars(data.cars) : toast.error(data.message);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error(error.message);
      } else {
        toast.error("An unexpected error occurred.");
      }
    }
  };

  // Function to log out user
  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
    setIsOwner(false);
    axios.defaults.headers.common["Authorization"] = "";
    // Toast is handled by the component calling this function
  };

  // retrieve the token from localStorage on initial load
  useEffect(() => {
    const token = localStorage.getItem("token");
    setToken(token);
    fetchCars();
  }, []);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common["Authorization"] = `${token}`;
      fetchUser();
    }
  }, [token]);

  const value = {
    router,
    currency,
    axios,
    user,
    setUser,
    token,
    setToken,
    isOwner,
    setIsOwner,
    fetchUser,
    showLogin,
    setShowLogin,
    logout,
    fetchCars,
    cars,
    setCars,
    pickupDate,
    setPickupDate,
    returnDate,
    setReturnDate,
    loadingUser,
  };
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
  return useContext(AppContext);
};
