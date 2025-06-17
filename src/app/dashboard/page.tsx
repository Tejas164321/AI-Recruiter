
"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowRight, BrainCircuit, BarChartBig, MessageSquarePlus, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useLoading } from "@/contexts/loading-context";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from 'next/navigation';
import { useEffect } from "react";

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

export default function DashboardPage() {
  const { setIsPageLoading } = useLoading();
  const { currentUser, isLoadingAuth } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // This effect runs after the AuthProvider has determined the auth state
    if (!isLoadingAuth && !currentUser) {
      router.push('/login');
    } else if (!isLoadingAuth && currentUser) {
      // User is authenticated, safe to turn off general page loader
      setIsPageLoading(false);
    }
  }, [currentUser, isLoadingAuth, router, setIsPageLoading]);

  // Display loading state or redirect if not authenticated
  if (isLoadingAuth || !currentUser) {
    // AuthProvider already shows a full-page loader during initial auth check.
    // This is a fallback or for subsequent checks if needed.
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-16 h-16 animate-spin text-primary" />
      </div>
    );
  }
  
  // User is authenticated, render the dashboard
  const userName = currentUser.displayName || currentUser.email || "Valued User";

  const handleLinkClick = () => {
    setIsPageLoading(true);
  };

  return (
    <div className="container mx-auto p-4 md:p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold font-headline text-foreground">Welcome to Your Dashboard, {userName}!</h1>
        <p className="text-muted-foreground">Select a tool below to get started.</p>
      </header>

      <div className="flex flex-col gap-8"> 
        <motion.div
          initial="initial"
          whileHover="hover"
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

        <div className="grid gap-6 md:grid-cols-2">
          <motion.div
            initial="initial"
            whileHover="hover"
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

          <motion.div
            initial="initial"
            whileHover="hover"
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
