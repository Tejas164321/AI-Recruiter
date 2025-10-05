
"use client";

import Link from "next/link";
import React, { useRef, useEffect, useState } from 'react';
// UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Image from "next/image";
// Icons
import { ArrowRight, CheckCircle, BarChartBig, ScanSearch, MessageSquarePlus, ShieldCheckIcon, Mail, Phone, Snail } from "lucide-react";
// Animation Library
import { motion, useMotionValue, useTransform } from "framer-motion";
// Hooks and Contexts
import { useAuth } from "@/contexts/auth-context";


/**
 * Animation variants for section transitions.
 * Creates a fade-in and slide-up effect.
 */
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

/**
 * Animation variants for list items within sections.
 * Creates a staggered fade-in and slide-up effect.
 */
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

/**
 * A component that animates a single letter based on mouse proximity.
 * @param {object} props - The component props.
 * @param {React.ReactNode} props.children - The character to render.
 * @param {any} props.mouse - The motion value tracking the mouse position.
 * @param {React.RefObject<HTMLSpanElement>} props.letterRef - Ref to the letter's span element.
 */
const Letter = ({ children, mouse, letterRef }: { children: React.ReactNode, mouse: any, letterRef: React.RefObject<HTMLSpanElement> }) => {
    // State to store the letter's position for distance calculation.
    const [position, setPosition] = useState({ top: 0, left: 0, width: 0, height: 0 });

    // Effect to measure the letter's position once it's rendered.
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

    // Transform hook to calculate the distance from the mouse to the letter.
    const distance = useTransform(mouse, (mousePos: {x: number, y: number}) => {
        if (mousePos.x === Infinity || position.width === 0) return Infinity;
        // Only apply effect if mouse is vertically aligned with the letter's line.
        if (mousePos.y < position.top || mousePos.y > position.top + position.height) return Infinity;
        // Calculate horizontal distance from the center of the letter.
        return Math.abs(mousePos.x - (position.left + position.width / 2));
    });

    // Transform distance into scale and y-offset for the animation.
    const scale = useTransform(distance, [0, 30, 90], [1.2, 1.1, 1]);
    const y = useTransform(distance, [0, 30, 90], [-6, -3, 0]);

    return (
        <motion.span ref={letterRef} style={{ scale, y }} className="inline-block" transition={{ type: "spring", stiffness: 350, damping: 20 }}>
            {children}
        </motion.span>
    );
};

/**
 * A component that renders text with each letter individually animated.
 * @param {object} props - The component props.
 * @param {string} props.text - The text to animate.
 * @param {any} props.mouse - The motion value for mouse position.
 * @param {boolean} [props.isSpecial=false] - Whether to apply special styling (e.g., primary color).
 */
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

/**
 * The main hero heading component, responsible for handling mouse move events
 * and orchestrating the responsive text layout.
 */
const HeroHeading = () => {
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
            onMouseLeave={() => mouse.set({x: Infinity, y: Infinity})}
            className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-4xl xl:text-5xl font-headline"
            aria-label="Unlock Your Hiring Potential with AI Recruiter"
        >
            {/* Mobile & Tablet view (flowing text) */}
            <span className="lg:hidden">
                <AnimatedText text="Unlock Your Hiring Potential with " mouse={mouse} />
                <span style={{ filter: "drop-shadow(0 0 10px hsl(var(--primary)/0.8))", whiteSpace: 'nowrap' }}>
                    <AnimatedText text="AI Recruiter" mouse={mouse} isSpecial={true} />
                </span>
            </span>

            {/* Desktop view (three lines for better control over line breaks) */}
            <span className="hidden lg:inline">
                <span className="block"><AnimatedText text="Unlock Your Hiring" mouse={mouse} /></span>
                <span className="block"><AnimatedText text="Potential with" mouse={mouse} /></span>
                <span className="block" style={{ filter: "drop-shadow(0 0 10px hsl(var(--primary)/0.8))", whiteSpace: 'nowrap' }}>
                    <AnimatedText text="AI Recruiter" mouse={mouse} isSpecial={true} />
                </span>
            </span>
        </motion.h1>
    );
}


/**
 * The main Landing Page component.
 */
