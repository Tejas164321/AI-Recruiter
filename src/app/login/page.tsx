
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import React, { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth as firebaseAuthModule } from "@/lib/firebase/config"; // Renamed import
import { useRouter } from 'next/navigation';
import { useAuth } from "@/contexts/auth-context";
import { useLoading } from "@/contexts/loading-context";

export default function LoginPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { currentUser, isLoadingAuth } = useAuth();
  const { setIsPageLoading } = useLoading();

  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (!isLoadingAuth && currentUser) {
      router.push('/dashboard');
    }
  }, [currentUser, isLoadingAuth, router]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);

    if (!firebaseAuthModule) {
      toast({
        title: "Authentication Error",
        description: "Firebase authentication is not configured. Please contact support or check setup.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    try {
      await signInWithEmailAndPassword(firebaseAuthModule, email, password);
      toast({
        title: "Login Successful",
        description: "Welcome back!",
        variant: "default", 
      });
      setIsPageLoading(true);
      router.push('/dashboard'); 
    } catch (error: any) {
      console.error("Login error:", error);
      let errorMessage = "Failed to sign in. Please check your credentials.";
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        errorMessage = "Invalid email or password.";
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = "Please enter a valid email address.";
      } else if (error.code === 'auth/invalid-api-key') {
        errorMessage = "Firebase configuration error. Please check API key.";
      }
      toast({
        title: "Login Failed",
        description: errorMessage,
        variant: "destructive",
      });
      setIsLoading(false); // Only set loading to false on error
    } 
    // Do not set isLoading to false on success, as the page will navigate away
  };
  
  if (isLoadingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-16 h-16 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold font-headline">Welcome Back!</CardTitle>
          <CardDescription>Enter your credentials to access your account.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="you@example.com" 
                required 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input 
                id="password" 
                type="password" 
                placeholder="••••••••" 
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading || !firebaseAuthModule}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign In
            </Button>
             {!firebaseAuthModule && (
              <p className="text-xs text-center text-destructive mt-2">Authentication service unavailable.</p>
            )}
          </form>
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
