
"use client";

import type { ReactNode, Dispatch, SetStateAction } from 'react';
import { createContext, useContext, useState, useEffect } from 'react';
// Firebase authentication imports
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth as firebaseAuthModule } from '@/lib/firebase/config';
// UI components
import { Loader2 } from 'lucide-react';

/**
 * Defines the shape of the authentication context's value.
 */
interface AuthContextType {
  currentUser: User | null;
  isLoadingAuth: boolean;
  setCurrentUser: Dispatch<SetStateAction<User | null>>;
}

// Create the context with an undefined initial value.
const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * The AuthProvider component wraps parts of the application that need access to authentication state.
 * It listens for changes in the user's login status and provides this information to its children.
 * @param {object} props - The component props.
 * @param {ReactNode} props.children - The child components that will have access to this context.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  // State to hold the currently authenticated user object.
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  // State to track the initial authentication check.
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    // Only set up the listener if Firebase Auth is properly initialized.
    if (firebaseAuthModule) {
      // `onAuthStateChanged` is a Firebase listener that fires whenever the user's sign-in state changes.
      unsubscribe = onAuthStateChanged(firebaseAuthModule, (user) => {
        setCurrentUser(user); // Set the user object (or null if signed out).
        setIsLoadingAuth(false); // Mark the initial auth check as complete.
      });
    } else {
      // If Firebase Auth isn't available, stop the loading state.
      console.warn("AuthContext: Firebase Auth module not available. Authentication will not function.");
      setCurrentUser(null);
      setIsLoadingAuth(false);
    }

    // Cleanup function: Unsubscribe from the listener when the component unmounts to prevent memory leaks.
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []); // The empty dependency array ensures this effect runs only once on mount.

  // NOTE: The initial loading state is now handled inside the specific pages (Login, Signup)
  // to allow the main layout to render immediately. This avoids showing a full-screen loader
  // over pages that don't require authentication, improving the initial page load experience.

  // Provide the authentication state to all child components.
  return (
    <AuthContext.Provider value={{ currentUser, isLoadingAuth, setCurrentUser }}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * A custom hook to easily access the authentication context.
 * It ensures that the hook is used within an AuthProvider.
 * @returns {AuthContextType} The authentication context value.
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
