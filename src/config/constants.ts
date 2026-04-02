/**
 * Application-wide configuration constants
 */

/**
 * Carousel/Slider Configuration
 */
export const CAROUSEL_CONFIG = {
  /** Auto-play interval in milliseconds */
  AUTO_PLAY_INTERVAL: 5000,
  /** Transition duration in milliseconds */
  TRANSITION_DURATION: 500,
  /** Enable/disable auto-play by default */
  ENABLE_AUTO_PLAY: true,
} as const;

/**
 * Animation Configuration
 */
export const ANIMATION_CONFIG = {
  /** Default stagger delay between items */
  STAGGER_DELAY: 0.1,
  /** Default fade duration */
  FADE_DURATION: 0.6,
  /** Default slide duration */
  SLIDE_DURATION: 0.5,
} as const;

/**
 * Layout Configuration
 */
export const LAYOUT_CONFIG = {
  /** Maximum content width */
  MAX_WIDTH: "7xl",
  /** Default padding for sections */
  SECTION_PADDING: {
    mobile: "py-12 px-4",
    tablet: "md:py-20 md:px-6",
    desktop: "lg:py-24 lg:px-8",
  },
} as const;

/**
 * Brand Colors
 */
export const BRAND_COLORS = {
  primary: "#E31E24",
  primaryHover: "#C41E3A",
  primaryLight: "#FF4444",
} as const;

/**
 * Feature Limits
 */
export const LIMITS = {
  /** Maximum cart items */
  MAX_CART_ITEMS: 10,
  /** Minimum order amount */
  MIN_ORDER_AMOUNT: 100,
  /** Maximum message length for contact form */
  MAX_MESSAGE_LENGTH: 1000,
} as const;

/**
 * API Configuration
 */
export const API_CONFIG = {
  /** Default request timeout in ms */
  TIMEOUT: 10000,
  /** Max retry attempts */
  MAX_RETRIES: 3,
  /** React Query stale time */
  STALE_TIME: 60000, // 1 minute
} as const;
