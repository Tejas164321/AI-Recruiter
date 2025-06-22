
"use client";

import { BrainCircuit, Loader2, LogOut, LayoutDashboard, Menu } from "lucide-react";
import { ThemeToggleButton } from "@/components/theme-toggle-button";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { signOut } from "firebase/auth";
import { auth as firebaseAuthModule } from "@/lib/firebase/config";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";


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

  const navLinks = (
    <>
      {isLoadingAuth ? (
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      ) : currentUser ? (
        <>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button variant="outline" asChild>
              <Link href="/dashboard">
                <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard
              </Link>
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button variant="ghost" onClick={handleSignOut} disabled={!firebaseAuthModule}>
              <LogOut className="mr-2 h-4 w-4" /> Sign Out
            </Button>
          </motion.div>
        </>
      ) : (
        <>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button variant="ghost" asChild disabled={!firebaseAuthModule}>
              <Link href="/login">Sign In</Link>
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button asChild disabled={!firebaseAuthModule}>
              <Link href="/signup">Sign Up</Link>
            </Button>
          </motion.div>
        </>
      )}
    </>
  );
  
  const mobileNavLinks = (
      <>
        {isLoadingAuth ? (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        ) : currentUser ? (
            <>
                <SheetClose asChild>
                    <Link href="/dashboard" className="w-full">
                        <Button variant="outline" className="w-full justify-start">
                             <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard
                        </Button>
                    </Link>
                </SheetClose>
                 <Button variant="ghost" onClick={handleSignOut} disabled={!firebaseAuthModule} className="w-full justify-start">
                    <LogOut className="mr-2 h-4 w-4" /> Sign Out
                </Button>
            </>
        ) : (
            <>
                <SheetClose asChild>
                    <Link href="/login" className="w-full">
                        <Button variant="ghost" disabled={!firebaseAuthModule} className="w-full justify-start">
                          Sign In
                        </Button>
                    </Link>
                </SheetClose>
                <SheetClose asChild>
                     <Link href="/signup" className="w-full">
                        <Button disabled={!firebaseAuthModule} className="w-full justify-start">
                          Sign Up
                        </Button>
                    </Link>
                </SheetClose>
            </>
        )}
      </>
  );

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 cursor-pointer mr-4" aria-label="Go to homepage">
          <BrainCircuit className="h-8 w-8 text-primary" />
          <span className="text-2xl font-bold text-primary font-headline hidden sm:inline-block">ResumeRank AI</span>
        </Link>
        
        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-2">
          {navLinks}
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
            <ThemeToggleButton />
          </motion.div>
        </nav>

        {/* Mobile Navigation */}
        <div className="md:hidden flex items-center gap-2">
            <ThemeToggleButton />
            <Sheet>
                <SheetTrigger asChild>
                    <Button variant="outline" size="icon">
                        <Menu className="h-6 w-6" />
                        <span className="sr-only">Open menu</span>
                    </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[300px] p-4">
                   <div className="flex flex-col h-full">
                     <div className="mb-6">
                        <SheetClose asChild>
                            <Link href="/" className="flex items-center gap-2 cursor-pointer" aria-label="Go to homepage">
                                <BrainCircuit className="h-7 w-7 text-primary" />
                                <span className="text-xl font-bold text-primary font-headline">ResumeRank AI</span>
                            </Link>
                        </SheetClose>
                    </div>
                    <Separator className="mb-4" />
                    <div className="flex flex-col gap-3">
                      {mobileNavLinks}
                    </div>
                   </div>
                </SheetContent>
            </Sheet>
        </div>
      </div>
    </header>
  );
}
