/**
 * Animation Configuration for Framer Motion
 */

export const FADE_IN_UP = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6 }
} as const;

export const SLIDE_LEFT = {
  initial: { opacity: 0, x: 100 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -100 },
  transition: { duration: 0.5 }
} as const;

export const FADE_IN = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.5 }
} as const;

export const STAGGER_DELAY = 0.1;

/**
 * Utility function to get staggered animation
 */
export const getStaggeredAnimation = (index: number, baseDelay: number = STAGGER_DELAY) => ({
  ...FADE_IN_UP,
  transition: {
    ...FADE_IN_UP.transition,
    delay: index * baseDelay
  }
});
