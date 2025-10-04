
"use client";

import Link from "next/link";
// UI Components
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
// Icons
import { ArrowRight, BrainCircuit, BarChartBig, MessageSquarePlus, Loader2 } from "lucide-react";
// Animation library
import { motion } from "framer-motion";
// Hooks and Contexts
import { useLoading } from "@/contexts/loading-context";
import { useAuth } from "@/contexts/auth-context";
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
    return (
      <div className="flex items-center justify-center flex-1">
        <Loader2 className="w-16 h-16 animate-spin text-primary" />
      </div>
    );
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
    <div className="container mx-auto p-4 md:p-8">
      {/* Page Header */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold font-headline text-foreground">Welcome to Your Dashboard, {userName}!</h1>
        <p className="text-muted-foreground">Select a tool below to get started.</p>
      </header>

      {/* Main content grid with feature cards */}
      <div className="flex flex-col gap-8"> 
        {/* AI Resume Ranker Card */}
        <motion.div
          initial="initial"
          whileHover="hover"
          whileTap={{ scale: 0.98 }}
          variants={cardHoverVariants}
        >
          <Link href="/resume-ranker" onClick={handleLinkClick} className="block group">
            <Card className="shadow-lg h-full flex flex-col border border-primary/10 hover:border-primary/50 transition-colors duration-300">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <BrainCircuit className="w-12 h-12 text-primary mb-2" /> 
                  <ArrowRight className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" /> 
                </div>
                <CardTitle className="text-2xl font-headline text-primary">AI Resume Ranker</CardTitle> 
              </CardHeader>
              <CardContent className="flex-grow">
                <CardDescription className="text-base"> 
                  Upload job descriptions and resumes to intelligently rank candidates. Leverage AI insights for faster, more accurate screening.
                </CardDescription>
              </CardContent>
            </Card>
          </Link>
        </motion.div>

        {/* Grid for smaller feature cards */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* ATS Score Finder Card */}
          <motion.div
            initial="initial"
            whileHover="hover"
            whileTap={{ scale: 0.98 }}
            variants={cardHoverVariants}
          >
            <Link href="/ats-score-finder" onClick={handleLinkClick} className="block group">
               <Card className="shadow-lg h-full flex flex-col hover:border-primary/50 transition-colors duration-300">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <BarChartBig className="w-10 h-10 text-primary mb-2" />
                    <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <CardTitle className="text-xl font-headline text-primary">ATS Score Finder</CardTitle>
                </CardHeader>
                <CardContent className="flex-grow">
                  <CardDescription>
                    Analyze resumes for Applicant Tracking System (ATS) compatibility. Get scores and suggestions to optimize for automated screening.
                  </CardDescription>
                </CardContent>
              </Card>
            </Link>
          </motion.div>

          {/* Interview Question Generator Card */}
          <motion.div
            initial="initial"
            whileHover="hover"
            whileTap={{ scale: 0.98 }}
            variants={cardHoverVariants}
          >
            <Link href="/interview-question-generator" onClick={handleLinkClick} passHref className="block group"> 
               <Card className="shadow-lg h-full flex flex-col hover:border-primary/50 transition-colors duration-300">
                 <CardHeader>
                    <div className="flex items-center justify-between">
                        <MessageSquarePlus className="w-10 h-10 text-primary mb-2" />
                        <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <CardTitle className="text-xl font-headline text-primary">AI Interview Question Generator</CardTitle>
                 </CardHeader>
                 <CardContent className="flex-grow">
                    <CardDescription>
                        Upload a job description to generate categorized interview questions (technical, behavioral, etc.) tailored to the role.
                    </CardDescription>
                 </CardContent>
              </Card>
            </Link>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
