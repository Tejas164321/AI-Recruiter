"use client";

import Link from "next/link";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/auth-context";
import { useRouter, usePathname } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Eye, EyeOff, Snail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth as firebaseAuthModule } from "@/lib/firebase/config";

// --- LOGIN FORM ---
function LoginForm({ onFlip, isLoading, setIsLoading }: { onFlip: () => void, isLoading: boolean, setIsLoading: (l: boolean) => void }) {
    const { toast } = useToast();
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        if (!firebaseAuthModule) return;

        try {
            await signInWithEmailAndPassword(firebaseAuthModule, email, password);
            toast({ title: "Welcome back!", description: "System Access Granted.", className: "font-mono" });
            router.push('/dashboard');
        } catch (error: any) {
            toast({ title: "Access Denied", description: "Invalid credentials.", variant: "destructive", className: "font-mono" });
            setIsLoading(false);
        }
    };

    return (
        <Card className="w-full h-full shadow-xl border-2 border-foreground/10 bg-card/95 backdrop-blur-sm relative overflow-hidden">
            {/* Decorative Industrial Elements */}
            <div className="absolute top-2 right-2 flex gap-1">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <div className="w-2 h-2 rounded-full bg-foreground/20" />
            </div>
            <div className="absolute bottom-2 left-2 text-[10px] font-mono text-muted-foreground opacity-50">
                SYS.ID: 99-AZ-01
            </div>

            <CardHeader className="space-y-1 text-center pb-2">
                <div className="mx-auto bg-foreground/5 p-3 rounded-full w-fit mb-2 border border-foreground/10 hover:bg-foreground/10 transition-colors cursor-pointer group">
                    <Link href="/" aria-label="Return to Home">
                        <Snail className="w-8 h-8 text-primary group-hover:scale-110 transition-transform" />
                    </Link>
                </div>
                <CardTitle className="text-2xl font-bold font-headline tracking-tight">OPERATOR LOGIN</CardTitle>
                <CardDescription className="font-mono text-xs uppercase tracking-widest">Enter Credentials</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="login-email" className="font-mono text-xs uppercase">Email Identity</Label>
                        <Input id="login-email" type="email" placeholder="OPERATOR@SYSTEM.COM" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={isLoading} className="font-mono" />
                    </div>
                    <div className="space-y-2 relative">
                        <Label htmlFor="login-password" className="font-mono text-xs uppercase">Passcode</Label>
                        <Input id="login-password" type={showPassword ? "text" : "password"} placeholder="••••••" required value={password} onChange={(e) => setPassword(e.target.value)} disabled={isLoading} className="pr-10 font-mono" />
                        <Button type="button" variant="ghost" size="icon" className="absolute bottom-1 right-1 h-7 w-7" onClick={() => setShowPassword(!showPassword)} disabled={isLoading}>
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                    </div>
                    <Button type="submit" className="w-full font-mono uppercase tracking-widest mt-4" disabled={isLoading || !firebaseAuthModule}>
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "INITIATE SESSION"}
                    </Button>
                </form>
                <div className="mt-6 text-center text-sm">
                    <span className="text-muted-foreground">New Operator? </span>
                    <button type="button" onClick={onFlip} className="underline text-primary hover:text-primary/80 font-bold ml-1 font-mono uppercase">
                        Register Protocol &rarr;
                    </button>
                </div>
            </CardContent>
        </Card>
    );
}

// --- SIGNUP FORM ---
function SignupForm({ onFlip, isLoading, setIsLoading }: { onFlip: () => void, isLoading: boolean, setIsLoading: (l: boolean) => void }) {
    const { toast } = useToast();
    const router = useRouter();
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            toast({ title: "Error", description: "Passcodes do not match.", variant: "destructive" });
            return;
        }
        setIsLoading(true);
        if (!firebaseAuthModule) return;

        try {
            const userCredential = await createUserWithEmailAndPassword(firebaseAuthModule, email, password);
            if (userCredential.user) {
                await updateProfile(userCredential.user, { displayName: `${firstName} ${lastName}`.trim() });
            }
            toast({ title: "Registration Complete", description: "Operator profile created.", className: "font-mono" });
            router.push('/dashboard');
        } catch (error: any) {
            toast({ title: "Registration Failed", description: error.message, variant: "destructive" });
            setIsLoading(false);
        }
    };

    return (
        <Card className="w-full h-full shadow-xl border-2 border-foreground/10 bg-card/95 backdrop-blur-sm relative overflow-hidden">
            {/* Decorative Elements */}
            <div className="absolute top-2 left-2 flex gap-1">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <div className="w-2 h-2 rounded-full bg-foreground/20" />
            </div>
            <div className="absolute bottom-2 right-2 text-[10px] font-mono text-muted-foreground opacity-50">
                REG.MODE: ACTIVE
            </div>

            <CardHeader className="space-y-1 text-center pb-2">
                <CardTitle className="text-2xl font-bold font-headline tracking-tight">NEW OPERATOR</CardTitle>
                <CardDescription className="font-mono text-xs uppercase tracking-widest">Create System Profile</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <Label htmlFor="reg-first" className="font-mono text-[10px] uppercase">First Name</Label>
                            <Input id="reg-first" placeholder="JANE" required value={firstName} onChange={(e) => setFirstName(e.target.value)} disabled={isLoading} className="h-9 font-mono" />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="reg-last" className="font-mono text-[10px] uppercase">Last Name</Label>
                            <Input id="reg-last" placeholder="DOE" required value={lastName} onChange={(e) => setLastName(e.target.value)} disabled={isLoading} className="h-9 font-mono" />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="reg-email" className="font-mono text-[10px] uppercase">Email Identity</Label>
                        <Input id="reg-email" type="email" placeholder="OPERATOR@SYSTEM.COM" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={isLoading} className="h-9 font-mono" />
                    </div>
                    <div className="space-y-1 relative">
                        <Label htmlFor="reg-pass" className="font-mono text-[10px] uppercase">Passcode</Label>
                        <Input id="reg-pass" type={showPassword ? "text" : "password"} placeholder="••••••" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} disabled={isLoading} className="h-9 font-mono pr-8" />
                        <Button type="button" variant="ghost" size="icon" className="absolute bottom-0.5 right-0.5 h-6 w-6" onClick={() => setShowPassword(!showPassword)} disabled={isLoading}>
                            {showPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        </Button>
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="reg-confirm" className="font-mono text-[10px] uppercase">Confirm Passcode</Label>
                        <Input id="reg-confirm" type="password" placeholder="••••••" required minLength={6} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} disabled={isLoading} className="h-9 font-mono" />
                    </div>

                    <Button type="submit" className="w-full font-mono uppercase tracking-widest mt-2" disabled={isLoading || !firebaseAuthModule}>
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "ESTABLISH LINK"}
                    </Button>
                </form>
                <div className="mt-4 text-center text-sm">
                    <span className="text-muted-foreground">Existing Protocol? </span>
                    <button type="button" onClick={onFlip} className="underline text-primary hover:text-primary/80 font-bold ml-1 font-mono uppercase">
                        &larr; Return to Login
                    </button>
                </div>
            </CardContent>
        </Card>
    );
}

