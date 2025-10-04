
"use client";

// Icons from lucide-react
import { BrainCircuit, Loader2, LogOut, LayoutDashboard, Menu, LogIn, UserPlus } from "lucide-react";
// UI Components
import { ThemeToggleButton } from "@/components/theme-toggle-button";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
// Next.js and React hooks
import Link from "next/link";
import { useRouter } from "next/navigation";
// Contexts and Hooks
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
// Firebase
import { signOut } from "firebase/auth";
import { auth as firebaseAuthModule } from "@/lib/firebase/config";
// Animation
import { motion } from "framer-motion";

/**
 * The main header component for the application.
 * It is responsive and displays different navigation items based on authentication status.
 */
export function Header() {
  const { currentUser, isLoadingAuth } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  /**
   * Handles the user sign-out process.
   */
  const handleSignOut = async () => {
    // Prevent sign-out if Firebase auth isn't configured.
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
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo and App Name */}
        <Link href="/" className="flex items-center gap-2 cursor-pointer mr-4" aria-label="Go to homepage">
          <BrainCircuit className="h-8 w-8 text-primary" />
          <span className="text-2xl font-bold text-primary font-headline hidden sm:inline-block">AI Recruiter</span>
        </Link>
        
        {/* Desktop Navigation (hidden on small screens) */}
        <nav className="hidden md:flex items-center gap-2">
           {isLoadingAuth ? (
                // Show a loader while checking authentication state
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : currentUser ? (
                // Show Dashboard and Sign Out buttons for authenticated users
                <>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button variant="outline" asChild><Link href="/dashboard"><LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard</Link></Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button variant="ghost" onClick={handleSignOut} disabled={!firebaseAuthModule}><LogOut className="mr-2 h-4 w-4" /> Sign Out</Button>
                </motion.div>
                </>
            ) : (
                // Show Sign In and Sign Up buttons for unauthenticated users
                <>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button variant="ghost" asChild disabled={!firebaseAuthModule}><Link href="/login">Sign In</Link></Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button asChild disabled={!firebaseAuthModule}><Link href="/signup">Sign Up</Link></Button>
                </motion.div>
                </>
            )}
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
               <ThemeToggleButton />
            </motion.div>
        </nav>

        {/* Mobile Navigation (visible only on small screens) */}
        <div className="md:hidden flex items-center gap-2">
            <div className="flex items-center gap-2">
                 {!isLoadingAuth && (
                    currentUser ? (
                      // For logged-in users, show a prominent Dashboard button
                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Button variant="outline" size="sm" asChild><Link href="/dashboard">Dashboard</Link></Button>
                      </motion.div>
                    ) : (
                      // For new users, show Sign In and Sign Up buttons
                      <>
                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                          <Button variant="ghost" size="sm" asChild><Link href="/login">Sign In</Link></Button>
                      </motion.div>
                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                          <Button size="sm" asChild><Link href="/signup">Sign Up</Link></Button>
                      </motion.div>
                      </>
                 ))}
            </div>
            {/* Hamburger menu using a Sheet component */}
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
                            // Menu items for authenticated users
                            <>
                                <SheetClose asChild><Link href="/dashboard"><Button variant="outline" className="w-full justify-start"><LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard</Button></Link></SheetClose>
                                <Button variant="ghost" onClick={handleSignOut} disabled={!firebaseAuthModule} className="w-full justify-start"><LogOut className="mr-2 h-4 w-4" /> Sign Out</Button>
                            </>
                        ) : (
                            // Menu items for unauthenticated users
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
    </header>
  );
}
