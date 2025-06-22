
'use client';
import type { Dispatch, ReactNode, SetStateAction } from 'react';
import { createContext, useContext, useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Defines the shape of the loading context's value.
 */
interface LoadingContextType {
  isPageLoading: boolean;
  setIsPageLoading: Dispatch<SetStateAction<boolean>>;
}

// Create the context with an undefined initial value.
const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

/**
 * The LoadingProvider component provides a global state for page loading indicators.
 * It allows any component to trigger a full-page loader, useful for asynchronous
 * operations like page navigation.
 * @param {object} props - The component props.
 * @param {ReactNode} props.children - The child components that will have access to this context.
 */
export function LoadingProvider({ children }: { children: ReactNode }) {
  // State to control the visibility of the page loader.
  const [isPageLoading, setIsPageLoading] = useState(false);
  // Hook to get the current URL pathname.
  const pathname = usePathname();

  // Effect to automatically turn off the loader when the route changes.
  // This acts as a safety net in case a component forgets to turn off the loader
  // after an operation that causes navigation.
  useEffect(() => {
    setIsPageLoading(false);
  }, [pathname]); // This effect runs every time the pathname changes.

  return (
    <LoadingContext.Provider value={{ isPageLoading, setIsPageLoading }}>
      {children}
    </LoadingContext.Provider>
  );
}

/**
 * A custom hook to easily access the loading context.
 * It ensures that the hook is used within a LoadingProvider.
 * @returns {LoadingContextType} The loading context value.
 */
export function useLoading() {
  const context = useContext(LoadingContext);
  if (context === undefined) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
}
