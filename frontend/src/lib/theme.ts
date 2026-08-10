"use client";

import { createContext, useCallback, useContext, useEffect, useSyncExternalStore } from "react";

export type Theme = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "tissue-bot-theme";

type ThemeContextValue = {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  theme: "system",
  resolvedTheme: "light",
  setTheme: () => {},
});

/**
 * The theme lives in localStorage, not React state, so it is read through
 * useSyncExternalStore. Subscribers are notified on explicit changes, on OS
 * preference changes, and on writes from another tab.
 */
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    media.removeEventListener("change", onChange);
    window.removeEventListener("storage", onChange);
  };
}

function systemTheme(): "light" | "dark" {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function readTheme(): Theme {
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  return stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
}

function readResolvedTheme(): "light" | "dark" {
  const theme = readTheme();
  return theme === "system" ? systemTheme() : theme;
}

const serverTheme = (): Theme => "system";
const serverResolvedTheme = (): "light" | "dark" => "light";

export function useThemeState(): ThemeContextValue {
  const theme = useSyncExternalStore(subscribe, readTheme, serverTheme);
  const resolvedTheme = useSyncExternalStore(
    subscribe,
    readResolvedTheme,
    serverResolvedTheme,
  );

  // Sync the external system (the document) with the resolved theme. The
  // inline script in the root layout does this before first paint; this keeps
  // it correct afterwards.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", resolvedTheme === "dark");
    root.style.colorScheme = resolvedTheme;
  }, [resolvedTheme]);

  const setTheme = useCallback((next: Theme) => {
    window.localStorage.setItem(THEME_STORAGE_KEY, next);
    emit();
  }, []);

  return { theme, resolvedTheme, setTheme };
}

export const ThemeProviderContext = ThemeContext;

export function useTheme() {
  return useContext(ThemeContext);
}
