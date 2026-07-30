// Design Tokens for WhatsApp SaaS Admin Panel
// Professional UI/UX Redesign - Phase 1: Foundation

// Color Palette - Semantic Roles
export const colors = {
  // Brand Colors
  brand: {
    50: '#ecfdf7',
    100: '#d1fae5',
    200: '#a7f3d0',
    300: '#6ee7b7',
    400: '#22c55e',
    500: '#10b981', // Primary brand green
    600: '#059669',
    700: '#047857',
    800: '#065f46',
    900: '#064e3b',
  },

  // Semantic Colors
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#22c55e',
    500: '#10b981',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
  },

  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#f59e0b',
    500: '#eab308',
    600: '#ca8a04',
    700: '#a16207',
    800: '#854d0e',
    900: '#713f12',
  },

  error: {
    50: '#fef2f2',
    100: '#fce4e4',
    200: '#f9d6d6',
    300: '#f4c2c2',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
  },

  info: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
  },

  // Purple for premium tiers
  purple: {
    50: '#f5f3ff',
    100: '#ede9fe',
    200: '#ddd6fe',
    300: '#c4b5fd',
    400: '#a78bfa',
    500: '#8b5cf6',
    600: '#7c3aed',
    700: '#6d28d9',
    800: '#5b21b6',
    900: '#4c1d96',
  },

  // Amber for special statuses
  amber: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#f59e0b',
    500: '#eab308',
    600: '#ca8a04',
    700: '#a16207',
    800: '#854d0e',
    900: '#713f12',
  },

  // Indigo for UI elements
  indigo: {
    50: '#f5f8ff',
    100: '#e9ecff',
    200: '#d8dfff',
    300: '#b8c9ff',
    400: '#8da1ff',
    500: '#6378ff',
    600: '#4856ff',
    700: '#3a45db',
    800: '#323a9e',
    900: '#2c337a',
  },

  // Sky for informational elements
  sky: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    300: '#7de9fc',
    400: '#38bdf8',
    500: '#0ea5e9',
    600: '#0284c7',
    700: '#0369a1',
    800: '#075985',
    900: '#0c4a6e',
  },

  // Rose for special highlights
  rose: {
    50: '#fff1f2',
    100: '#ffe4e6',
    200: '#fecaca',
    300: '#fda7a1',
    400: '#fb7185',
    500: '#f43f5e',
    600: '#e11d48',
    700: '#be1540',
    800: '#9f122d',
    900: '#881337',
  },
};

// Typography Scale
export const typography = {
  fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",

  // Font weights
  fontWeight: {
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
  },

  // Font sizes with line heights
  fontSize: {
    xs: { size: '0.75rem', lineHeight: '1rem', letterSpacing: '0.1em' },      // 12px
    sm: { size: '0.875rem', lineHeight: '1.25rem', letterSpacing: '0.05em' },   // 14px
    base: { size: '1rem', lineHeight: '1.5rem', letterSpacing: '0' },          // 16px
    lg: { size: '1.125rem', lineHeight: '1.75rem', letterSpacing: '-0.01em' },  // 18px
    xl: { size: '1.25rem', lineHeight: '1.75rem', letterSpacing: '-0.01em' },   // 20px
    '2xl': { size: '1.5rem', lineHeight: '2rem', letterSpacing: '-0.02em' },     // 24px
    '3xl': { size: '1.875rem', lineHeight: '2.25rem', letterSpacing: '-0.02em' }, // 30px
    '4xl': { size: '2.25rem', lineHeight: '2.5rem', letterSpacing: '-0.02em' }, // 36px
    '5xl': { size: '3rem', lineHeight: '1', letterSpacing: '-0.03em' },         // 48px
  },

  // Text variants
  textVariants: {
    h1: { fontSize: '3rem', fontWeight: 800, lineHeight: '1', letterSpacing: '-0.03em' },
    h2: { fontSize: '2.25rem', fontWeight: 700, lineHeight: '1.25rem' },
    h3: { fontSize: '1.875rem', fontWeight: 700, lineHeight: '2.25rem' },
    h4: { fontSize: '1.5rem', fontWeight: 600, lineHeight: '2rem' },
    h5: { fontSize: '1.25rem', fontWeight: 600, lineHeight: '1.75rem' },
    h6: { fontSize: '1rem', fontWeight: 600, lineHeight: '1.5rem' },
    subtitle1: { fontSize: '1rem', fontWeight: 400, lineHeight: '1.5rem' },
    subtitle2: { fontSize: '0.875rem', fontWeight: 500, lineHeight: '1.25rem' },
    body1: { fontSize: '1rem', fontWeight: 400, lineHeight: '1.5rem' },
    body2: { fontSize: '0.875rem', fontWeight: 400, lineHeight: '1.25rem' },
    overline: { fontSize: '0.75rem', fontWeight: 600, lineHeight: '1rem', letterSpacing: '0.1em', textTransform: 'uppercase' },
    button: { fontSize: '0.875rem', fontWeight: 600, lineHeight: '1.25rem', textTransform: 'uppercase' },
    caption: { fontSize: '0.75rem', fontWeight: 400, lineHeight: '1rem' },
  },
};

