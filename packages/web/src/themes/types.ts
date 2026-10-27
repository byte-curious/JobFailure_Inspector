export type ThemeId = "dark" | "light" | "warm";

export type ThemeTokens = {
    id: ThemeId;
    name: string;
    bg: string;
    sidebar: string;
    surface: string;
    surfaceElevated: string;
    surfaceHover: string;
    border: string;
    borderSubtle: string;
    text: string;
    textMuted: string;
    textFaint: string;
    accent: string;
    accentHover: string;
    glassBg: string;
    glassBorder: string;
    badgeRedBg: string;
    badgeRedText: string;
    badgeRedBorder: string;
    badgeAmberBg: string;
    badgeAmberText: string;
    badgeAmberBorder: string;
    badgeBlueBg: string;
    badgeBlueText: string;
    badgeBlueBorder: string;
};
