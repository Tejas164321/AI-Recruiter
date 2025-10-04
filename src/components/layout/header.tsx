
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


const SCROLL_THRESHOLD = 100;

/**
 * The main header component for the application.
 * It is responsive and displays different navigation items based on authentication status.
 * It also features a dynamic shrinking animation on scroll.
 */
export function Header() {
  const { currentUser, isLoadingAuth } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const { scrollY } = useScroll();
  const [isScrolled, setIsScrolled] = useState(false);

  // Listen to scroll events and update the state.
  useMotionValueEvent(scrollY, "change", (latest) => {
    setIsScrolled(latest > SCROLL_THRESHOLD);
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
    <motion.header
      className="fixed top-0 z-50 flex w-full items-center justify-center"
      initial={false}
      animate={isScrolled ? "scrolled" : "top"}
    >
      <motion.div
        className={cn(
            "flex h-16 items-center justify-between transition-colors duration-300",
            "bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
        )}
        variants={{
            top: { 
                width: '100%',
                borderBottomWidth: '1px',
                borderColor: 'hsl(var(--border))',
                borderRadius: '0px',
                paddingLeft: '1rem',
                paddingRight: '1rem',
                marginTop: '0rem',
            },
            scrolled: {
                width: 'auto',
                borderBottomWidth: '1px',
                borderColor: 'hsl(var(--border))',
                borderRadius: '9999px',
                paddingLeft: '1.25rem',
                paddingRight: '1.25rem',
                marginTop: '0.5rem',
                boxShadow: '0px 8px 24px hsla(var(--primary), 0.1)',
            },
        }}
        transition={{
            type: "spring",
            stiffness: 260,
            damping: 25,
        }}
      >
        <div className="container flex h-16 items-center justify-between gap-4">
            {/* Logo and App Name */}
            <motion.div
                 variants={{
                    top: { opacity: 1, x: 0 },
                    scrolled: { opacity: 0, x: -20, transition: { duration: 0.1 } },
                }}
                className={cn("mr-4", isScrolled ? "hidden" : "flex items-center gap-2 cursor-pointer")}
            >
                <Link href="/" aria-label="Go to homepage">
                  <div className="flex items-center gap-2">
                     <BrainCircuit className="h-8 w-8 text-primary" />
                    <span className="text-2xl font-bold text-primary font-headline hidden sm:inline-block">AI Recruiter</span>
                  </div>
                </Link>
            </motion.div>

            {/* Centered Icon for Scrolled State */}
            <motion.div
                variants={{
                    top: { opacity: 0, scale: 0.8, y: 10, transition: { duration: 0.1 } },
                    scrolled: { opacity: 1, scale: 1, y: 0 },
                }}
                className={cn("absolute left-1/2 -translate-x-1/2", isScrolled ? "flex" : "hidden")}
             >
                 <Link href="/" className="p-2" aria-label="Go to homepage">
                    <BrainCircuit className="h-7 w-7 text-primary" />
                 </Link>
            </motion.div>

            {/* Desktop Navigation */}
            <nav className={cn("hidden md:flex flex-1 items-center gap-2", isScrolled ? "justify-center" : "justify-end")}>
            {isLoadingAuth ? (
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                ) : currentUser ? (
                    <>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Button variant={isScrolled ? "ghost" : "outline"} size={isScrolled ? "icon" : "default"} asChild><Link href="/dashboard" aria-label="Dashboard"><LayoutDashboard className={cn(!isScrolled && "mr-2")} /> {!isScrolled && "Dashboard"}</Link></Button>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Button variant="ghost" size={isScrolled ? "icon" : "default"} onClick={handleSignOut} disabled={!firebaseAuthModule} aria-label="Sign Out"><LogOut className={cn(!isScrolled && "mr-2")} /> {!isScrolled && "Sign Out"}</Button>
                    </motion.div>
                    </>
                ) : (
                    <>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Button variant="ghost" size={isScrolled ? "sm" : "default"} asChild disabled={!firebaseAuthModule}><Link href="/login">Sign In</Link></Button>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Button size={isScrolled ? "sm" : "default"} asChild disabled={!firebaseAuthModule}><Link href="/signup">Sign Up</Link></Button>
                    </motion.div>
                    </>
                )}
                 <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <ThemeToggleButton />
                 </motion.div>
            </nav>

            {/* Mobile Navigation */}
            <div className="md:hidden flex items-center gap-2">
                {!isLoadingAuth && (
                        currentUser ? (
                            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                <Button variant="outline" size="sm" asChild><Link href="/dashboard">Dashboard</Link></Button>
                            </motion.div>
                        ) : (
                            <>
                            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                <Button variant="ghost" size="sm" asChild><Link href="/login">Sign In</Link></Button>
                            </motion.div>
                            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                <Button size="sm" asChild><Link href="/signup">Sign Up</Link></Button>
                            </motion.div>
                            </>
                    ))}
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
                        <div className="mt-auto pt-4 border-t border-border/50">
                            <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Appearance</span>
                            <ThemeToggleButton />
                            </div>
                        </div>
                    </SheetContent>
                </Sheet>
            </div>
        </div>
      </motion.div>
    </motion.header>
  );
}
