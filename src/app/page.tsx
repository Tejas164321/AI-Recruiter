
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Image from "next/image";
import { ArrowRight, CheckCircle, BarChartBig, ScanSearch, MessageSquarePlus, ShieldCheckIcon, Mail, Phone, BrainCircuit } from "lucide-react";
import { motion, useMotionValue, useTransform } from "framer-motion";
import { useAuth } from "@/contexts/auth-context";
import React, { useRef, useEffect, useState } from 'react';

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

// --- Proximity-based Text Animation Components ---

const Letter = ({ children, mouse, letterRef }: { children: React.ReactNode, mouse: any, letterRef: React.RefObject<HTMLSpanElement> }) => {
    const [position, setPosition] = useState({ top: 0, left: 0, width: 0, height: 0 });

    useEffect(() => {
        if (letterRef.current) {
            setPosition({
                top: letterRef.current.offsetTop,
                left: letterRef.current.offsetLeft,
                width: letterRef.current.offsetWidth,
                height: letterRef.current.offsetHeight,
            });
        }
    }, [letterRef]);

    const distance = useTransform(mouse, (mousePos: {x: number, y: number}) => {
        if (mousePos.x === Infinity || position.width === 0) {
            return Infinity;
        }

        // Only apply effect if mouse is vertically aligned with the letter's line
        if (mousePos.y < position.top || mousePos.y > position.top + position.height) {
            return Infinity;
        }

        // Calculate horizontal distance from the center of the letter
        return Math.abs(mousePos.x - (position.left + position.width / 2));
    });

    // Reduced intensity for a more professional feel
    const scale = useTransform(distance, [0, 30, 90], [1.2, 1.1, 1]);
    const y = useTransform(distance, [0, 30, 90], [-6, -3, 0]);

    return (
        <motion.span
            ref={letterRef}
            style={{ scale, y }}
            className="inline-block"
            // Smoother spring physics
            transition={{ type: "spring", stiffness: 350, damping: 20 }}
        >
            {children}
        </motion.span>
    );
};

const AnimatedText = ({ text, mouse, isSpecial = false }: { text: string, mouse: any, isSpecial?: boolean }) => {
    const letters = text.split("");
    const letterRefs = useRef(letters.map(() => React.createRef<HTMLSpanElement>())).current;

    return (
        <>
            {letters.map((char, index) => (
                <Letter key={`${char}-${index}`} mouse={mouse} letterRef={letterRefs[index]}>
                    <span style={{ whiteSpace: "pre" }} className={isSpecial ? "text-primary" : ""}>
                        {char}
                    </span>
                </Letter>
            ))}
        </>
    );
};

const HeroHeading = ({ text, specialText }: { text: string, specialText: string }) => {
    const ref = useRef<HTMLHeadingElement>(null);
    const mouse = useMotionValue({x: Infinity, y: Infinity});

    return (
        <motion.h1
            ref={ref}
            onMouseMove={(e) => {
                if (ref.current) {
                    const rect = ref.current.getBoundingClientRect();
                    mouse.set({ x: e.clientX - rect.left, y: e.clientY - rect.top });
                }
            }}
            onMouseLeave={() => {
                mouse.set({x: Infinity, y: Infinity});
            }}
            className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl lg:text-6xl/none font-headline"
            aria-label={text + specialText}
        >
            <AnimatedText text={text} mouse={mouse} />
            <span style={{ filter: "drop-shadow(0 0 10px hsl(var(--primary)/0.8))", whiteSpace: 'nowrap' }}>
                <AnimatedText text={specialText} mouse={mouse} isSpecial={true} />
            </span>
        </motion.h1>
    );
}

// --- End of Animation Components ---

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

  const headingText = "Unlock Your Hiring Potential with ";
  const headingSpecialText = "ResumeRank AI";

  return (
    <div className="flex flex-col min-h-screen overflow-x-hidden landing-page-gradient">
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative w-full py-24 md:py-32 lg:py-40">
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
                  <HeroHeading text={headingText} specialText={headingSpecialText} />
                  <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.4 }}
                    className="max-w-[600px] text-muted-foreground md:text-xl"
                  >
                    Streamline your recruitment with an AI-powered suite for resume screening, candidate ranking, ATS compatibility checks, and tailored interview question generation. Make smarter hiring decisions, faster.
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
                     <Button variant="outline" size="lg" asChild className="w-full min-[400px]:w-auto">
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
                className="relative glowing-btn rounded-3xl"
              >
                <div className="sparkle-border-container">
                  <Image
                    src="/hero-hologram.png"
                    width="600"
                    height="400"
                    alt="A futuristic 3D isometric illustration of a business professional analyzing resumes on a holographic interface, with a soft, glowing animated border that radiates light as it moves."
                    className="mx-auto block rounded-[1.375rem] overflow-hidden object-cover sm:w-full lg:order-last"
                    priority
                  />
                </div>
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
                  className="inline-block rounded-lg bg-primary/10 text-primary px-3 py-1 text-sm font-medium"
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
            <div className="mx-auto grid max-w-5xl items-stretch gap-8 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 lg:max-w-none mt-12">
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
                  <Card className="shadow-lg h-full flex flex-col bg-card/50 backdrop-blur-sm border-border/20 transition-all duration-300 ease-out hover:-translate-y-2 hover:shadow-[0_8px_30px_hsl(var(--primary)/0.25)] dark:hover:shadow-[0_8px_30px_hsl(var(--primary)/0.25)] light:hover:shadow-2xl light:hover:shadow-black/20">
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
              ))}
            </div>
          </div>
        </section>

        {/* Call to Action Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-gradient-to-t from-background/5 via-background/5 to-transparent border-t border-border">
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
                <Button asChild size="lg" className="w-full glowing-btn">
                    <Link
                    href={getStartedLink}
                    prefetch={false}
                    >
                    {currentUser ? "Go to Dashboard" : "Sign Up for Free"}
                    <ArrowRight className="ml-2 h-5 w-5" />
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

      <footer className="border-t border-border bg-background/50 text-foreground">
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 py-6 md:flex-row md:px-6">
          <div className="text-center md:text-left">
            <Link href="/" className="flex items-center justify-center gap-2 md:justify-start">
              <BrainCircuit className="h-6 w-6 text-primary" />
              <span className="font-bold text-primary">ResumeRank AI</span>
            </Link>
            <p className="mt-2 text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} ResumeRank AI. All rights reserved.
            </p>
          </div>
          <nav className="flex flex-wrap items-center justify-center gap-4 text-sm font-medium md:gap-6">
            <Link href="/terms" className="text-muted-foreground transition-colors hover:text-primary" prefetch={false}>
              Terms
            </Link>
            <Link href="/privacy" className="text-muted-foreground transition-colors hover:text-primary" prefetch={false}>
              Privacy
            </Link>
            <Link href="/#features" className="text-muted-foreground transition-colors hover:text-primary" prefetch={false}>
              Features
            </Link>
          </nav>
          <div className="flex items-center gap-4">
            <a href="mailto:tejas2382004@gmail.com" aria-label="Email Us" className="text-muted-foreground hover:text-primary transition-colors">
              <Mail className="h-5 w-5" />
            </a>
            <a href="tel:+919960469732" aria-label="Call Us" className="text-muted-foreground hover:text-primary transition-colors">
              <Phone className="h-5 w-5" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
