
"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowRight, BrainCircuit, BarChartBig } from "lucide-react";

export default function DashboardPage() {
  // In a real app, you'd protect this route and fetch user data
  const userName = "Valued User"; // Placeholder

  return (
    <div className="container mx-auto p-4 md:p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold font-headline text-foreground">Welcome to Your Dashboard, {userName}!</h1>
        <p className="text-muted-foreground">Select a tool below to get started.</p>
      </header>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
        <Link href="/resume-ranker" className="block group">
          <Card className="shadow-lg hover:shadow-xl transition-all duration-300 h-full flex flex-col hover:border-primary/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <BrainCircuit className="w-10 h-10 text-primary mb-2" />
                <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <CardTitle className="text-xl font-headline text-primary">AI Resume Ranker</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow">
              <CardDescription>
                Upload job descriptions and resumes to intelligently rank candidates. Leverage AI insights for faster, more accurate screening.
              </CardDescription>
            </CardContent>
          </Card>
        </Link>

        <Link href="/ats-score-finder" className="block group">
          <Card className="shadow-lg hover:shadow-xl transition-all duration-300 h-full flex flex-col hover:border-primary/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <BarChartBig className="w-10 h-10 text-primary mb-2" />
                 <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <CardTitle className="text-xl font-headline text-primary">ATS Score Finder</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow">
              <CardDescription>
                Analyze resumes for Applicant Tracking System (ATS) compatibility. Get scores and suggestions to optimize for automated screening. (Coming Soon)
              </CardDescription>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
