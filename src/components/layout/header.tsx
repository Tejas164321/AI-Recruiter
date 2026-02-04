"use client";

import { Snail, Loader2, LayoutDashboard, Menu, LogIn, UserPlus } from "lucide-react";
import { ThemeToggleButton } from "@/components/theme-toggle-button";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { signOut } from "firebase/auth";
import { auth as firebaseAuthModule } from "@/lib/firebase/config";
import { motion, useScroll, useMotionValueEvent, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Variants for the main header animation.
 * Optimized for 60fps performance using scale/transform instead of height/margin where possible.
 */
const headerVariants = {
  top: {
    y: 0,
    width: "100%",
    maxWidth: "1400px",
    backgroundColor: "rgba(255, 255, 255, 0)", // Transparent initially
    borderBottomColor: "rgba(0,0,0,0)",
    transition: { type: "spring", stiffness: 300, damping: 30 },
  },
  scrolled: {
    y: 0,
    width: "calc(100% - 2rem)",
    maxWidth: "1200px",
    backgroundColor: "rgba(253, 253, 253, 0.95)", // #fdfdfd
    borderBottomColor: "rgba(0,0,0,0.1)",
    transition: { type: "spring", stiffness: 300, damping: 30 },
  },
};

const logoVariants = {
  top: { opacity: 1, x: 0, scale: 1 },
  scrolled: { opacity: 1, x: 0, scale: 0.9 },
};

export function Header() {
  const { currentUser, isLoadingAuth } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const { scrollY } = useScroll();
  const [isScrolled, setIsScrolled] = useState(false);

  useMotionValueEvent(scrollY, "change", (latest) => {
    const shouldBeScrolled = latest > 10;
    if (isScrolled !== shouldBeScrolled) {
      setIsScrolled(shouldBeScrolled);
    }
  });

  const handleSignOut = async () => {
    if (!firebaseAuthModule) return;
    try {
      await signOut(firebaseAuthModule);
      toast({ title: "Signed Out", description: "Session terminated." });
      router.push('/');
    } catch (error: any) {
      toast({ title: "Sign Out Failed", description: error.message, variant: "destructive" });
    }
  };

  return (
    <header className="fixed top-0 z-50 w-full flex justify-center pointer-events-none pt-4">
      <motion.div
        className={cn(
          "pointer-events-auto transition-all duration-300",
          // Base styles: Thicker and balanced
          "flex items-center justify-between px-8 py-3 h-18",
          // Scrolled: keep rounded/bordered look
          isScrolled
            ? "rounded-full border-2 border-dashed border-foreground/10 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.05)] backdrop-blur-md bg-[#fdfdfd]/95"
            : "rounded-none border-b-0 border-transparent bg-transparent"
        )}
        initial="top"
        animate={isScrolled ? "scrolled" : "top"}
        variants={headerVariants}
        // Force hardware acceleration
        style={{ willChange: "transform, width, background-color" }}
      >
        {/* === BRAND === */}
        <Link href="/" className="flex items-center gap-4 group">
          <motion.div
            // Circular Logo Container
            className="relative flex items-center justify-center w-10 h-10 bg-primary text-primary-foreground rounded-full border-2 border-primary group-hover:scale-105 transition-transform shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
            whileTap={{ scale: 0.9 }}
          >
            <Snail className="w-5 h-5" />
          </motion.div>
          <div className="flex flex-col justify-center">
            <span className="font-headline font-black text-lg tracking-tight leading-none">
              AI RECRUITER
            </span>
          </div>
        </Link>

        {/* === DESKTOP NAV === */}
        <nav className="hidden md:flex items-center gap-6">
          {isLoadingAuth ? (
            <Loader2 className="w-5 h-5 animate-spin opacity-50" />
          ) : currentUser ? (
            <>
              <Link
                href="/dashboard"
                className={cn(
                  "font-mono text-sm font-bold uppercase tracking-wider hover:text-primary transition-colors relative group",
                  pathname === "/dashboard" ? "text-primary" : "text-muted-foreground"
                )}
              >
                <span className="relative z-10 flex items-center gap-2">
                  <LayoutDashboard className="w-4 h-4" /> Dashboard
                </span>
                {/* Underline highlighter */}
                <span className={cn(
                  "absolute bottom-0 left-0 w-full h-[2px] bg-primary scale-x-0 group-hover:scale-x-100 transition-transform origin-left",
                  pathname === "/dashboard" && "scale-x-100"
                )} />
              </Link>

              {/* Comic Style Profile Button */}
              <Link href="/profile" className="relative group">
                <div className={cn(
                  "flex items-center gap-3 pl-1 pr-4 py-1.5 border-2 border-foreground/10 rounded-full transition-all bg-background",
                  "group-hover:border-primary group-hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] group-hover:-translate-y-0.5"
                )}>
                  {/* Avatar Circle */}
                  <div className="w-8 h-8 rounded-full border-2 border-foreground/10 overflow-hidden relative grayscale group-hover:grayscale-0 transition-all">
                    <img
                      src={currentUser.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${currentUser.email}`}
                      alt="User"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="flex flex-col items-start leading-none">
                    <span className="font-headline font-bold text-sm">
                      {currentUser.displayName?.split(' ')[0] || "OPERATOR"}
                    </span>
                    <span className="text-[9px] font-mono text-muted-foreground uppercase">
                      View Profile
                    </span>
                  </div>
                </div>
              </Link>
            </>
          ) : (
            <>
              <Link href="/login" className="font-bold hover:underline decoration-2 underline-offset-4">
                Login
              </Link>
              <Link href="/signup">
                <Button className="font-bold border-2 border-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all">
                  Request Access
                </Button>
              </Link>
            </>
          )}

          <div className="h-6 w-[2px] bg-foreground/10 rotate-12 mx-2" />
          <ThemeToggleButton />
        </nav>

        {/* === MOBILE MENU === */}
        <div className="md:hidden flex items-center gap-2">
          <ThemeToggleButton />
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="border-2 border-foreground shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent className="border-l-2 border-foreground">
              <div className="flex flex-col gap-6 mt-10">
                {currentUser ? (
                  <>
                    <Link href="/dashboard" className="text-2xl font-headline font-black uppercase hover:text-primary">Dashboard</Link>
                    <Link href="/profile" className="text-2xl font-headline font-black uppercase hover:text-primary">My Dossier</Link>
                    <button onClick={handleSignOut} className="text-left font-mono text-red-600 hover:underline">Disconnect Session</button>
                  </>
                ) : (
                  <>
                    <Link href="/login" className="text-2xl font-headline font-black uppercase">Login System</Link>
                    <Link href="/signup" className="text-2xl font-headline font-black uppercase text-primary">New Recruit</Link>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>

      </motion.div>
    </header>
  );
}
