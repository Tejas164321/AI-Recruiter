
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Image from "next/image";
import { ArrowRight, CheckCircle, BarChartBig, ScanSearch, MessageSquarePlus } from "lucide-react";
import { motion } from "framer-motion";

const sectionVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      damping: 15,
      stiffness: 100,
      delay,
      duration: 0.5,
    },
  }),
};

const itemVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: (delay: number = 0) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay,
      duration: 0.3,
    },
  }),
};

const cardHoverVariants = {
  hover: {
    scale: 1.03,
    boxShadow: "0px 10px 30px -5px hsl(var(--primary)/0.2)", // Themed shadow
    transition: { type: "spring", stiffness: 300, damping: 10 }
  },
  initial: {
    scale: 1,
    boxShadow: "0px 5px 15px hsl(var(--primary)/0.05)" // Softer initial shadow
  }
};


export default function LandingPage() {
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
    }
  ];

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-gradient-to-b from-primary/10 to-primary/5">
          <div className="container px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-2 lg:gap-12 xl:gap-24 items-center">
              <motion.div 
                className="flex flex-col justify-center space-y-4"
                initial="hidden"
                animate="visible"
                variants={sectionVariants}
                custom={0}
              >
                <div className="space-y-2">
                  <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.1 }}
                    className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none font-headline text-primary"
                  >
                    Unlock Your Hiring Potential with ResumeRank AI
                  </motion.h1>
                  <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                    className="max-w-[600px] text-foreground md:text-xl"
                  >
                    Streamline your recruitment process with AI-powered resume screening, candidate ranking, and an ATS score checker. Make smarter hiring decisions, faster.
                  </motion.p>
                </div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.5 }}
                  className="flex flex-col gap-2 min-[400px]:flex-row"
                >
                  <motion.div whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }}>
                    <Button asChild size="lg">
                      <Link
                        href="/signup"
                        prefetch={false}
                      >
                        Get Started
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }}>
                     <Button variant="outline" size="lg" asChild>
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
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <Image
                  src="/landingpage.png"
                  width="600"
                  height="400"
                  alt="ResumeRank AI Hero"
                  className="mx-auto aspect-video overflow-hidden rounded-xl object-cover sm:w-full lg:order-last shadow-[0_20px_40px_-10px_hsl(var(--primary)/0.25)]"
                  priority
                />
              </motion.div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="w-full py-12 md:py-24 lg:py-32 bg-background">
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
                  Everything You Need to Optimize Recruitment
                </motion.h2>
                <motion.p
                  initial={{ opacity:0, y:20 }}
                  whileInView={{ opacity:1, y:0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration:0.5, delay:0.5 }}
                  className="max-w-[900px] text-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed"
                >
                  Our platform offers a suite of tools designed to make your hiring process more efficient and effective.
                </motion.p>
              </div>
            </motion.div>
            <div className="mx-auto grid max-w-5xl gap-8 sm:grid-cols-2 md:gap-12 lg:grid-cols-3 lg:max-w-none mt-12">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial="initial"
                  animate="initial"
                  whileHover="hover"
                  variants={cardHoverVariants}
                  className="h-full" 
                >
                  <motion.div
                     variants={sectionVariants}
                     initial="hidden"
                     whileInView="visible"
                     viewport={{ once: true, amount: 0.2 }}
                     custom={feature.delay}
                     className="h-full"
                  >
                  <Card className="shadow-lg h-full flex flex-col border border-transparent hover:border-primary/30 transition-colors duration-300">
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
                      <CardDescription>
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
              <p className="mx-auto max-w-[600px] text-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
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
              <motion.div whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }}>
                <Button asChild size="lg" className="w-full shadow-lg hover:shadow-primary/40 transition-all duration-300">
                    <Link
                    href="/signup"
                    prefetch={false}
                    >
                    Sign Up for Free
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
    
