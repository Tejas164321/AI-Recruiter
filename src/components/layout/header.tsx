
"use client";

import { BrainCircuit, Loader2, LogOut, LayoutDashboard } from "lucide-react";
import { ThemeToggleButton } from "@/components/theme-toggle-button";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { signOut } from "firebase/auth";
import { auth as firebaseAuthModule } from "@/lib/firebase/config"; // Renamed import
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

export function Header() {
  const { currentUser, isLoadingAuth } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const handleSignOut = async () => {
    if (!firebaseAuthModule) {
      toast({
        title: "Authentication Error",
        description: "Firebase authentication is not configured. Cannot sign out.",
        variant: "destructive",
      });
      return;
    }
    try {
      await signOut(firebaseAuthModule);
      toast({ title: "Signed Out", description: "You have been successfully signed out." });
      router.push('/'); 
    } catch (error) {
      console.error("Sign out error:", error);
      toast({ title: "Sign Out Failed", description: "Could not sign out. Please try again.", variant: "destructive" });
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        <Link href="/" className="mr-auto flex items-center cursor-pointer" aria-label="Go to homepage">
          <BrainCircuit className="h-8 w-8 mr-2 text-primary" />
          <span className="text-2xl font-bold text-primary font-headline">ResumeRank AI</span>
        </Link>
        
        <nav className="flex items-center space-x-2 md:space-x-4">
          {isLoadingAuth ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : currentUser ? (
            <>
              <Button variant="outline" asChild>
                <Link href="/dashboard">
                  <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard
                </Link>
              </Button>
              <Button variant="ghost" onClick={handleSignOut} disabled={!firebaseAuthModule}>
                <LogOut className="mr-2 h-4 w-4" /> Sign Out
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" asChild disabled={!firebaseAuthModule}>
                <Link href="/login">Sign In</Link>
              </Button>
              <Button asChild disabled={!firebaseAuthModule}>
                <Link href="/signup">Sign Up</Link>
              </Button>
            </>
          )}
          <ThemeToggleButton />
        </nav>
      </div>
    </header>
  );
}