// Spacing Scale (8px grid)
export const spacing = {
  0: '0px',
  0.5: '2px',
  1: '4px',
  1.5: '6px',
  2: '8px',
  2.5: '10px',
  3: '12px',
  3.5: '14px',
  4: '16px',
  5: '20px',
  6: '24px',
  7: '28px',
  8: '32px',
  9: '36px',
  10: '40px',
  11: '44px',
  12: '48px',
  14: '56px',
  16: '64px',
  20: '80px',
  24: '96px',
  32: '128px',
};

// Border Radius Scale
export const borderRadius = {
  xs: '4px',
  sm: '6px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  '2xl': '20px',
  '3xl': '24px',
  full: '9999px',
};

// Shadows & Elevation
export const shadows = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.02), 0 1px 1px -1px rgba(0, 0, 0, 0.01)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06), inset 0 1px 2px 0 rgba(0, 0, 0, 0.04)',

  // Glow effects for brand elements
  glow: {
    sm: '0 0 10px rgba(16, 185, 129, 0.2)',
    md: '0 0 20px rgba(16, 185, 129, 0.3)',
    lg: '0 0 30px rgba(16, 185, 129, 0.4)',
  },

  // Card shadows
  card: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
  'card-hover': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
};

// Breakpoints for responsive design
export const breakpoints = {
  xs: 0,
  sm: 600,
  md: 900,
  lg: 1200,
  xl: 1536,
  '2xl': 1920,
};

// Z-index layers
export const zIndices = {
  dropdown: 1000,
  sticky: 1020,
  overlay: 1040,
  modal: 1060,
  popover: 1080,
  tooltip: 1100,
  mobile: 1200,
};

// Opacity levels
export const opacity = {
  disabled: 0.38,
  hint: 0.6,
  divider: 0.12,
  backdrop: 0.5,
  hover: 0.08,
  border: 0.06,
};

// Transitions
export const transitions = {
  duration: {
    xs: '100ms',
    sm: '150ms',
    md: '250ms',
    lg: '350ms',
    xl: '500ms',
  },
  easing: {
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    bounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
};

// Motion presets
export const motionPresets = {
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.2 },
  },
  slideUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
    transition: { duration: 0.3, ease: 'easeOut' },
  },
  slideLeft: {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 },
    transition: { duration: 0.3, ease: 'easeOut' },
  },
  scaleIn: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
    transition: { duration: 0.2 },
  },
  stagger: {
    staggerChildren: 0.05,
    delayChildren: 0.05,
  },
};

// Dark theme palette for admin panel
export const darkTheme = {
  background: {
    primary: '#060912',
    secondary: '#0a0e1a',
    tertiary: 'rgba(10, 14, 26, 0.6)',
    card: 'rgba(255, 255, 255, 0.02)',
    elevated: 'rgba(255, 255, 255, 0.05)',
  },
  border: {
    primary: 'rgba(255, 255, 255, 0.06)',
    secondary: 'rgba(255, 255, 255, 0.1)',
  },
  text: {
    primary: '#ffffff',
    secondary: 'rgba(255, 255, 255, 0.6)',
    muted: 'rgba(255, 255, 255, 0.4)',
    disabled: 'rgba(255, 255, 255, 0.24)',
  },
  overlay: {
    primary: 'rgba(0, 0, 0, 0.6)',
    modal: 'rgba(0, 0, 0, 0.8)',
  },
};

// Accessibility tokens
export const accessibility = {
  focus: {
    outlineWidth: '2px',
    outlineStyle: 'solid',
    outlineOffset: '2px',
  },
  touch: {
    minTargetSize: '44px',
    spacing: '8px',
  },
};

// Default export combining all tokens
export default {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  breakpoints,
  zIndices,
  opacity,
  transitions,
  motionPresets,
  darkTheme,
  accessibility,
};