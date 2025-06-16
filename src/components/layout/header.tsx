
"use client";

import { BrainCircuit } from "lucide-react";
import { ThemeToggleButton } from "@/components/theme-toggle-button";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function Header() {
  // Placeholder for authentication state
  const isAuthenticated = false; 

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        <Link href="/" className="mr-auto flex items-center cursor-pointer" aria-label="Go to homepage">
          <BrainCircuit className="h-8 w-8 mr-2 text-primary" />
          <span className="text-2xl font-bold text-primary font-headline">ResumeRank AI</span>
        </Link>
        
        <nav className="flex items-center space-x-2 md:space-x-4">
          {isAuthenticated ? (
            <>
              <Button variant="outline" asChild>
                <Link href="/dashboard">Dashboard</Link>
              </Button>
              {/* Add a User Profile button or Logout here */}
            </>
          ) : (
            <>
              <Button variant="ghost" asChild>
                <Link href="/login">Sign In</Link>
              </Button>
              <Button asChild>
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
