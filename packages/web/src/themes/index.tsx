import React, { createContext, useContext, useEffect, useState } from "react";
import { themes } from "./definitions";
import type { ThemeId, ThemeTokens } from "./types";

type ThemeContextType = {
    currentTheme: ThemeId;
    tokens: ThemeTokens;
    setTheme: (theme: ThemeId) => void;
};

const ThemeContext = createContext<ThemeContextType>({
    currentTheme: "dark",
    tokens: themes.dark,
    setTheme: () => { },
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [currentTheme, setCurrentTheme] = useState<ThemeId>(() => {
        return (localStorage.getItem("inspector_theme") as ThemeId) || "dark";
    });

    const tokens = themes[currentTheme] || themes.dark;

    useEffect(() => {
        localStorage.setItem("inspector_theme", currentTheme);
        const root = document.documentElement;

        // Inject all tokens dynamically into CSS variables
        root.style.setProperty("--bg", tokens.bg);
        root.style.setProperty("--sidebar", tokens.sidebar);
        root.style.setProperty("--surface", tokens.surface);
        root.style.setProperty("--surface-elevated", tokens.surfaceElevated);
        root.style.setProperty("--surface-hover", tokens.surfaceHover);
        root.style.setProperty("--border", tokens.border);
        root.style.setProperty("--border-subtle", tokens.borderSubtle);
        root.style.setProperty("--text", tokens.text);
        root.style.setProperty("--text-muted", tokens.textMuted);
        root.style.setProperty("--text-faint", tokens.textFaint);
        root.style.setProperty("--accent", tokens.accent);
        root.style.setProperty("--accent-hover", tokens.accentHover);
        root.style.setProperty("--glass-bg", tokens.glassBg);
        root.style.setProperty("--glass-border", tokens.glassBorder);
        root.style.setProperty("--badge-red-bg", tokens.badgeRedBg);
        root.style.setProperty("--badge-red-text", tokens.badgeRedText);
        root.style.setProperty("--badge-red-border", tokens.badgeRedBorder);
        root.style.setProperty("--badge-amber-bg", tokens.badgeAmberBg);
        root.style.setProperty("--badge-amber-text", tokens.badgeAmberText);
        root.style.setProperty("--badge-amber-border", tokens.badgeAmberBorder);
        root.style.setProperty("--badge-blue-bg", tokens.badgeBlueBg);
        root.style.setProperty("--badge-blue-text", tokens.badgeBlueText);
        root.style.setProperty("--badge-blue-border", tokens.badgeBlueBorder);
    }, [currentTheme, tokens]);

    return (
        <ThemeContext.Provider value={{ currentTheme, tokens, setTheme: setCurrentTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);
