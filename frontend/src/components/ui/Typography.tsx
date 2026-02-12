import { cn } from "@/src/lib/utils";
import { HTMLAttributes, forwardRef } from "react";

export interface HeadingProps extends HTMLAttributes<HTMLHeadingElement> {
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
}

export const Heading = forwardRef<HTMLHeadingElement, HeadingProps>(
  ({ as: Component = "h2", className, ...props }, ref) => {
    const baseStyles = {
      h1: "text-4xl font-bold tracking-tight",
      h2: "text-3xl font-bold tracking-tight",
      h3: "text-2xl font-semibold",
      h4: "text-xl font-semibold",
      h5: "text-lg font-medium",
      h6: "text-base font-medium",
    };

    return (
      <Component
        ref={ref as any}
        className={cn(baseStyles[Component], "text-gray-900", className)}
        {...props}
      />
    );
  }
);
Heading.displayName = "Heading";

export interface ParagraphProps extends HTMLAttributes<HTMLParagraphElement> {
  size?: "sm" | "base" | "lg";
}

export const Paragraph = forwardRef<HTMLParagraphElement, ParagraphProps>(
  ({ size = "base", className, ...props }, ref) => {
    const sizeStyles = {
      sm: "text-sm",
      base: "text-base",
      lg: "text-lg",
    };

    return (
      <p
        ref={ref}
        className={cn(sizeStyles[size], "text-gray-600", className)}
        {...props}
      />
    );
  }
);
Paragraph.displayName = "Paragraph";

export interface LabelProps extends HTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

export const Label = forwardRef<HTMLLabelElement, LabelProps>(
  ({ required, className, children, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={cn("text-sm font-medium text-gray-700", className)}
        {...props}
      >
        {children}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
    );
  }
);
Label.displayName = "Label";

// Legacy Title component for backward compatibility
export interface TitleProps {
  title: string;
  subtitle?: string;
  align?: "left" | "center" | "right";
}

export function Title({ title, subtitle, align = "left" }: TitleProps) {
  const alignmentClass = {
    left: "text-left",
    center: "text-center",
    right: "text-right",
  };

  return (
    <div className={cn("mb-8", alignmentClass[align])}>
      <Heading as="h2" className="mb-2">
        {title}
      </Heading>
      {subtitle && <Paragraph className="text-gray-500">{subtitle}</Paragraph>}
    </div>
  );
}
