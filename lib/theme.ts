export type ThemeId =
  | "original-dark"
  | "original-light"
  | "arcane"
  | "kingdom";

export const THEME_STORAGE_KEY = "ucc-os-theme";
export const DEFAULT_THEME: ThemeId = "original-dark";

export type ThemeOption = {
  id: ThemeId;
  label: string;
  description: string;
};

export const THEMES: ThemeOption[] = [
  {
    id: "original-dark",
    label: "Original Dark",
    description: "The default deep slate workspace with teal accents.",
  },
  {
    id: "original-light",
    label: "Original Light",
    description: "A clean light version of the original design.",
  },
  {
    id: "arcane",
    label: "Arcane",
    description:
      "Deep indigo and navy with gold accents, ornate borders, and glowing focus.",
  },
  {
    id: "kingdom",
    label: "Kingdom",
    description:
      "Warm wood and parchment tones with bold rounded controls and strong shadows.",
  },
];

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === "string" && THEMES.some((theme) => theme.id === value);
}

export function getStoredTheme(): ThemeId {
  if (typeof window === "undefined") {
    return DEFAULT_THEME;
  }

  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isThemeId(stored) ? stored : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

export function applyTheme(theme: ThemeId) {
  if (typeof document !== "undefined") {
    document.documentElement.setAttribute("data-theme", theme);
  }

  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Ignore storage failures (for example private browsing quota limits).
    }
  }
}
