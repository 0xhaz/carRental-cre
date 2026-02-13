"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Card } from "@/components/ui";
import { useUserStore } from "@/store";
import { useAppContext } from "@/context/AppContext";
import { toast } from "react-hot-toast";

export interface AuthModalProps {
  onClose: () => void;
  defaultState?: "login" | "register";
}

export function AuthModal({ onClose, defaultState = "login" }: AuthModalProps) {
  const [state, setState] = useState<"login" | "register">(defaultState);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();

  // Use both Zustand and Context during migration
  const { setUser: setZustandUser, setToken: setZustandToken } = useUserStore();
  const { setShowLogin, axios, setToken } = useAppContext();

  const onSubmitHandler = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data } = await axios.post(`/api/user/${state}`, {
        name,
        email,
        password,
      });

      if (data.success) {
        // Update both Zustand and Context stores during migration
        setZustandUser(data.user);
        setZustandToken(data.token);
        setToken(data.token);
        localStorage.setItem("token", data.token);

        toast.success(state === "login" ? "Successfully logged in!" : "Account created successfully!");

        setShowLogin(false);
        onClose();

        // Redirect based on user role
        const userRole = data.user?.role;

        // If user doesn't have a role or is a new registration, go to onboarding
        if (!userRole || state === "register") {
          router.push("/onboarding");
        } else {
          // Redirect to appropriate portal based on role
          switch (userRole) {
            case "investor":
              router.push("/investor/dashboard");
              break;
            case "rentor":
              router.push("/rentor/dashboard");
              break;
            case "renter":
              router.push("/renter/browse");
              break;
            default:
              router.push("/");
          }
        }
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Something went wrong";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackdropClick = () => {
    if (!isLoading) {
      onClose();
    }
  };

  return (
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
    >
      <Card
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md p-8 relative"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isLoading}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 transition-colors disabled:opacity-50"
          aria-label="Close"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {/* Title */}
        <h2 className="text-2xl font-semibold text-center mb-6">
          <span className="text-primary">User</span>{" "}
          {state === "login" ? "Login" : "Sign Up"}
        </h2>

        {/* Form */}
        <form onSubmit={onSubmitHandler} className="space-y-4">
          {state === "register" && (
            <Input
              label="Name"
              type="text"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={isLoading}
            />
          )}

          <Input
            label="Email"
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isLoading}
          />

          <Input
            label="Password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isLoading}
          />

          {/* Toggle State */}
          <p className="text-sm text-gray-600">
            {state === "register" ? (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => setState("login")}
                  className="text-primary hover:underline"
                  disabled={isLoading}
                >
                  Login here
                </button>
              </>
            ) : (
              <>
                Don't have an account?{" "}
                <button
                  type="button"
                  onClick={() => setState("register")}
                  className="text-primary hover:underline"
                  disabled={isLoading}
                >
                  Sign up here
                </button>
              </>
            )}
          </p>

          {/* Submit Button */}
          <Button type="submit" className="w-full" isLoading={isLoading}>
            {state === "register" ? "Create Account" : "Login"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
