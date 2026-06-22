import React, { useEffect, ReactNode } from "react";
import { useThemeStore } from "../stores/themeStore";

type Theme = "light" | "dark";

export interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const theme = useThemeStore((s) => s.theme);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
  }, [theme]);

  // Read from system on init
  useEffect(() => {
    const userPrefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (userPrefersDark && !localStorage.getItem("theme-storage")) {
       useThemeStore.setState({ theme: "dark" });
    }
  }, []);

  return <>{children}</>;
};

export const useTheme = (): ThemeContextType => {
  const store = useThemeStore();
  return {
    theme: store.theme,
    toggleTheme: store.toggleTheme,
    setTheme: (theme: Theme) => useThemeStore.setState({ theme }),
  };
};

