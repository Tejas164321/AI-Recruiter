
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Image from "next/image";
import { ArrowRight, CheckCircle, BarChartBig, ScanSearch, MessageSquarePlus, ShieldCheckIcon } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/auth-context";

const sectionVariants = {
  hidden: { opacity: 0, y: 50 },
  visible: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      damping: 30,
      stiffness: 100,
      delay,
      duration: 0.8,
    },
  }),
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay,
      duration: 0.5,
    },
  }),
};

const cardHoverVariants = {
  hover: {
    y: -8,
    boxShadow: "0px 20px 40px -10px hsl(var(--primary)/0.3)", 
    transition: { type: "spring", stiffness: 300, damping: 15 }
  },
  initial: {
    y: 0,
    boxShadow: "0px 5px 15px hsl(var(--primary)/0.0)"
  }
};


export default function LandingPage() {
  const { currentUser } = useAuth();
  const getStartedLink = currentUser ? "/dashboard" : "/signup";

  const features = [
    {
      icon: BarChartBig,
      title: "AI-Powered Resume Ranking",
      description: "Automatically rank candidates based on job description relevance. Get match scores and AI-generated feedback to quickly identify top talent.",
      items: ["Intelligent Skill Matching", "ATS Compatibility Insights", "Customizable Filtering"],
      delay: 0.3
    },
    {
      icon: ScanSearch,
      title: "ATS Score Finder",
      description: "Analyze resumes for Applicant Tracking System (ATS) compatibility. Get scores and suggestions to optimize for automated screening.",
      items: ["Resume Structure Analysis", "Keyword Optimization Tips", "Format Compatibility Check"],
      delay: 0.45
    },
    {
      icon: MessageSquarePlus,
      title: "AI Interview Question Generator",
      description: "Craft tailored interview questions from job descriptions. Get categorized questions (technical, behavioral, situational) to thoroughly assess candidates.",
      items: ["Categorized Question Sets", "JD-Specific Insights", "Customizable Focus Areas"],
      delay: 0.6
    },
     {
      icon: ShieldCheckIcon,
      title: "Secure Authentication & Access",
      description: "Reliable user authentication to protect your data and provide personalized experiences. Sign up and log in securely.",
      items: ["Email & Password Login", "Protected User Dashboards", "Secure Session Management"],
      delay: 0.75
    }
  ];

  return (
    <div className="flex flex-col min-h-screen overflow-x-hidden landing-page-gradient">
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative w-full py-24 md:py-32 lg:py-40">
           {/* Animated background elements */}
          <div className="absolute inset-0 z-0 opacity-50">
            <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-primary rounded-full filter blur-3xl animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-32 h-32 bg-secondary rounded-full filter blur-3xl animate-pulse animation-delay-2000" />
          </div>

          <div className="container px-4 md:px-6 relative z-10">
            <div className="grid gap-10 lg:grid-cols-2 lg:gap-12 xl:gap-24 items-center">
              <motion.div 
                className="flex flex-col justify-center space-y-6"
                initial="hidden"
                animate="visible"
                variants={sectionVariants}
                custom={0}
              >
                <div className="space-y-4">
                  <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="text-4xl font-bold tracking-tight sm:text-5xl xl:text-6xl/none font-headline"
                  >
                    Unlock Your Hiring Potential with <span className="text-primary" style={{filter: 'drop-shadow(0 0 10px hsl(var(--primary)/0.8))'}}>ResumeRank AI</span>
                  </motion.h1>
                  <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.4 }}
                    className="max-w-[600px] text-muted-foreground md:text-xl"
                  >
                    Streamline your recruitment process with AI-powered resume screening, candidate ranking, an ATS score checker, and tailored interview question generation. Make smarter hiring decisions, faster.
                  </motion.p>
                </div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.6 }}
                  className="flex flex-col gap-4 min-[400px]:flex-row"
                >
                  <motion.div whileHover={{ scale: 1.05, y: -2, transition: {type: 'spring', stiffness: 300} }} whileTap={{ scale: 0.95 }}>
                    <Button asChild size="lg" className="w-full min-[400px]:w-auto glowing-btn">
                      <Link
                        href={getStartedLink}
                        prefetch={false}
                      >
                        {currentUser ? "Go to Dashboard" : "Get Started"}
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </Link>
                    </Button>
                  </motion.div>
                   <motion.div whileHover={{ scale: 1.05, y: -2, transition: {type: 'spring', stiffness: 300} }} whileTap={{ scale: 0.95 }}>
                     <Button variant="secondary" size="lg" asChild className="w-full min-[400px]:w-auto">
                        <Link
                          href="/#features"
                          prefetch={false}
                        >
                          Learn More
                        </Link>
                      </Button>
                  </motion.div>
                </motion.div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 50 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 100, damping: 20, delay: 0.3 }}
                className="relative"
              >
                <div className="absolute -inset-2 bg-primary/20 rounded-2xl blur-xl opacity-50"></div>
                <Image
                  data-ai-hint="holographic interface"
                  src="https://placehold.co/600x400.png"
                  width="600"
                  height="400"
                  alt="ResumeRank AI Hero"
                  className="mx-auto aspect-video overflow-hidden rounded-xl object-cover sm:w-full lg:order-last border-2 border-primary/20 shadow-2xl shadow-primary/20"
                  priority
                />
              </motion.div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <motion.div
              className="flex flex-col items-center justify-center space-y-4 text-center"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              variants={sectionVariants}
              custom={0.2}
            >
              <div className="space-y-2">
                <motion.div
                  initial={{ opacity:0, scale:0.8 }}
                  whileInView={{ opacity:1, scale:1 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration:0.5, delay:0.3 }}
                  className="inline-block rounded-lg bg-muted px-3 py-1 text-sm"
                >
                  Key Features
                </motion.div>
                <motion.h2
                  initial={{ opacity:0, y:20 }}
                  whileInView={{ opacity:1, y:0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration:0.5, delay:0.4 }}
                  className="text-3xl font-bold tracking-tighter sm:text-5xl font-headline"
                >
                  Optimize Your Recruitment Workflow
                </motion.h2>
                <motion.p
                  initial={{ opacity:0, y:20 }}
                  whileInView={{ opacity:1, y:0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration:0.5, delay:0.5 }}
                  className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed"
                >
                  Our platform offers a suite of tools designed to make your hiring process more efficient and effective.
                </motion.p>
              </div>
            </motion.div>
            <div className="mx-auto grid max-w-5xl items-stretch gap-8 sm:grid-cols-2 md:gap-12 lg:grid-cols-2 xl:grid-cols-4 lg:max-w-none mt-12">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  variants={sectionVariants}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.2 }}
                  custom={feature.delay}
                  className="h-full"
                >
                  <motion.div
                     initial="initial"
                     whileHover="hover"
                     variants={cardHoverVariants}
                     className="h-full"
                  >
                    <Card className="shadow-lg h-full flex flex-col bg-card/50 backdrop-blur-sm border-white/10 transition-colors duration-300">
                      <CardHeader className="pb-4">
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.5 }}
                          whileInView={{ opacity: 1, scale: 1 }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.4, delay: feature.delay + 0.1}}
                          className="flex items-center justify-center bg-primary/10 rounded-full w-12 h-12 mb-4 border-2 border-primary/20"
                        >
                          <feature.icon className="h-6 w-6 text-primary" />
                        </motion.div>
                        <CardTitle className="font-headline">{feature.title}</CardTitle>
                      </CardHeader>
                      <CardContent className="flex flex-col flex-grow">
                        <CardDescription className="text-muted-foreground">
                          {feature.description}
                        </CardDescription>
                        <motion.ul className="mt-4 space-y-2 text-sm flex-grow">
                          {feature.items.map((item, itemIndex) => (
                            <motion.li
                              key={itemIndex}
                              custom={feature.delay + 0.2 + itemIndex * 0.1}
                              initial="hidden"
                              whileInView="visible"
                              viewport={{ once: true }}
                              variants={itemVariants}
                              className="flex items-center"
                            >
                              <CheckCircle className="mr-2 h-4 w-4 text-accent" />{item}
                            </motion.li>
                          ))}
                        </motion.ul>
                      </CardContent>
                    </Card>
                  </motion.div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Call to Action Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-primary/10">
          <div className="container grid items-center justify-center gap-4 px-4 text-center md:px-6">
            <motion.div
              className="space-y-3"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.5 }}
              variants={sectionVariants}
              custom={0.2}
            >
              <h2 className="text-3xl font-bold tracking-tighter md:text-4xl/tight font-headline">
                Ready to Revolutionize Your Hiring?
              </h2>
              <p className="mx-auto max-w-[600px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                Join ResumeRank AI today and start making data-driven hiring decisions.
              </p>
            </motion.div>
            <motion.div
              className="mx-auto w-full max-w-sm space-y-2"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.5 }}
              variants={sectionVariants}
              custom={0.4}
            >
              <motion.div whileHover={{ scale: 1.05, transition: {type: 'spring', stiffness: 300} }} whileTap={{ scale: 0.95 }}>
                <Button asChild size="lg" className="w-full shadow-lg hover:shadow-primary/40 transition-all duration-300">
                    <Link
                    href={getStartedLink}
                    prefetch={false}
                    >
                    {currentUser ? "Go to Dashboard" : "Sign Up for Free"}
                    </Link>
                </Button>
              </motion.div>
              <p className="text-xs text-muted-foreground">
                Get started with our core features. No credit card required.
              </p>
            </motion.div>
          </div>
        </section>
      </main>

      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t border-white/10 bg-transparent">
        <p className="text-xs text-muted-foreground">&copy; {new Date().getFullYear()} ResumeRank AI. All rights reserved.</p>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          <Link href="/terms" className="text-xs text-muted-foreground hover:text-primary transition-colors" prefetch={false}>
            Terms of Service
          </Link>
          <Link href="/privacy" className="text-xs text-muted-foreground hover:text-primary transition-colors" prefetch={false}>
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
    
