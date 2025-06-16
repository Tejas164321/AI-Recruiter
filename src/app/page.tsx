
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Image from "next/image";
import { ArrowRight, CheckCircle, BarChartBig, Users, Lock } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-gradient-to-br from-primary/10 via-background to-background">
          <div className="container px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-2 lg:gap-12 xl:gap-24 items-center">
              <div className="flex flex-col justify-center space-y-4">
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none font-headline text-primary">
                    Unlock Your Hiring Potential with ResumeRank AI
                  </h1>
                  <p className="max-w-[600px] text-foreground md:text-xl">
                    Streamline your recruitment process with AI-powered resume screening, candidate ranking, and an upcoming ATS score checker. Make smarter hiring decisions, faster.
                  </p>
                </div>
                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                  <Link
                    href="/signup"
                    className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                    prefetch={false}
                  >
                    Get Started
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                  <Link
                    href="/#features"
                    className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-8 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                    prefetch={false}
                  >
                    Learn More
                  </Link>
                </div>
              </div>
              <Image
                src="https://placehold.co/600x400.png"
                width="600"
                height="400"
                alt="Hero"
                data-ai-hint="team collaboration"
                className="mx-auto aspect-video overflow-hidden rounded-xl object-cover sm:w-full lg:order-last"
              />
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="w-full py-12 md:py-24 lg:py-32 bg-background">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <div className="inline-block rounded-lg bg-muted px-3 py-1 text-sm">Key Features</div>
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl font-headline">
                  Everything You Need to Optimize Recruitment
                </h2>
                <p className="max-w-[900px] text-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Our platform offers a suite of tools designed to make your hiring process more efficient and effective.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl items-start gap-8 sm:grid-cols-2 md:gap-12 lg:grid-cols-3 lg:max-w-none mt-12">
              <Card className="shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-center bg-primary/10 rounded-full w-12 h-12 mb-4">
                    <BarChartBig className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="font-headline">AI-Powered Resume Ranking</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Automatically rank candidates based on job description relevance. Get match scores and AI-generated feedback to quickly identify top talent.
                  </CardDescription>
                  <ul className="mt-4 space-y-2 text-sm">
                    <li className="flex items-center"><CheckCircle className="mr-2 h-4 w-4 text-accent" />Intelligent Skill Matching</li>
                    <li className="flex items-center"><CheckCircle className="mr-2 h-4 w-4 text-accent" />ATS Compatibility Insights</li>
                    <li className="flex items-center"><CheckCircle className="mr-2 h-4 w-4 text-accent" />Customizable Filtering</li>
                  </ul>
                </CardContent>
              </Card>
              <Card className="shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-center bg-primary/10 rounded-full w-12 h-12 mb-4">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="font-headline">ATS Score Finder (Coming Soon)</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Get a detailed analysis of how well resumes are optimized for Applicant Tracking Systems. Improve your candidates' chances of getting noticed.
                  </CardDescription>
                    <ul className="mt-4 space-y-2 text-sm">
                    <li className="flex items-center"><CheckCircle className="mr-2 h-4 w-4 text-accent" />Resume Structure Analysis</li>
                    <li className="flex items-center"><CheckCircle className="mr-2 h-4 w-4 text-accent" />Keyword Optimization Tips</li>
                    <li className="flex items-center"><CheckCircle className="mr-2 h-4 w-4 text-accent" />Format Compatibility Check</li>
                  </ul>
                </CardContent>
              </Card>
              <Card className="shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader className="pb-4">
                   <div className="flex items-center justify-center bg-primary/10 rounded-full w-12 h-12 mb-4">
                    <Lock className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="font-headline">Secure Authentication & Access</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Manage your recruitment data with robust user authentication and a personalized dashboard to access all your tools.
                  </CardDescription>
                   <ul className="mt-4 space-y-2 text-sm">
                    <li className="flex items-center"><CheckCircle className="mr-2 h-4 w-4 text-accent" />Secure Sign-Up & Login</li>
                    <li className="flex items-center"><CheckCircle className="mr-2 h-4 w-4 text-accent" />Personalized User Dashboard</li>
                    <li className="flex items-center"><CheckCircle className="mr-2 h-4 w-4 text-accent" />Role-Based Access (Future)</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Call to Action Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-muted/40">
          <div className="container grid items-center justify-center gap-4 px-4 text-center md:px-6">
            <div className="space-y-3">
              <h2 className="text-3xl font-bold tracking-tighter md:text-4xl/tight font-headline">
                Ready to Revolutionize Your Hiring?
              </h2>
              <p className="mx-auto max-w-[600px] text-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                Join ResumeRank AI today and start making data-driven hiring decisions.
              </p>
            </div>
            <div className="mx-auto w-full max-w-sm space-y-2">
              <Link
                href="/signup"
                className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                prefetch={false}
              >
                Sign Up for Free
              </Link>
              <p className="text-xs text-muted-foreground">
                Get started with our core features. No credit card required.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t">
        <p className="text-xs text-muted-foreground">&copy; {new Date().getFullYear()} ResumeRank AI. All rights reserved.</p>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          <Link href="/terms" className="text-xs hover:underline underline-offset-4" prefetch={false}>
            Terms of Service
          </Link>
          <Link href="/privacy" className="text-xs hover:underline underline-offset-4" prefetch={false}>
            Privacy Policy
          </Link>
        </nav>
      </footer>
    </div>
  );
}

// Placeholder pages for terms and privacy
export function TermsPage() {
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold">Terms of Service</h1>
      <p className="mt-4">Placeholder for Terms of Service.</p>
    </div>
  );
}

export function PrivacyPage() {
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold">Privacy Policy</h1>
      <p className="mt-4">Placeholder for Privacy Policy.</p>
    </div>
  );
}
