import { cn } from "@/src/lib/utils";
import { HTMLAttributes } from "react";

export interface LoaderProps extends HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "white" | "gray";
}

export function Loader({
  size = "md",
  variant = "primary",
  className,
  ...props
}: LoaderProps) {
  const sizeStyles = {
    sm: "h-4 w-4 border-2",
    md: "h-8 w-8 border-2",
    lg: "h-12 w-12 border-3",
  };

  const variantStyles = {
    primary: "border-primary border-t-transparent",
    white: "border-white border-t-transparent",
    gray: "border-gray-400 border-t-transparent",
  };

  return (
    <div
      className={cn("flex items-center justify-center", className)}
      {...props}
    >
      <div
        className={cn(
          "animate-spin rounded-full",
          sizeStyles[size],
          variantStyles[variant]
        )}
      />
    </div>
  );
}

export function FullPageLoader() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4">
        <Loader size="lg" />
        <p className="text-sm text-gray-600">Loading...</p>
      </div>
    </div>
  );
}
