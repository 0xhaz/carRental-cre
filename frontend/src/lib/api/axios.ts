import axios from "axios";
import { toast } from "react-hot-toast";

// Create axios instance with base configuration
const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002/api",
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor - add auth token
apiClient.interceptors.request.use(
  (config) => {
    // Get token from localStorage
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle errors
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response) {
      // Server responded with error
      const message = error.response.data?.message || "An error occurred";

      if (error.response.status === 401) {
        // Unauthorized - clear token and redirect to login
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        toast.error("Session expired. Please login again.");
        if (typeof window !== "undefined") {
          window.location.href = "/";
        }
      } else if (error.response.status === 403) {
        toast.error("You don't have permission to perform this action");
      } else if (error.response.status === 404) {
        toast.error("Resource not found");
      } else if (error.response.status >= 500) {
        toast.error("Server error. Please try again later.");
      } else {
        toast.error(message);
      }
    } else if (error.request) {
      // Request made but no response
      toast.error("Network error. Please check your connection.");
    } else {
      // Something else happened
      toast.error("An unexpected error occurred");
    }

    return Promise.reject(error);
  }
);

export default apiClient;
