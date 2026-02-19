import type { Variants } from "motion/react";

// Fade up (default entrance for most elements)
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

// Fade in (no vertical movement)
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.5 } },
};

// Scale up (for CTA card)
export const scaleUp: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5 } },
};

// Stagger container (wraps children that each use fadeUp)
export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12 },
  },
};

// Viewport trigger config (reusable)
export const scrollTrigger = {
  once: true,
  amount: 0.2 as const,
};
