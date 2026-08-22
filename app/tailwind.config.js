/** @type {import('tailwindcss').Config} */

/* ================================================================
   MONOCHROME THEME — every color family below is a pure neutral
   grayscale (R=G=B, no hue anywhere). Instead of collapsing every
   palette to the *same* gray (which would erase status/role meaning
   across the app), each semantic group gets its own tonal curve so
   "danger" still reads as heavier/darker than "success" at the same
   shade number (e.g. shade 700 is darker in the danger tier than in
   the success tier) — the UI stays strictly black & white but keeps
   its visual hierarchy for clinical badges, role tags, and charts.

     onyx     -> brand / primary actions / info   (primary, medical, skyglow, blue, sky, indigo)
     graphite -> secondary accent (admin/purple)   (purple, violet, fuchsia)
     ash      -> danger / critical   (darkest)      (coral, red, rose, pink)
     smoke    -> warning / caution   (mid-tone)      (sunbeam, orange, amber, yellow, lime)
     fog      -> success / positive  (lightest)      (leaf, green, emerald, teal, cyan)

   Login.tsx is intentionally excluded — it's styled entirely with its
   own inline <style> hex values and doesn't reference these tokens.

   NOTE: the Appointments calendar (components/MonthCalendar.tsx) and
   its status pills intentionally do NOT use these tokens — they use
   explicit hex values so that page can show real blue/green/red status
   colors without recoloring the rest of the app. See that file for why.
   ================================================================ */
const onyx = {
  50: '#f8f8f8', 100: '#eeeeee', 200: '#dcdcdc', 300: '#c3c3c3', 400: '#a3a3a3',
  500: '#808080', 600: '#606060', 700: '#474747', 800: '#323232', 900: '#202020', 950: '#121212',
};
const graphite = {
  50: '#ffffff', 100: '#f6f6f6', 200: '#e4e4e4', 300: '#cbcbcb', 400: '#ababab',
  500: '#888888', 600: '#686868', 700: '#4f4f4f', 800: '#3a3a3a', 900: '#282828', 950: '#1a1a1a',
};
const ash = {
  50: '#eaeaea', 100: '#e0e0e0', 200: '#cecece', 300: '#b5b5b5', 400: '#959595',
  500: '#727272', 600: '#525252', 700: '#393939', 800: '#242424', 900: '#121212', 950: '#040404',
};
const smoke = {
  50: '#ffffff', 100: '#fefefe', 200: '#ececec', 300: '#d3d3d3', 400: '#b3b3b3',
  500: '#909090', 600: '#707070', 700: '#575757', 800: '#424242', 900: '#303030', 950: '#222222',
};
const fog = {
  50: '#ffffff', 100: '#ffffff', 200: '#f6f6f6', 300: '#dddddd', 400: '#bdbdbd',
  500: '#9a9a9a', 600: '#7a7a7a', 700: '#616161', 800: '#4c4c4c', 900: '#3a3a3a', 950: '#2c2c2c',
};

/* Tailwind's default `gray` (and slate/zinc/neutral/stone) carry a faint
   hue tint (gray leans slightly cool/blue). For a strictly neutral B&W
   theme we override them too — this is the single most-used color family
   in the app (text/borders/backgrounds on nearly every page). */