// --- MAIN FLIP CARD COMPONENT ---
export function AuthFlipCard({ initialMode = 'login' }: { initialMode?: 'login' | 'signup' }) {
    const [isFlipped, setIsFlipped] = useState(initialMode === 'signup');
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    const pathname = usePathname();

    // Sync URL when flipping (shallow)
    useEffect(() => {
        if (isFlipped && pathname !== '/signup') {
            window.history.replaceState(null, '', '/signup');
        } else if (!isFlipped && pathname !== '/login') {
            window.history.replaceState(null, '', '/login');
        }
    }, [isFlipped, pathname]);

    return (
        <div className="flex items-center justify-center w-full h-[100dvh] bg-background relative overflow-hidden dotted-bg">
            {/* Ambient Background Elements */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                <div className="absolute top-10 left-10 w-20 h-20 border-l-2 border-t-2 border-foreground/10" />
                <div className="absolute bottom-10 right-10 w-20 h-20 border-r-2 border-b-2 border-foreground/10" />
                <div className="absolute top-1/2 left-4 text-xs font-mono text-foreground/20 -rotate-90">SYSTEM_READY</div>
                <div className="absolute top-1/2 right-4 text-xs font-mono text-foreground/20 rotate-90">SECURE_CONN</div>
            </div>

            <div className="perspective-1000 w-full max-w-md px-4 group" style={{ perspective: '1200px' }}>
                <motion.div
                    className="w-full relative preserve-3d"
                    style={{
                        width: '100%',
                        minHeight: '580px', // Ensure enough space for content
                        transformStyle: 'preserve-3d'
                    }}
                    animate={{ rotateY: isFlipped ? 180 : 0 }}
                    transition={{ duration: 0.8, type: "spring", stiffness: 200, damping: 25 }}
                >
                    {/* FRONT FACE (LOGIN) */}
                    <div
                        className="absolute w-full h-full backface-hidden"
                        style={{
                            backfaceVisibility: 'hidden',
                            zIndex: isFlipped ? 0 : 1 // Ensure front is clickable when active
                        }}
                    >
                        {/* Industrial Corner Accents (Front) */}
                        <div className="absolute -top-3 -left-3 w-8 h-8 border-t-2 border-l-2 border-primary z-20 pointer-events-none transition-all group-hover:-top-4 group-hover:-left-4" />
                        <div className="absolute -bottom-3 -right-3 w-8 h-8 border-b-2 border-r-2 border-primary z-20 pointer-events-none transition-all group-hover:-bottom-4 group-hover:-right-4" />

                        {/* Holographic Scanline Overlay */}
                        <div className="absolute inset-0 z-10 pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-overlay"></div>
                        <div className="absolute inset-0 z-10 pointer-events-none bg-gradient-to-b from-transparent via-primary/5 to-transparent bg-[length:100%_4px] animate-scanline opacity-20"></div>

                        <LoginForm onFlip={() => setIsFlipped(true)} isLoading={isLoading} setIsLoading={setIsLoading} />
                    </div>

                    {/* BACK FACE (SIGNUP) */}
                    <div
                        className="absolute w-full h-full backface-hidden"
                        style={{
                            backfaceVisibility: 'hidden',
                            transform: 'rotateY(180deg)',
                            zIndex: isFlipped ? 1 : 0 // Ensure back is clickable when active
                        }}
                    >
                        {/* Industrial Corner Accents (Back) */}
                        <div className="absolute -top-3 -right-3 w-8 h-8 border-t-2 border-r-2 border-green-500 z-20 pointer-events-none" />
                        <div className="absolute -bottom-3 -left-3 w-8 h-8 border-b-2 border-l-2 border-green-500 z-20 pointer-events-none" />

                        <SignupForm onFlip={() => setIsFlipped(false)} isLoading={isLoading} setIsLoading={setIsLoading} />
                    </div>
                </motion.div>
            </div>

            <Link href="/" className="absolute bottom-8 text-xs font-mono text-muted-foreground hover:text-primary transition-colors">
                [ ABORT SEQUENCE / RETURN HOME ]
            </Link>
        </div>
    );
}
