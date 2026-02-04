"use client";

import React, { useState, useEffect } from "react";
import { motion, useSpring, useTransform, useMotionValue } from "framer-motion";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { BrainCircuit, CheckCircle, Activity, Star, Sparkles, Zap, Code, Database, Search } from "lucide-react";

const Hero3DCard = () => {
    // Motion values for tilt effect
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    // Smooth springs for less jittery movement
    const mouseXSpring = useSpring(x);
    const mouseYSpring = useSpring(y);

    // Transforms for rotation
    const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["15deg", "-15deg"]);
    const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-15deg", "15deg"]);

    // Dynamic heart rate simulation
    const [heartRate, setHeartRate] = useState<number[]>([40, 30, 60, 35, 55, 30, 40]);

    // Simulate changing data
    useEffect(() => {
        const interval = setInterval(() => {
            setHeartRate(prev => {
                const next = [...prev];
                next.shift();
                next.push(Math.floor(Math.random() * (60 - 30 + 1) + 30));
                return next;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, []);


    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const xPct = mouseX / width - 0.5;
        const yPct = mouseY / height - 0.5;
        x.set(xPct);
        y.set(yPct);
    };

    const handleMouseLeave = () => {
        x.set(0);
        y.set(0);
    };

    return (
        <motion.div
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{
                rotateY,
                rotateX,
                transformStyle: "preserve-3d",
            }}
            className="relative w-full max-w-[460px] aspect-[6/7] mx-auto perspective-1000"
        >
            {/* 3D Card Content */}
            <div
                style={{ transform: "translateZ(50px)", transformStyle: "preserve-3d" }}
                className="absolute inset-0 rounded-2xl bg-gradient-to-br from-card/90 to-card/50 backdrop-blur-md border border-white/20 shadow-2xl dark:shadow-primary/10 overflow-hidden" // Use overflow-hidden to clip inner content if needed, detailed borders
            >
                {/* Shine Effect */}
                <div className="absolute inset-0 -z-10 bg-gradient-to-tr from-primary/10 via-transparent to-transparent opacity-60 pointer-events-none" />

                <CardHeader className="relative z-10 p-6 flex flex-row items-center gap-4 border-b border-border/50">
                    <div className="relative">
                        <div className="absolute inset-0 bg-primary/20 blur-lg rounded-full animate-pulse" />
                        <Avatar className="h-16 w-16 border-2 border-primary/50 relative z-10">
                            <AvatarImage src="/avatars/01.png" alt="Candidate" /> {/* Placeholder, fallback handles display */}
                            <AvatarFallback className="bg-primary/10 text-primary text-lg font-bold">JD</AvatarFallback>
                        </Avatar>
                        <div className="absolute -bottom-1 -right-1 bg-green-500 w-4 h-4 rounded-full border-2 border-background z-20" />
                    </div>

                    <div className="flex-1">
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                        >
                            <div className="flex items-center gap-2">
                                <h3 className="text-xl font-bold tracking-tight">John Doe</h3>
                                <Badge variant="secondary" className="bg-primary/10 text-primary text-[10px] px-1 py-0 h-5">Top Match</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                <Code className="w-3 h-3" /> Senior Full Stack Dev
                            </p>
                        </motion.div>
                    </div>

                    <div className="text-right pointer-events-none select-none">
                        <span className="text-xs text-muted-foreground block">Match Score</span>
                        <motion.span
                            className="text-3xl font-black text-primary drop-shadow-sm"
                            initial={{ scale: 0.8 }}
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{ repeat: Infinity, duration: 2 }}
                        >
                            98%
                        </motion.span>
                    </div>
                </CardHeader>

                <CardContent className="p-6 space-y-6 relative z-10">
                    {/* Stats Simulation */}
                    <div className="space-y-4">
                        <SkillBar label="React & Next.js" score={95} icon={Zap} delay={0.5} color="bg-blue-500" />
                        <SkillBar label="System Design" score={88} icon={Database} delay={0.7} color="bg-orange-500" />
                        <SkillBar label="Algorithm Optimization" score={92} icon={BrainCircuit} delay={0.9} color="bg-purple-500" />
                    </div>

                    {/* Simulated Live Activity Graph */}
                    <div className="bg-muted/30 rounded-lg p-3 border border-border/50 relative overflow-hidden group">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1"><Activity className="w-3 h-3" /> Live Code Analysis</span>
                            <span className="text-[10px] text-green-500 font-mono animate-pulse">Running...</span>
                        </div>
                        <div className="h-16 w-full relative">
                            {/* SVG Graph Animation */}
                            <svg className="w-full h-full overflow-visible" viewBox="0 0 100 20" preserveAspectRatio="none">
                                <defs>
                                    <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.5" />
                                        <stop offset="100%" stopColor="transparent" stopOpacity="0" />
                                    </linearGradient>
                                </defs>
                                <motion.path
                                    d={`M 0,20 L ${heartRate.map((v, i) => `${(i / (heartRate.length - 1)) * 100},${20 - (v / 60) * 15}`).join(" L ")} L 100,20 Z`}
                                    fill="url(#gradient)"
                                    stroke="none"
                                    animate={{ d: `M 0,20 L ${heartRate.map((v, i) => `${(i / (heartRate.length - 1)) * 100},${20 - (v / 60) * 15}`).join(" L ")} L 100,20 Z` }}
                                    transition={{ ease: "linear", duration: 0.5 }}
                                />
                                <motion.path
                                    d={`M 0,${20 - (heartRate[0] / 60) * 15} L ${heartRate.map((v, i) => `${(i / (heartRate.length - 1)) * 100},${20 - (v / 60) * 15}`).join(" L ")}`}
                                    fill="none"
                                    stroke="hsl(var(--primary))"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    animate={{ d: `M 0,${20 - (heartRate[0] / 60) * 15} L ${heartRate.map((v, i) => `${(i / (heartRate.length - 1)) * 100},${20 - (v / 60) * 15}`).join(" L ")}` }}
                                    transition={{ ease: "linear", duration: 0.5 }}
                                />
                            </svg>
                        </div>
                        {/* Floating "AI Analyzing" text */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-background/50 backdrop-blur-sm">
                            <p className="text-xs font-bold text-primary">Analyzing Patterns...</p>
                        </div>
                    </div>

                    <div className="pt-2 flex justify-between text-xs text-muted-foreground font-mono">
                        <span className="flex items-center gap-1"><Search className="w-3 h-3" /> ATS Scan: 98/100</span>
                        <span className="flex items-center gap-1"><Sparkles className="w-3 h-3 text-yellow-500" /> AI Insights Ready</span>
                    </div>
                </CardContent>
            </div>

            {/* Floating Elements for extra depth - Adjusted Z translates for true 3D feel */}
            <FloatingBadge icon={CheckCircle} label="Expert" className="-top-6 -right-4 bg-green-500 text-white" style={{ transform: "translateZ(80px)" }} />
            <FloatingBadge icon={Star} label="Top 1%" className="top-12 -left-10 bg-yellow-500 text-white" style={{ transform: "translateZ(100px)" }} />
            <FloatingBadge icon={Code} label="Clean Code" className="-bottom-8 right-8 bg-blue-500 text-white" style={{ transform: "translateZ(60px)" }} />

        </motion.div>
    );
};

// Sub-component for Skill Bars
const SkillBar = ({ label, score, icon: Icon, delay, color }: { label: string, score: number, icon: any, delay: number, color: string }) => {
    return (
        <div className="group">
            <div className="flex justify-between mb-1.5">
                <span className="text-xs font-medium flex items-center gap-1.5 text-foreground/80 group-hover:text-primary transition-colors">
                    <Icon className="w-3.5 h-3.5" /> {label}
                </span>
                <span className="text-xs font-bold">{score}%</span>
            </div>
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${score}%` }}
                    transition={{ duration: 1, delay, type: "spring", stiffness: 50 }}
                    className={`h-full ${color} rounded-full relative`}
                >
                    <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite]" style={{ content: '""' }} />
                </motion.div>
            </div>
        </div>
    )
}

// Sub-component for Floating Badges
const FloatingBadge = ({ icon: Icon, label, className, style }: { icon: any, label: string, className?: string, style?: React.CSSProperties }) => {
    return (
        <motion.div
            style={style}
            animate={{
                y: [0, -10, 0],
                rotate: [0, 5, -5, 0]
            }}
            transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut"
            }}
            className={`absolute px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 text-xs font-bold z-20 ${className}`}
        >
            <Icon className="w-3 h-3 fill-current" />
            {label}
        </motion.div>
    )
}

export { Hero3DCard };
