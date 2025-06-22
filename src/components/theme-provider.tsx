
"use client";

import * as React from "react";
// The ThemeProvider from the next-themes library handles theme switching logic.
import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ThemeProviderProps } from "next-themes/dist/types";

/**
 * A wrapper component around the `next-themes` ThemeProvider.
 * This makes it a client component and provides a clean interface for the root layout.
 * It enables light and dark mode functionality across the application.
 * @param {ThemeProviderProps} props - Props passed down to the NextThemesProvider.
 */
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
