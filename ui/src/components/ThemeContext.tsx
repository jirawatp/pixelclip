import { createContext, useContext, useState } from "react";
export type ThemeMode = "light" | "dark";
export const ThemeContext = createContext({
  theme: "dark" as ThemeMode,
  setTheme: (t: ThemeMode) => {},
});
export function useTheme() {
  return useContext(ThemeContext);
}
