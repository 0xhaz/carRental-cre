import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { User, UserRole } from "@/types";
import { authApi, type LoginCredentials, type RegisterData } from "@/lib/api";
import { toast } from "react-hot-toast";

interface UserState {
  // State
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isHydrated: boolean;
  error: string | null;

  // Actions
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  loginUser: (credentials: LoginCredentials) => Promise<void>;
  registerUser: (userData: RegisterData) => Promise<void>;
  fetchUserData: () => Promise<void>;
  updateRole: (role: UserRole) => Promise<void>;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;

  // Computed
  getRole: () => UserRole | null;
  isInvestor: () => boolean;
  isRentor: () => boolean;
  isRenter: () => boolean;
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      // Initial State
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      isHydrated: false,
      error: null,

      // Actions
      setUser: (user) =>
        set({
          user,
          isAuthenticated: !!user,
        }),

      setToken: (token) => {
        set({ token });
        if (token) {
          localStorage.setItem("token", token);
        } else {
          localStorage.removeItem("token");
        }
      },

      loginUser: async (credentials) => {
        try {
          set({ isLoading: true, error: null });
          const response = await authApi.login(credentials);

          set({
            user: response.user,
            token: response.token,
            isAuthenticated: true,
            isLoading: false,
          });

          localStorage.setItem("token", response.token);
          toast.success("Logged in successfully!");
        } catch (error: any) {
          set({ isLoading: false, error: error.message });
          throw error;
        }
      },

      registerUser: async (userData) => {
        try {
          set({ isLoading: true, error: null });
          const response = await authApi.register(userData);

          set({
            user: response.user,
            token: response.token,
            isAuthenticated: true,
            isLoading: false,
          });

          localStorage.setItem("token", response.token);
          toast.success("Registration successful!");
        } catch (error: any) {
          set({ isLoading: false, error: error.message });
          throw error;
        }
      },

      fetchUserData: async () => {
        try {
          set({ isLoading: true, error: null });
          const response = await authApi.getUserData();

          set({
            user: response.user,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.message,
            user: null,
            token: null,
            isAuthenticated: false,
          });
          localStorage.removeItem("token");
          throw error;
        }
      },

      updateRole: async (role) => {
        try {
          set({ isLoading: true, error: null });
          const response = await authApi.updateRole(role);

          set({
            user: response.user,
            isLoading: false,
          });

          toast.success(`Switched to ${role} role`);
        } catch (error: any) {
          set({ isLoading: false, error: error.message });
          throw error;
        }
      },

      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        });
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        // Toast is handled by the component calling this function
      },

      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),

      // Computed
      getRole: () => get().user?.role || null,

      isInvestor: () => get().user?.role === "investor",

      isRentor: () => get().user?.role === "rentor",

      isRenter: () => get().user?.role === "renter",
    }),
    {
      name: "regshield-user-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isHydrated = true;
        }
      },
    }
  )
);
