"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import axios from "axios";

interface ThemeContextType {
  theme: "light" | "dark";
  location: string | null;
  state: string | null;
  isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "dark",
  location: null,
  state: null,
  isLoading: true,
});

export const useTheme = () => useContext(ThemeContext);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [location, setLocation] = useState<string | null>(null);
  const [state, setState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const determineTheme = async () => {
      try {
        // Get user's location from IP
        const response = await axios.get("http://ip-api.com/json/");
        const { regionName, city } = response.data;

        setLocation(city);
        setState(regionName);

        // South Indian states
        const southIndianStates = [
          "Karnataka",
          "Kerala",
          "Tamil Nadu",
          "Andhra Pradesh",
          "Telangana",
          "Puducherry",
          "Pondicherry",
        ];

        // Check if user is in South India
        const isInSouthIndia = southIndianStates.some(
          (s) => regionName && regionName.toLowerCase().includes(s.toLowerCase())
        );

        // Get current hour (0-23)
        const currentHour = new Date().getHours();

        // White theme: 10AM-12PM (10-11) AND South India
        // Dark theme: All other times/locations
        if (isInSouthIndia && currentHour >= 10 && currentHour < 12) {
          setTheme("light");
          console.log("Theme: Light (South India + 10AM-12PM)");
        } else {
          setTheme("dark");
          console.log(
            `Theme: Dark (${regionName}, Hour: ${currentHour})`
          );
        }
      } catch (error) {
        console.error("Error determining theme:", error);
        // Default to dark theme on error
        setTheme("dark");
      } finally {
        setIsLoading(false);
      }
    };

    determineTheme();

    // Re-check theme every minute to handle time changes
    const interval = setInterval(determineTheme, 60000);

    return () => clearInterval(interval);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, location, state, isLoading }}>
      {children}
    </ThemeContext.Provider>
  );
};
