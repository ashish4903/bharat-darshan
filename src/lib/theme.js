import { useEffect, useState } from "react";

const KEY = "bharat-darshan.theme";

function readStored() {
  try {
    const value = localStorage.getItem(KEY);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null;
  }
}

/** Light/dark theme that follows the system until the visitor chooses one. */
export function useTheme() {
  const [choice, setChoice] = useState(readStored);
  const systemDark =
    typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches;
  const theme = choice ?? (systemDark ? "dark" : "light");
  useEffect(() => {
    if (choice) document.documentElement.dataset.theme = choice;
    else delete document.documentElement.dataset.theme;
    try {
      if (choice) localStorage.setItem(KEY, choice);
    } catch {
      // Storage may be unavailable; the choice still applies for this visit.
    }
  }, [choice]);
  return { theme, toggle: () => setChoice(theme === "dark" ? "light" : "dark") };
}
