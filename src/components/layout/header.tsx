
"use client";

import { BrainCircuit, Loader2, LogOut, LayoutDashboard, Menu, LogIn, UserPlus } from "lucide-react";
import { ThemeToggleButton } from "@/components/theme-toggle-button";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { signOut } from "firebase/auth";
import { auth as firebaseAuthModule } from "@/lib/firebase/config";
import { motion, useScroll, useMotionValueEvent } from "framer-motion";
import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Defines the animation variants for the header.
 * - 'top': Full-width bar.
 * - 'scrolled': A slightly narrower, centered capsule.
 */
const headerVariants = {
    top: {
        width: '100%',
        marginTop: '0rem',
        borderRadius: '0px',
        boxShadow: '0px 2px 10px hsla(var(--primary), 0.1)',
        transition: { type: "spring", stiffness: 300, damping: 30 }
    },
    scrolled: {
        width: '95%',
        maxWidth: '1400px', // Corresponds to 2xl screen size for consistency
        marginTop: '0.5rem',
        borderRadius: '9999px',
        boxShadow: '0px 12px 28px hsla(var(--primary), 0.2)',
        transition: { type: "spring", stiffness: 300, damping: 30 }
    },
};

/**
 * The main header component for the application. It starts as a full-width bar
 * and transitions into a slightly narrower, floating capsule on scroll.
 */
export function Header() {
  const { currentUser, isLoadingAuth } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const { scrollY } = useScroll();
  const [isScrolled, setIsScrolled] = useState(false);

  // Hook to update the 'isScrolled' state based on scroll position.
  useMotionValueEvent(scrollY, "change", (latest) => {
    setIsScrolled(latest > 50); // Trigger animation after scrolling 50px
  });

  /**
   * Handles the user sign-out process.
   */
  const handleSignOut = async () => {
    if (!firebaseAuthModule) {
      toast({ title: "Authentication Error", description: "Cannot sign out.", variant: "destructive" });
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
    <header className="fixed top-0 z-50 flex w-full items-start justify-center">
      <motion.div
        className={cn(
            "flex h-16 items-center justify-between px-6 transition-colors duration-300 border-border border",
            "bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/60"
        )}
        initial="top"
        animate={isScrolled ? "scrolled" : "top"}
        variants={headerVariants}
      >
        <div className="flex h-full w-full items-center justify-between gap-4">

            {/* --- Left Side: Brand Logo --- */}
            <Link href="/" aria-label="Go to homepage" className="flex items-center gap-2">
                 <BrainCircuit className="h-8 w-8 text-primary" />
                <span className="text-2xl font-bold text-primary font-headline hidden sm:inline-block">AI Recruiter</span>
            </Link>

            {/* --- Right Side: Desktop Navigation & Actions --- */}
            <nav className="hidden h-full items-center gap-1 md:flex">
                {isLoadingAuth ? (
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                ) : currentUser ? (
                    <>
                        <Button variant="ghost" asChild><Link href="/dashboard" aria-label="Dashboard"><LayoutDashboard />Dashboard</Link></Button>
                        <Button variant="ghost" onClick={handleSignOut} disabled={!firebaseAuthModule} aria-label="Sign Out"><LogOut />Sign Out</Button>
                    </>
                ) : (
                    <>
                        <Button variant="ghost" asChild disabled={!firebaseAuthModule}><Link href="/login">Sign In</Link></Button>
                        <Button asChild disabled={!firebaseAuthModule}><Link href="/signup">Sign Up</Link></Button>
                    </>
                )}
                <Separator orientation="vertical" className="h-6 mx-2" />
                <ThemeToggleButton />
            </nav>

            {/* --- Right Side: Mobile Menu --- */}
            <div className="md:hidden flex items-center gap-2">
                 <ThemeToggleButton />
                <Sheet>
                    <SheetTrigger asChild>
                        <Button variant="outline" size="icon"><Menu className="h-6 w-6" /><span className="sr-only">Open menu</span></Button>
                    </SheetTrigger>
                    <SheetContent side="right" className="w-[300px] p-4 flex flex-col">
                        <div className="mb-6">
                            <SheetClose asChild><Link href="/" className="flex items-center gap-2 cursor-pointer"><BrainCircuit className="h-7 w-7 text-primary" /><span className="text-xl font-bold text-primary font-headline">AI Recruiter</span></Link></SheetClose>
                        </div>
                        <Separator className="mb-4" />
                        <div className="flex flex-col gap-3 flex-grow">
                        {isLoadingAuth ? (
                                <div className="flex justify-center items-center p-4"><Loader2 className="h-6 w-6 animate-spin" /></div>
                            ) : currentUser ? (
                                <>
                                    <SheetClose asChild><Link href="/dashboard"><Button variant="outline" className="w-full justify-start"><LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard</Button></Link></SheetClose>
                                    <Button variant="ghost" onClick={handleSignOut} disabled={!firebaseAuthModule} className="w-full justify-start"><LogOut className="mr-2 h-4 w-4" /> Sign Out</Button>
                                </>
                            ) : (
                                <>
                                    <SheetClose asChild><Link href="/login"><Button variant="ghost" disabled={!firebaseAuthModule} className="w-full justify-start"><LogIn className="mr-2 h-4 w-4" /> Sign In</Button></Link></SheetClose>
                                    <SheetClose asChild><Link href="/signup"><Button disabled={!firebaseAuthModule} className="w-full justify-start"><UserPlus className="mr-2 h-4 w-4" /> Sign Up</Button></Link></SheetClose>
                                </>
                            )}
                        </div>
                    </SheetContent>
                </Sheet>
            </div>
        </div>
      </motion.div>
    </header>
  );
}