const trueGray = {
  50: '#fafafa', 100: '#f4f4f4', 200: '#e4e4e4', 300: '#d1d1d1', 400: '#a3a3a3',
  500: '#737373', 600: '#525252', 700: '#404040', 800: '#262626', 900: '#171717', 950: '#0a0a0a',
};

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Fraunces"', 'ui-serif', 'Georgia', 'serif'],
        sans: ['"IBM Plex Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        // Custom app tokens
        primary: onyx,
        medical: onyx,
        skyglow: onyx,
        coral: ash,
        sunbeam: smoke,
        leaf: fog,
        graphite: graphite,
        // Standard Tailwind color names used directly in a few pages —
        // overridden here so bg-red-*, text-green-*, etc. also render
        // grayscale instead of falling back to Tailwind's built-in hues.
        red: ash, rose: ash, pink: ash,
        orange: smoke, amber: smoke, yellow: smoke, lime: smoke,
        green: fog, emerald: fog, teal: fog, cyan: fog,
        blue: onyx, sky: onyx, indigo: onyx,
        purple: graphite, violet: graphite, fuchsia: graphite,
        gray: trueGray, slate: trueGray, zinc: trueGray, neutral: trueGray, stone: trueGray,
      },
      boxShadow: {
        soft: '0 1px 2px 0 rgba(15, 23, 42, 0.04), 0 1px 3px 0 rgba(15, 23, 42, 0.06)',
        premium: '0 1px 2px rgba(20,20,20,0.04), 0 8px 24px -8px rgba(20,20,20,0.12), 0 2px 6px -2px rgba(20,20,20,0.06)',
        'premium-lg': '0 4px 12px rgba(20,20,20,0.06), 0 24px 48px -16px rgba(20,20,20,0.18)',
        'glow-blue': '0 0 0 1px rgba(60,60,60,0.10), 0 12px 28px -10px rgba(60,60,60,0.45)',
        'glow-red': '0 0 0 1px rgba(20,20,20,0.12), 0 12px 28px -10px rgba(20,20,20,0.45)',
        'glow-yellow': '0 0 0 1px rgba(90,90,90,0.10), 0 12px 28px -10px rgba(90,90,90,0.40)',
        'glow-green': '0 0 0 1px rgba(120,120,120,0.10), 0 12px 28px -10px rgba(120,120,120,0.35)',
        'inset-line': 'inset 0 1px 0 0 rgba(255,255,255,0.6)',
        /* Layered "depth" shadows for the v12 3D system — stacked umbra/penumbra
           passes that read as real elevation rather than a flat drop-shadow. */
        'depth-1': '0 1px 1px rgba(20,20,20,0.03), 0 2px 4px rgba(20,20,20,0.04)',
        'depth-2': '0 2px 4px rgba(20,20,20,0.04), 0 8px 16px -4px rgba(20,20,20,0.10), 0 16px 32px -12px rgba(20,20,20,0.10)',
        'depth-3': '0 4px 8px rgba(20,20,20,0.05), 0 16px 32px -8px rgba(20,20,20,0.16), 0 32px 64px -24px rgba(20,20,20,0.20)',
        'depth-float': '0 8px 16px -4px rgba(20,20,20,0.10), 0 40px 80px -32px rgba(20,20,20,0.28)',
        /* v13: heavier "lifted off the table" elevation for hero panels + hover peaks */
        'depth-4': '0 2px 4px rgba(20,20,20,0.06), 0 24px 48px -12px rgba(20,20,20,0.22), 0 48px 96px -32px rgba(20,20,20,0.28)',
        'depth-hover': '0 6px 14px -2px rgba(20,20,20,0.10), 0 30px 60px -18px rgba(20,20,20,0.26), 0 2px 3px rgba(20,20,20,0.06)',
        'glow-purple': '0 0 0 1px rgba(70,70,70,0.10), 0 12px 28px -10px rgba(70,70,70,0.42)',
        'button-rest': '0 1px 1px rgba(20,20,20,0.04), 0 1px 2px rgba(20,20,20,0.06), inset 0 1px 0 rgba(255,255,255,0.16)',
        'button-press': '0 1px 1px rgba(20,20,20,0.10), inset 0 1px 2px rgba(20,20,20,0.18)',
      },
      backgroundImage: {
        'grain': "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E\")",
      },
      keyframes: {
        spin: { to: { transform: 'rotate(360deg)' } },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '0.5', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.08)' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(14px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        gradientShift: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        drawLine: {
          '0%': { strokeDashoffset: '1000' },
          '100%': { strokeDashoffset: '0' },
        },
        countUp: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        breathe: {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.9' },
          '50%': { transform: 'scale(1.06)', opacity: '1' },
        },
        shineSweep: {
          '0%': { transform: 'translateX(-140%) skewX(-12deg)' },
          '100%': { transform: 'translateX(140%) skewX(-12deg)' },
        },
        revealBlur: {
          '0%': { opacity: '0', transform: 'translateY(10px)', filter: 'blur(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)', filter: 'blur(0px)' },
        },
        popIn: {
          '0%': { opacity: '0', transform: 'scale(0.85)' },
          '60%': { opacity: '1', transform: 'scale(1.04)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      transitionTimingFunction: {
        premium: 'cubic-bezier(0.16, 1, 0.3, 1)',
        snap: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      animation: {
        spin: 'spin 1s linear infinite',
        float: 'float 4s ease-in-out infinite',
        shimmer: 'shimmer 1.6s ease-in-out infinite',
        'pulse-glow': 'pulseGlow 2.4s ease-in-out infinite',
        'fade-in-up': 'fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) both',
        'gradient-shift': 'gradientShift 6s ease infinite',
        'draw-line': 'drawLine 1.8s ease-out forwards',
        'count-up': 'countUp 0.4s ease-out both',
        breathe: 'breathe 3.2s ease-in-out infinite',
        'shine-sweep': 'shineSweep 1.1s cubic-bezier(0.16, 1, 0.3, 1)',
        'reveal-blur': 'revealBlur 0.55s cubic-bezier(0.16, 1, 0.3, 1) both',
        'pop-in': 'popIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both',
      },
      
    },
  },
  plugins: [],
}

