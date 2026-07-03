import { createContext, useContext, useState, useEffect, useCallback } from "react";

const ThemeContext = createContext();

/**
 * Determines if the current IST time is strictly between 10:00 AM and 12:00 PM.
 * Uses the browser's local time converted to IST (Asia/Kolkata, UTC+5:30).
 */
function isIstMorningWindow() {
  // Get the current time in IST
  const now = new Date();
  const istString = now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
  const istDate = new Date(istString);

  const hours = istDate.getHours();
  const minutes = istDate.getMinutes();

  // Strictly between 10:00 AM and 12:00 PM IST
  // 10:00 AM → hours === 10, minutes >= 0
  // Up to but not including 12:00 PM → hours === 11, any minute
  // Exactly 10:00 is included (strictly after would exclude 10:00:00,
  // but "strictly between" 10 and 12 means 10:01–11:59 in common usage;
  // the requirement says "strictly between 10:00 AM and 12:00 PM" so
  // we interpret as: hour >= 10 AND hour < 12)
  return hours >= 10 && hours < 12;

  // Temporarily check if it's between 6:00 PM and 8:00 PM IST;
  //return hours >= 18 && hours < 20;

}

/**
 * Resolves the theme based on region flag + time.
 *
 * Rule:
 *   If isSouthIndia === true AND current IST time is between 10 AM – 12 PM → "light"
 *   Otherwise → "dark"
 */
function resolveTheme(isSouthIndia) {
  if (isSouthIndia && isIstMorningWindow()) {
    return "light";
  }
  return "dark";
}

export const ThemeProvider = ({ children }) => {
  const [isSouthIndia, setIsSouthIndia] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("isSouthIndia");
      return saved === "true";
    }
    return false;
  });

  const [theme, setThemeState] = useState("dark");

  // Re-compute theme whenever isSouthIndia changes
  const recomputeTheme = useCallback(() => {
    const resolved = resolveTheme(isSouthIndia);
    setThemeState(resolved);
  }, [isSouthIndia]);

  // Apply/remove the "dark" class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [theme]);

  // Recompute on mount + set an interval to check every minute
  // so the theme flips automatically when the time window opens/closes
  useEffect(() => {
    recomputeTheme();

    const interval = setInterval(recomputeTheme, 60 * 1000); // check every 60s
    return () => clearInterval(interval);
  }, [recomputeTheme]);

  // Called by AuthContext after login response arrives
  const updateRegion = useCallback((southIndiaFlag) => {
    const flag = Boolean(southIndiaFlag);
    setIsSouthIndia(flag);
    localStorage.setItem("isSouthIndia", String(flag));
  }, []);

  // Clear region data on logout
  const clearRegion = useCallback(() => {
    setIsSouthIndia(false);
    localStorage.removeItem("isSouthIndia");
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isSouthIndia,
        updateRegion,
        clearRegion,
        isIstMorningWindow,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
