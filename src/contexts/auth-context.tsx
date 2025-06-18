
"use client";

import type { ReactNode, Dispatch, SetStateAction } from 'react';
import { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth as firebaseAuthModule } from '@/lib/firebase/config'; // Renamed import
import { Loader2 } from 'lucide-react';

interface AuthContextType {
  currentUser: User | null;
  isLoadingAuth: boolean;
  setCurrentUser: Dispatch<SetStateAction<User | null>>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    if (firebaseAuthModule) { // Check if Firebase Auth was initialized
      unsubscribe = onAuthStateChanged(firebaseAuthModule, (user) => {
        setCurrentUser(user);
        setIsLoadingAuth(false);
      });
    } else {
      // Firebase Auth is not available (likely due to missing config)
      console.warn("AuthContext: Firebase Auth module not available. User authentication will not function.");
      setCurrentUser(null);
      setIsLoadingAuth(false);
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  if (isLoadingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ currentUser, isLoadingAuth, setCurrentUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
