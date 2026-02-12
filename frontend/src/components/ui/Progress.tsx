import { cn } from "@/src/lib/utils";
import { HTMLAttributes } from "react";

export interface ProgressProps extends HTMLAttributes<HTMLDivElement> {
  value: number; // 0-100
  max?: number;
  showLabel?: boolean;
  variant?: "default" | "success" | "warning" | "error";
}

const variantColors = {
  default: "bg-primary",
  success: "bg-green-600",
  warning: "bg-yellow-500",
  error: "bg-red-600",
};

export function Progress({
  value,
  max = 100,
  showLabel = false,
  variant = "default",
  className,
  ...props
}: ProgressProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={cn("w-full", className)} {...props}>
      {showLabel && (
        <div className="mb-1 flex justify-between text-sm text-gray-600">
          <span>Progress</span>
          <span>{percentage.toFixed(0)}%</span>
        </div>
      )}
      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
        <div
          className={cn(
            "h-full transition-all duration-300 ease-in-out",
            variantColors[variant]
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
