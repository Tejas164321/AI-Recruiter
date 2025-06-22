
"use client";

import * as React from "react";
// Icons for light and dark mode
import { Moon, Sun } from "lucide-react";
// Hook from next-themes to access and change the current theme
import { useTheme } from "next-themes";
// UI component for the button
import { Button } from "@/components/ui/button";

/**
 * A button component that allows the user to toggle between light and dark themes.
 */
export function ThemeToggleButton() {
  // `useTheme` provides the current theme and a function to set it.
  const { theme, setTheme } = useTheme();

  /**
   * Toggles the theme between "dark" and "light".
   */
  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <Button variant="outline" size="icon" onClick={toggleTheme}>
      {/* Sun icon is visible in light mode */}
      <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      {/* Moon icon is visible in dark mode */}
      <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      {/* Screen reader text for accessibility */}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
