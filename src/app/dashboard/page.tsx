
"use client";

import Link from "next/link";
// UI Components
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
// Icons
import { ArrowRight, BrainCircuit, BarChartBig, MessageSquarePlus, Loader2 } from "lucide-react";
// Animation library
import { motion } from "framer-motion";
// Hooks and Contexts
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';
import { useLoading } from '@/contexts/loading-context';
import { DashboardSkeleton } from '@/components/skeletons/dashboard-skeleton';
import { useRouter } from 'next/navigation';
import { useEffect } from "react";

/**
 * Defines animation variants for the feature cards on the dashboard.
 * This creates a subtle lift and shadow effect on hover.
 */
const cardHoverVariants = {
  hover: {
    scale: 1.02,
    y: -5,
    boxShadow: "0px 12px 28px hsla(var(--primary), 0.25)",
    transition: { type: "spring", stiffness: 280, damping: 18 }
  },
  initial: {
    scale: 1,
    y: 0,
    boxShadow: "0px 6px 18px hsla(var(--primary), 0.1)"
  }
};

/**
 * Dashboard Page Component.
 * This is the main landing page for authenticated users, providing links to the application's features.
 */
export default function DashboardPage() {
  // App-wide loading state context
  const { setIsPageLoading } = useLoading();
  // Authentication context to get user status
  const { currentUser, isLoadingAuth } = useAuth();
  // Next.js router for navigation
  const router = useRouter();

  // Effect to handle authentication state changes
  useEffect(() => {
    // If authentication check is complete and no user is found, redirect to login page.
    if (!isLoadingAuth && !currentUser) {
      router.push('/login');
    }
    // If authentication is complete and user is found, turn off the page loader.
    else if (!isLoadingAuth && currentUser) {
      setIsPageLoading(false);
    }
  }, [currentUser, isLoadingAuth, router, setIsPageLoading]);

  // While checking auth state, show a loading spinner.
  // This prevents a flash of the dashboard content before redirection.
  if (isLoadingAuth || !currentUser) {
    return <DashboardSkeleton />;
  }

  // Get user's name for a personalized greeting. Fallback to email or a generic greeting.
  const userName = currentUser.displayName || currentUser.email || "Valued User";

  /**
   * Handler to activate the page loader when navigating to a new feature page.
   * This provides visual feedback to the user that the next page is loading.
   */
  const handleLinkClick = () => {
    setIsPageLoading(true);
  };

  return (
    <div className="h-screen w-full bg-graph-paper font-sans overflow-hidden flex flex-col">
      <div className="container mx-auto p-4 md:p-8 pt-24 md:pt-28 max-w-7xl flex-1 flex flex-col min-h-0">
        {/* Page Header */}
        <div className="mb-6 md:mb-8 flex-shrink-0">
          <h1 className="text-3xl md:text-5xl font-headline font-black text-foreground/90 tracking-tight mb-2 uppercase" data-text={userName}>
            Welcome back, <span className="font-hand text-primary lowercase px-2 transform -rotate-1 inline-block">{userName.includes('@') ? userName.split('@')[0] : userName}</span>
          </h1>
          <p className="font-mono text-muted-foreground text-sm tracking-widest uppercase">
            Recruitment Operations Center • {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Main content grid - PEN & PAPER LAYOUT */}
        <motion.div
          className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 pb-4 flex-1 min-h-0"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: {
                staggerChildren: 0.1,
                delayChildren: 0.2
              }
            }
          }}
        >

          {/* CARD 1: Resume Ranker */}
          <motion.div
            className="h-full"
            variants={{
              hidden: { y: 20, opacity: 0 },
              visible: { y: 0, opacity: 1, transition: { type: "tween", ease: "easeOut", duration: 0.5 } }
            }}
            whileHover={{ y: -5, transition: { duration: 0.2 } }}
            whileTap={{ scale: 0.98 }}
          >
            <Link href="/resume-ranker" onClick={handleLinkClick} className="block group h-full">
              <Card className="h-full flex flex-col border border-border/60 bg-card paper-shadow paper-stack hover:shadow-lg transition-all duration-300 rounded-lg overflow-hidden relative">
                <CardHeader className="pb-2 flex-shrink-0">
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 bg-muted/50 rounded-md">
                      <BrainCircuit className="w-6 h-6 text-foreground/70 stroke-1" />
                    </div>
                    <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                  </div>
                  <CardTitle className="text-2xl font-hand text-foreground">Resume Ranker</CardTitle>
                </CardHeader>
                <CardContent className="flex-grow flex flex-col min-h-0">
                  <CardDescription className="text-base text-muted-foreground font-light leading-relaxed mb-4 flex-grow">
                    Score candidates automatically based on job descriptions.
                  </CardDescription>
                  <div className="mt-auto pt-4 border-t border-dashed border-border/50 flex-shrink-0">
                    <span className="font-hand text-sm text-foreground/60 transform -rotate-2 inline-block">
                      Ready for analysis
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </motion.div>

          {/* CARD 2: ATS Analyzer */}
          <motion.div
            className="h-full"
            variants={{
              hidden: { y: 10, opacity: 0 },
              visible: { y: 0, opacity: 1, transition: { type: "tween", ease: "easeOut", duration: 0.5 } }
            }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            whileTap={{ scale: 0.99 }}
          >
            <Link href="/ats-score-finder" onClick={handleLinkClick} className="block group h-full">
              <Card className="h-full flex flex-col border border-border/60 bg-card paper-shadow paper-stack hover:shadow-lg transition-all duration-300 rounded-lg overflow-hidden relative">
                <CardHeader className="pb-2 flex-shrink-0">
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 bg-muted/50 rounded-md">
                      <BarChartBig className="w-6 h-6 text-foreground/70 stroke-1" />
                    </div>
                    <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                  </div>
                  <CardTitle className="text-2xl font-hand text-foreground">ATS Analyzer</CardTitle>
                </CardHeader>
                <CardContent className="flex-grow flex flex-col min-h-0">
                  <CardDescription className="text-base text-muted-foreground font-light leading-relaxed mb-4 flex-grow">
                    Check resume compatibility with filtering systems.
                  </CardDescription>
                  <div className="mt-auto pt-4 border-t border-dashed border-border/50 flex-shrink-0">
                    <span className="font-hand text-sm text-foreground/60 transform rotate-1 inline-block">
                      Parser active
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </motion.div>

          {/* CARD 3: Interview Question Generator */}
          <motion.div
            className="h-full"
            variants={{
              hidden: { y: 10, opacity: 0 },
              visible: { y: 0, opacity: 1, transition: { type: "tween", ease: "easeOut", duration: 0.5 } }
            }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            whileTap={{ scale: 0.99 }}
          >
            <Link href="/interview-question-generator" onClick={handleLinkClick} className="block group h-full">
              <Card className="h-full flex flex-col border border-border/60 bg-card paper-shadow paper-stack hover:shadow-lg transition-all duration-300 rounded-lg overflow-hidden relative">
                <CardHeader className="pb-2 flex-shrink-0">
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 bg-muted/50 rounded-md">
                      <MessageSquarePlus className="w-6 h-6 text-foreground/70 stroke-1" />
                    </div>
                    <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                  </div>
                  <CardTitle className="text-2xl font-hand text-foreground">Interview Gen</CardTitle>
                </CardHeader>
                <CardContent className="flex-grow flex flex-col min-h-0">
                  <CardDescription className="text-base text-muted-foreground font-light leading-relaxed mb-4 flex-grow">
                    Generate tailored interview questions for your role.
                  </CardDescription>
                  <div className="mt-auto pt-4 border-t border-dashed border-border/50 flex-shrink-0">
                    <span className="font-hand text-sm text-foreground/60 transform -rotate-1 inline-block">
                      AI Scripting
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
