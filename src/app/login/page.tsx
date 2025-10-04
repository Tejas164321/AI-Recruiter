
"use client";

import Link from "next/link";
import React, { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
// UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
// Icons
import { Loader2 } from "lucide-react";
// Hooks and Contexts
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { useLoading } from "@/contexts/loading-context";
// Firebase Authentication
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth as firebaseAuthModule } from "@/lib/firebase/config";

/**
 * Login Page Component.
 * This page provides a form for users to sign in to their accounts using email and password.
 */
export default function LoginPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { currentUser, isLoadingAuth } = useAuth();
  const { setIsPageLoading } = useLoading();

  // State for the form fields and loading status
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Effect to redirect already logged-in users to the dashboard
  useEffect(() => {
    if (!isLoadingAuth && currentUser) {
      router.push('/dashboard');
    }
  }, [currentUser, isLoadingAuth, router]);

  /**
   * Handles the form submission for user login.
   * @param {React.FormEvent<HTMLFormElement>} event - The form submission event.
   */
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);

    // Check if Firebase Auth is initialized
    if (!firebaseAuthModule) {
      toast({
        title: "Authentication Error",
        description: "Firebase authentication is not configured.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    try {
      // Attempt to sign in with Firebase
      await signInWithEmailAndPassword(firebaseAuthModule, email, password);
      toast({
        title: "Login Successful",
        description: "Welcome back!",
      });
      // Show page loader while redirecting to the dashboard
      setIsPageLoading(true);
      router.push('/dashboard'); 
    } catch (error: any) {
      // Handle login errors
      console.error("Login error:", error);
      let errorMessage = "Failed to sign in. Please check your credentials.";
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        errorMessage = "Invalid email or password.";
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = "Please enter a valid email address.";
      }
      toast({
        title: "Login Failed",
        description: errorMessage,
        variant: "destructive",
      });
      setIsLoading(false); // Stop loading on error
    } 
  };
  
  // Show a full-page loader while the authentication state is being checked
  if (isLoadingAuth || currentUser) {
    return (
      <div className="flex items-center justify-center flex-1">
        <Loader2 className="w-16 h-16 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-background p-4 pt-8">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold font-headline">Welcome Back!</CardTitle>
          <CardDescription>Enter your credentials to access your account.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Input */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={isLoading}/>
            </div>
            {/* Password Input */}
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder="••••••••" required value={password} onChange={(e) => setPassword(e.target.value)} disabled={isLoading}/>
            </div>
            {/* Submit Button */}
            <Button type="submit" className="w-full" disabled={isLoading || !firebaseAuthModule}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign In
            </Button>
            {/* Fallback message if Firebase isn't configured */}
             {!firebaseAuthModule && (
              <p className="text-xs text-center text-destructive mt-2">Authentication service unavailable.</p>
            )}
          </form>
          {/* Links to Sign Up and Home */}
          <div className="mt-4 text-center text-sm">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="underline text-primary hover:text-primary/80" prefetch={false}>
              Sign Up
            </Link>
          </div>
           <div className="mt-2 text-center text-sm">
            <Link href="/" className="underline text-muted-foreground hover:text-primary/80" prefetch={false}>
              Back to Home
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
