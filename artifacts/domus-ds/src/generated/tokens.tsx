/* GENERATED FROM tokens.json -- DO NOT EDIT. Run scripts/build-tokens.mjs. */
// Portable design tokens (colors as hex). Web consumes the theme via
// src/index.css; mobile (Expo) and any other platform import this object so the
// whole product shares one source of truth.
export const tokens = {
  "color": {
    "light": {
      "background": "#F1F4F9",
      "foreground": "#080B14",
      "card": "#FFFFFF",
      "cardForeground": "#080B14",
      "popover": "#FFFFFF",
      "popoverForeground": "#080B14",
      "primary": "#0E40AB",
      "primaryForeground": "#FFFFFF",
      "secondary": "#E3E8F1",
      "secondaryForeground": "#080B14",
      "muted": "#F1F4F9",
      "mutedForeground": "#323D5A",
      "accent": "#1452D6",
      "accentForeground": "#FFFFFF",
      "destructive": "#E72314",
      "destructiveForeground": "#FFFFFF",
      "border": "#CBD3E3",
      "input": "#B6C0D6",
      "ring": "#0E40AB",
      "chart1": "#0E40AB",
      "chart2": "#0E7F92",
      "chart3": "#2D8659",
      "chart4": "#9B6E19",
      "chart5": "#7E5FE3",
      "sidebar": "#F1F4F9",
      "sidebarForeground": "#080B14",
      "sidebarBorder": "#CBD3E3",
      "sidebarPrimary": "#0E40AB",
      "sidebarPrimaryForeground": "#FFFFFF",
      "sidebarAccent": "#E3E8F1",
      "sidebarAccentForeground": "#080B14",
      "sidebarRing": "#0E40AB"
    },
    "dark": {
      "background": "#05070D",
      "foreground": "#E3E8F1",
      "card": "#0C101B",
      "cardForeground": "#E3E8F1",
      "popover": "#0C101B",
      "popoverForeground": "#E3E8F1",
      "primary": "#1452D6",
      "primaryForeground": "#FBFCFE",
      "secondary": "#171D2E",
      "secondaryForeground": "#E3E8F1",
      "muted": "#0C101B",
      "mutedForeground": "#9EAAC6",
      "accent": "#2E70EF",
      "accentForeground": "#FBFCFE",
      "destructive": "#FF6E63",
      "destructiveForeground": "#FBFCFE",
      "border": "#1E2639",
      "input": "#273049",
      "ring": "#2E70EF",
      "chart1": "#1452D6",
      "chart2": "#2BD0E4",
      "chart3": "#3FCE87",
      "chart4": "#F0B23C",
      "chart5": "#A78FF5",
      "sidebar": "#05070D",
      "sidebarForeground": "#E3E8F1",
      "sidebarBorder": "#1E2639",
      "sidebarPrimary": "#1452D6",
      "sidebarPrimaryForeground": "#FBFCFE",
      "sidebarAccent": "#171D2E",
      "sidebarAccentForeground": "#E3E8F1",
      "sidebarRing": "#2E70EF"
    }
  },
  "fontFamily": {
    "sans": [
      "Inter",
      "system-ui",
      "-apple-system",
      "Segoe UI",
      "sans-serif"
    ],
    "serif": [
      "Georgia",
      "serif"
    ],
    "mono": [
      "IBM Plex Mono",
      "ui-monospace",
      "SFMono-Regular",
      "monospace"
    ]
  },
  "radius": "0.625rem",
  "spacing": "0.25rem"
} as const;

export type Tokens = typeof tokens;
export default tokens;