export default function LandingPage() {
  const { currentUser } = useAuth();
  // Dynamically set the "Get Started" link based on authentication status.
  const getStartedLink = currentUser ? "/dashboard" : "/signup";

  // Data for the features section.
  const features = [
    { icon: Snail, title: "AI-Powered Resume Ranking", description: "Automatically rank candidates based on job description relevance. Get match scores and AI-generated feedback.", items: ["Intelligent Skill Matching", "ATS Compatibility Insights", "Customizable Filtering"], delay: 0.3 },
    { icon: ScanSearch, title: "ATS Score Finder", description: "Analyze resumes for Applicant Tracking System (ATS) compatibility. Get scores and suggestions to optimize.", items: ["Resume Structure Analysis", "Keyword Optimization Tips", "Format Compatibility Check"], delay: 0.45 },
    { icon: MessageSquarePlus, title: "AI Interview Question Generator", description: "Craft tailored interview questions from job descriptions. Get categorized questions (technical, behavioral, etc.).", items: ["Categorized Question Sets", "JD-Specific Insights", "Customizable Focus Areas"], delay: 0.6 },
    { icon: ShieldCheckIcon, title: "Secure Authentication & Access", description: "Reliable user authentication to protect your data and provide personalized experiences.", items: ["Email & Password Login", "Protected User Dashboards", "Secure Session Management"], delay: 0.75 }
  ];

  return (
    <div className="flex flex-col min-h-screen overflow-x-hidden landing-page-gradient">
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative w-full pt-24 md:pt-32 lg:pt-40">
          <div className="container px-4 md:px-6 relative z-10">
            <div className="grid gap-10 lg:grid-cols-2 lg:gap-12 xl:gap-24 items-center">
              {/* Hero Text Content */}
              <motion.div className="flex flex-col justify-center space-y-6" initial="hidden" animate="visible" variants={sectionVariants} custom={0}>
                <div className="space-y-4">
                  <HeroHeading />
                  <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.4 }} className="max-w-[600px] text-muted-foreground md:text-xl">
                    Streamline your recruitment with an AI-powered suite for resume screening, candidate ranking, and tailored interview question generation. Make smarter hiring decisions, faster.
                  </motion.p>
                </div>
                {/* Call to Action Buttons */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.6 }} className="flex flex-col gap-4 min-[400px]:flex-row">
                  <motion.div whileHover={{ scale: 1.05, y: -2, transition: {type: 'spring', stiffness: 300} }} whileTap={{ scale: 0.95 }}>
                    <Button asChild size="lg"><Link href={getStartedLink}>{currentUser ? "Go to Dashboard" : "Get Started"}<ArrowRight className="ml-2 h-5 w-5" /></Link></Button>
                  </motion.div>
                   <motion.div whileHover={{ scale: 1.05, y: -2, transition: {type: 'spring', stiffness: 300} }} whileTap={{ scale: 0.95 }}>
                     <Button variant="outline" size="lg" asChild><Link href="/#features">Learn More</Link></Button>
                  </motion.div>
                </motion.div>
              </motion.div>
              {/* Hero Image */}
              <motion.div initial={{ opacity: 0, scale: 0.8, y: 50 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 100, damping: 20, delay: 0.3 }} className="relative glowing-btn rounded-3xl">
                <div className="sparkle-border-container">
                  <Image src="/hero-hologram.png" width="600" height="400" alt="Futuristic illustration of a professional analyzing resumes on a holographic interface." className="mx-auto hidden dark:block rounded-[1.375rem] overflow-hidden object-cover sm:w-full lg:order-last" priority/>
                  <Image src="/hero-hologram-light.png" width="600" height="400" alt="Illustration of a professional analyzing resumes on a clean interface." className="mx-auto block dark:hidden rounded-[1.375rem] overflow-hidden object-cover sm:w-full lg:order-last" priority/>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <motion.div className="flex flex-col items-center justify-center space-y-4 text-center" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }} variants={sectionVariants} custom={0.2}>
              <div className="space-y-2">
                <motion.div initial={{ opacity:0, scale:0.8 }} whileInView={{ opacity:1, scale:1 }} viewport={{ once: true, amount: 0.3 }} transition={{ duration:0.5, delay:0.3 }} className="inline-block rounded-lg bg-primary/10 text-primary px-3 py-1 text-sm font-medium">Key Features</motion.div>
                <motion.h2 initial={{ opacity:0, y:20 }} whileInView={{ opacity:1, y:0 }} viewport={{ once: true, amount: 0.3 }} transition={{ duration:0.5, delay:0.4 }} className="text-3xl font-bold tracking-tighter sm:text-5xl font-headline">Optimize Your Recruitment Workflow</motion.h2>
                <motion.p initial={{ opacity:0, y:20 }} whileInView={{ opacity:1, y:0 }} viewport={{ once: true, amount: 0.3 }} transition={{ duration:0.5, delay:0.5 }} className="max-w-[900px] text-muted-foreground md:text-xl/relaxed">Our platform offers a suite of tools designed to make your hiring process more efficient and effective.</motion.p>
              </div>
            </motion.div>
            
            {/* Timeline structure for features */}
            <div className="relative mt-12 max-w-5xl mx-auto">
              <div className="timeline-line"></div>
              {features.map((feature, index) => (
                <motion.div 
                    key={index} 
                    className="timeline-item"
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.5 }}
                    variants={sectionVariants}
                    custom={feature.delay}
                >
                  <div className="timeline-icon-container">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div className="timeline-content">
                     <Card className="shadow-lg h-full flex flex-col backdrop-blur-sm border-border/20 transition-all hover:-translate-y-2 hover:shadow-[0_8px_30px_hsl(var(--primary)/0.25)]">
                        <CardHeader className="pb-4">
                          <CardTitle className="font-headline">{feature.title}</CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col flex-grow">
                          <CardDescription className="text-muted-foreground mb-4">{feature.description}</CardDescription>
                          <motion.ul className="space-y-2 text-sm flex-grow">
                            {feature.items.map((item, itemIndex) => (
                              <motion.li key={itemIndex} custom={feature.delay + 0.2 + itemIndex * 0.1} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={itemVariants} className="flex items-center"><CheckCircle className="mr-2 h-4 w-4 text-accent" />{item}</motion.li>
                            ))}
                          </motion.ul>
                        </CardContent>
                      </Card>
                  </div>
                </motion.div>
              ))}
            </div>

          </div>
        </section>

        {/* Final Call to Action Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-gradient-to-t from-background/5 via-background/5 to-transparent border-t border-border">
          <div className="container grid items-center justify-center gap-4 px-4 text-center md:px-6">
            <motion.div className="space-y-3" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.5 }} variants={sectionVariants} custom={0.2}>
              <h2 className="text-3xl font-bold tracking-tighter md:text-4xl/tight font-headline">Ready to Revolutionize Your Hiring?</h2>
              <p className="mx-auto max-w-[600px] text-muted-foreground md:text-xl/relaxed">Join AI Recruiter today and start making data-driven hiring decisions.</p>
            </motion.div>
            <motion.div className="mx-auto w-full max-w-sm space-y-2" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.5 }} variants={sectionVariants} custom={0.4}>
              <motion.div whileHover={{ scale: 1.05, transition: {type: 'spring', stiffness: 300} }} whileTap={{ scale: 0.95 }}>
                <Button asChild size="lg"><Link href={getStartedLink}>{currentUser ? "Go to Dashboard" : "Sign Up for Free"}<ArrowRight className="ml-2 h-5 w-5" /></Link></Button>
              </motion.div>
              <p className="text-xs text-muted-foreground">Get started with our core features. No credit card required.</p>
            </motion.div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-background/50 text-foreground">
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 py-6 sm:flex-row sm:px-6">
          <div className="text-center sm:text-left">
            <Link href="/" className="flex items-center justify-center gap-2 sm:justify-start">
              <Snail className="h-6 w-6 text-primary" />
              <span className="font-bold text-primary">AI Recruiter</span>
            </Link>
            <p className="mt-2 text-xs text-muted-foreground">&copy; {new Date().getFullYear()} AI Recruiter. All rights reserved.</p>
          </div>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
              <nav className="flex flex-wrap items-center justify-center gap-4 text-sm font-medium sm:gap-6">
                <Link href="/terms" className="text-muted-foreground transition-colors hover:text-primary">Terms</Link>
                <Link href="/privacy" className="text-muted-foreground transition-colors hover:text-primary">Privacy</Link>
                <Link href="/#features" className="text-muted-foreground transition-colors hover:text-primary">Features</Link>
              </nav>
              <div className="flex items-center gap-4">
                <a href="mailto:tejas2382004@gmail.com" aria-label="Email Us" className="text-muted-foreground hover:text-primary transition-colors"><Mail className="h-5 w-5" /></a>
                <a href="tel:+919960469732" aria-label="Call Us" className="text-muted-foreground hover:text-primary transition-colors"><Phone className="h-5 w-5" /></a>
              </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
