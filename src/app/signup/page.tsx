
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
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth as firebaseAuthModule } from "@/lib/firebase/config";

/**
 * Signup Page Component.
 * This page provides a form for new users to create an account.
 */
export default function SignupPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { currentUser, isLoadingAuth } = useAuth();
  const { setIsPageLoading } = useLoading();

  // State for form fields and loading status
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Effect to redirect already logged-in users to the dashboard
  useEffect(() => {
    if (!isLoadingAuth && currentUser) {
      router.push('/dashboard');
    }
  }, [currentUser, isLoadingAuth, router]);

  /**
   * Handles the form submission for user registration.
   * @param {React.FormEvent<HTMLFormElement>} event - The form submission event.
   */
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    // Basic client-side validation
    if (password !== confirmPassword) {
      toast({ title: "Password Mismatch", description: "The passwords do not match.", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
       toast({ title: "Password Too Short", description: "Password must be at least 6 characters long.", variant: "destructive" });
      return;
    }

    setIsLoading(true);

    // Check if Firebase Auth is initialized
    if (!firebaseAuthModule) {
      toast({ title: "Authentication Error", description: "Firebase authentication is not configured.", variant: "destructive" });
      setIsLoading(false);
      return;
    }

    try {
      // Attempt to create a new user with Firebase
      await createUserWithEmailAndPassword(firebaseAuthModule, email, password);
      toast({ title: "Sign Up Successful", description: "Your account has been created. Welcome!" });
      // Show page loader while redirecting to dashboard
      setIsPageLoading(true);
      router.push('/dashboard'); 
    } catch (error: any) {
      // Handle signup errors
      console.error("Signup error:", error);
      let errorMessage = "Failed to create an account. Please try again.";
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = "This email address is already in use.";
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = "Please enter a valid email address.";
      } else if (error.code === 'auth/weak-password') {
        errorMessage = "The password is too weak.";
      }
      toast({ title: "Sign Up Failed", description: errorMessage, variant: "destructive" });
      setIsLoading(false); // Stop loading on error
    }
  };
  
  // Show a full-page loader while checking authentication state or if a user is already logged in
  if (isLoadingAuth || currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-16 h-16 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold font-headline">Create an Account</CardTitle>
          <CardDescription>Enter your details to get started with AI Recruiter.</CardDescription>
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
              <Label htmlFor="password">Password (min. 6 characters)</Label>
              <Input id="password" type="password" placeholder="••••••••" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} disabled={isLoading}/>
            </div>
            {/* Confirm Password Input */}
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input id="confirm-password" type="password" placeholder="••••••••" required minLength={6} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} disabled={isLoading}/>
            </div>
            {/* Submit Button */}
            <Button type="submit" className="w-full" disabled={isLoading || !firebaseAuthModule}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign Up
            </Button>
            {/* Fallback message if Firebase isn't configured */}
            {!firebaseAuthModule && (
              <p className="text-xs text-center text-destructive mt-2">Authentication service unavailable.</p>
            )}
          </form>
          {/* Links to Sign In and Home */}
          <div className="mt-4 text-center text-sm">
            Already have an account?{" "}
            <Link href="/login" className="underline text-primary hover:text-primary/80" prefetch={false}>
              Sign In
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
