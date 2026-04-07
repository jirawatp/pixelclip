import { createContext, useContext } from "react";
export const I18nContext = createContext({
  language: "en" as const,
  t: (key: string) => key,
});
export function useI18n() {
  return useContext(I18nContext);
}
export function localeName(locale: any, agent: any) {
  return agent?.name ?? "Unknown";
}
