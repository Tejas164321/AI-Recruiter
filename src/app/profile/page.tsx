"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { updateProfile } from "firebase/auth";
import { Loader2, Save, User, Briefcase, FileText, Camera, Fingerprint, Scan, ShieldCheck, Activity, Upload } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function ProfilePage() {
    const { currentUser, isLoadingAuth } = useAuth();
    const { toast } = useToast();

    const [displayName, setDisplayName] = useState("");
    const [photoURL, setPhotoURL] = useState("");
    const [jobTitle, setJobTitle] = useState("");
    const [bio, setBio] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [randomId, setRandomId] = useState("000-000");
    const [qrCodeData, setQrCodeData] = useState("");
    const [filePreview, setFilePreview] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Load initial data
    useEffect(() => {
        setRandomId(Math.random().toString(36).substring(2, 9).toUpperCase());
        if (currentUser) {
            setDisplayName(currentUser.displayName || "");
            setPhotoURL(currentUser.photoURL || "");

            const localData = localStorage.getItem(`profile_${currentUser.uid}`);
            if (localData) {
                try {
                    const parsed = JSON.parse(localData);
                    setJobTitle(parsed.jobTitle || "");
                    setBio(parsed.bio || "");
                } catch (e) {
                    console.error("Failed to parse local profile data", e);
                }
            }
        }
    }, [currentUser]);

    // Update QR Code Data whenever fields change
    useEffect(() => {
        // Mailto Format: Scanning opens the user's email client
        const email = currentUser?.email || "";
        const mailtoLink = `mailto:${email}`;

        setQrCodeData(encodeURIComponent(mailtoLink));
    }, [currentUser]);

    const handleImageClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Create a local preview
            const objectUrl = URL.createObjectURL(file);
            setFilePreview(objectUrl);
            setPhotoURL(objectUrl); // For visual consistency

            // NOTE: In a real app, we would upload 'file' to Firebase Storage/Cloudinary here
            // and get the true URL. For now, we simulate this by just showing the preview.
            toast({
                title: "Image Selected",
                description: "Image staged for upload (simulate).",
                className: "font-mono"
            });
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser) return;

        setIsSaving(true);
        try {
            // 1. Update Firebase Auth Profile
            // Note: If we had a real upload, we'd use the returned URL from storage, not the blob/preview
            await updateProfile(currentUser, {
                displayName: displayName,
                photoURL: filePreview || photoURL
            });

            // 2. Save "extra" fields to localStorage (Stub for DB)
            localStorage.setItem(`profile_${currentUser.uid}`, JSON.stringify({
                jobTitle,
                bio
            }));

            toast({
                title: "Dossier Updated",
                description: "Personnel file successfully modified.",
                className: "font-mono"
            });
        } catch (error: any) {
            toast({
                title: "Update Failed",
                description: error.message,
                variant: "destructive"
            });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoadingAuth) {
        return (
            <div className="flex h-screen items-center justify-center bg-graph-paper">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    // QR Code URL (External API)
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${qrCodeData}&bgcolor=fdfdfd`;

    return (
        <div className="min-h-screen w-full bg-graph-paper font-sans p-4 md:p-12 pt-2 md:pt-4 pb-12 flex justify-center items-start overflow-hidden relative">
            {/* Background Watermark */}
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[20vw] font-headline font-bold text-foreground/[0.02] pointer-events-none rotate-45 select-none whitespace-nowrap">
                CONFIDENTIAL
            </div>

            <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, type: "spring" }}
                className="w-full max-w-6xl relative z-10"
            >
                {/* Main "Open Folder" / Ledger Layout */}
                <div className="flex flex-col md:flex-row gap-0 shadow-2xl rounded-sm overflow-hidden border border-foreground/20 bg-[#fdfdfd]">

                    {/* LEFT PANEL: Identity & Status (Darker/Contrast or Sidebar style) */}
                    <div className="w-full md:w-1/3 bg-secondary/30 border-r-2 border-dashed border-foreground/20 p-8 flex flex-col relative overflow-hidden group/sidebar">
                        {/* Decorative 'Tape' */}
                        <div className="absolute top-4 -left-8 w-32 h-8 bg-yellow-400/20 rotate-[-45deg] border border-yellow-500/30"></div>

                        {/* ID Card Header */}
                        <div className="mb-8 text-center relative flex flex-col items-center">
                            <div className="inline-block relative group cursor-pointer" onClick={handleImageClick}>
                                <div className="w-40 h-40 rounded-sm border-[6px] border-white shadow-md overflow-hidden bg-white relative transition-transform group-hover:scale-105">
                                    {(filePreview || photoURL) ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={filePreview || photoURL} alt="Agent" className="w-full h-full object-cover filter sepia-[.2] contrast-110" />
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 text-muted-foreground gap-2">
                                            <Upload className="w-8 h-8 opacity-50" />
                                            <span className="text-[10px] font-mono uppercase">Upload Photo</span>
                                        </div>
                                    )}
                                    {/* Hover Edit Overlay */}
                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Camera className="w-8 h-8 text-white" />
                                    </div>
                                    {/* Scan Line Animation */}
                                    <div className="absolute top-0 left-0 w-full h-1 bg-green-400/50 shadow-[0_0_10px_rgba(74,222,128,0.5)] animate-scanline opacity-0 group-hover:opacity-100 pointer-events-none"></div>
                                </div>
                                {/* Badge */}
                                <div className="absolute -bottom-3 -right-3 bg-foreground text-background text-[10px] font-mono font-bold px-2 py-1 rounded-sm rotate-3 shadow-sm border border-white">
                                    Lvl. 4
                                </div>
                            </div>

                            {/* Hidden File Input */}
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={handleFileChange}
                            />

                            <div className="mt-6 space-y-2">
                                <h2 className="text-2xl font-headline font-bold uppercase tracking-tight">{displayName || "UNKNOWN OPERATOR"}</h2>
                                <p className="font-mono text-xs text-muted-foreground uppercase">{jobTitle || "NO DESIGNATION"}</p>
                            </div>
                        </div>

                        {/* Key Stats / Data Points (Easter Eggs) */}
                        <div className="space-y-6 flex-1">
                            <div className="bg-white/50 p-4 rounded-sm border border-foreground/5 relative overflow-hidden group/stat">
                                <div className="absolute right-2 top-2 w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                <h3 className="font-mono text-[10px] uppercase text-muted-foreground mb-3 flex items-center gap-2">
                                    <Scan className="w-3 h-3" /> Biometric ID
                                </h3>
                                <div className="flex items-center gap-4">
                                    <Fingerprint className="w-12 h-12 text-foreground/20 group-hover/stat:text-foreground/40 transition-colors" />
                                    <div className="font-mono text-xs space-y-1 w-full">
                                        <div className="flex justify-between w-full gap-4 border-b border-dashed border-foreground/10 pb-1"><span>REF:</span> <span className="opacity-70 font-bold">{randomId}</span></div>
                                        <div className="flex justify-between w-full gap-4 border-b border-dashed border-foreground/10 pb-1"><span>BLD:</span> <span className="opacity-70">O-NEG</span></div>
                                        <div className="flex justify-between w-full gap-4"><span>STS:</span> <span className="text-green-600 font-bold">ACTIVE</span></div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white/50 p-4 rounded-sm border border-foreground/5 hover:border-foreground/10 transition-colors">
                                <h3 className="font-mono text-[10px] uppercase text-muted-foreground mb-3 flex items-center gap-2">
                                    <ShieldCheck className="w-3 h-3" /> Clearance
                                </h3>
                                <div className="grid grid-cols-5 gap-1 mb-2">
                                    {[1, 2, 3, 4, 5].map(i => (
                                        <div key={i} className={`h-1.5 rounded-sm ${i <= 4 ? 'bg-foreground' : 'bg-foreground/10'}`}></div>
                                    ))}
                                </div>
                                <div className="flex justify-between text-[10px] font-mono">
                                    <span className="opacity-50">CLASS-A</span>
                                    <span className="font-bold">AUTHORIZED</span>
                                </div>
                            </div>
                        </div>

                        {/* Decorative Footer: Real QR Code */}
                        <div className="mt-8 pt-6 border-t border-dashed border-foreground/10 flex justify-between items-end opacity-80">
                            <div className="relative group/qr bg-white p-1 border border-foreground/5 shadow-sm">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={qrUrl}
                                    alt="Profile QR"
                                    className="w-20 h-20 mix-blend-multiply opacity-90 group-hover/qr:opacity-100 transition-opacity"
                                />
                                <div className="absolute inset-0 border-2 border-primary/0 group-hover/qr:border-primary/50 transition-colors pointer-events-none"></div>
                            </div>
                            <div className="text-right font-mono text-[9px] leading-tight space-y-1">
                                <div className="font-bold">SCAN TO EMAIL</div>
                                <div className="opacity-60">DEPT OF <br /> RECRUITMENT <br /> INTEL</div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT PANEL: The Form / Dossier Content */}
                    <div className="w-full md:w-2/3 bg-graph-paper p-8 md:p-12 relative flex flex-col">
                        {/* Paper Header */}
                        <div className="flex justify-between items-start mb-8 border-b-4 border-double border-foreground/10 pb-4">
                            <div>
                                <h1 className="text-4xl font-headline font-bold text-foreground">OPERATOR RECORD</h1>
                                <p className="text-xs font-mono uppercase tracking-[0.3em] text-muted-foreground mt-1">
                                    Form 882-B • Revision 4
                                </p>
                            </div>
                            <div className="flex flex-col items-end">
                                <div className="border-2 border-red-800 text-red-800 px-3 py-1 font-mono text-sm font-bold uppercase rotate-[-2deg] mb-1 hover:rotate-0 transition-transform cursor-help select-none" title="Identity Verified">
                                    CONFIDENTIAL
                                </div>
                                <span className="font-mono text-[10px] opacity-40">{new Date().toLocaleDateString()}</span>
                            </div>
                        </div>

                        {/* Background Watermark */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full flex items-center justify-center overflow-hidden pointer-events-none z-0">
                            <div className="text-[12rem] font-black text-foreground/[0.03] -rotate-45 select-none whitespace-nowrap uppercase">
                                {displayName || "PROFILE"}
                            </div>
                        </div>

                        <form onSubmit={handleSave} className="space-y-8 relative z-10 flex-1">
                            {/* Section 1: Official Data */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-2 h-2 bg-primary rotate-45"></div>
                                    <h3 className="font-bold font-headline uppercase tracking-wider">Primary Information</h3>
                                    <div className="h-px bg-foreground/10 flex-1 ml-2"></div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-2 group">
                                        <Label className="font-mono text-[10px] uppercase text-muted-foreground">Full Designation</Label>
                                        <div className="relative">
                                            <Input
                                                value={displayName}
                                                onChange={(e) => setDisplayName(e.target.value)}
                                                className="border-0 border-b border-foreground focus-visible:ring-0 focus-visible:border-b-2 rounded-none px-0 bg-transparent font-headline text-lg py-1 h-auto"
                                                placeholder="N/A"
                                            />
                                            <div className="absolute bottom-0 left-0 w-0 h-[2px] bg-primary transition-all duration-300 group-focus-within:w-full"></div>
                                        </div>
                                    </div>

                                    <div className="space-y-2 group">
                                        <Label className="font-mono text-[10px] uppercase text-muted-foreground">Operational Role</Label>
                                        <div className="relative">
                                            <Input
                                                value={jobTitle}
                                                onChange={(e) => setJobTitle(e.target.value)}
                                                className="border-0 border-b border-foreground focus-visible:ring-0 focus-visible:border-b-2 rounded-none px-0 bg-transparent font-mono text-sm py-1 h-auto"
                                                placeholder="N/A"
                                            />
                                            <div className="absolute bottom-0 left-0 w-0 h-[2px] bg-primary transition-all duration-300 group-focus-within:w-full"></div>
                                        </div>
                                    </div>

                                    <div className="space-y-2 group md:col-span-2">
                                        <Label className="font-mono text-[10px] uppercase text-muted-foreground">System Email (Read-Only)</Label>
                                        <div className="relative">
                                            <Input
                                                value={currentUser?.email || ""}
                                                readOnly
                                                className="border-0 border-b border-dashed border-foreground/30 focus-visible:ring-0 rounded-none px-0 bg-transparent font-mono text-sm py-1 h-auto text-muted-foreground cursor-not-allowed"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Easter Egg: Barcode */}


                            </div>

                            {/* Section 2: Notes / Bio */}
                            <div className="space-y-4 pt-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-2 h-2 bg-primary rotate-45"></div>
                                    <h3 className="font-bold font-headline uppercase tracking-wider">Field Notes & Personal Bio</h3>
                                    <div className="h-px bg-foreground/10 flex-1 ml-2"></div>
                                </div>

                                <div className="relative bg-[#f4f4f4] p-1 rounded-sm shadow-inner min-h-[160px]">
                                    {/* Notebook binding effect */}
                                    <div className="absolute top-0 left-4 bottom-0 w-[2px] bg-red-300/50 z-10"></div>
                                    <div className="absolute top-0 left-5 bottom-0 w-[2px] bg-red-300/50 z-10"></div>

                                    <Textarea
                                        value={bio}
                                        onChange={(e) => setBio(e.target.value)}
                                        className="bg-transparent border-none focus-visible:ring-0 font-hand text-3xl leading-[2.5rem] min-h-[150px] pl-10 resize-y"
                                        style={{
                                            backgroundImage: 'linear-gradient(transparent 95%, #cbd5e1 95%)',
                                            backgroundSize: '100% 2rem',
                                            lineHeight: '2rem'
                                        }}
                                        placeholder="Type personnel observations here..."
                                    />
                                </div>
                            </div>

                            {/* Footer Actions */}
                            <div className="flex items-center justify-between pt-8 mt-auto border-t border-dashed border-foreground/20">
                                <div className="text-[10px] font-mono text-muted-foreground">
                                    <p>LAST MODIFIED: {new Date().toLocaleDateString()}</p>
                                    <p>AUTH: {currentUser?.email}</p>
                                </div>

                                <Button type="submit" disabled={isSaving} className="shiny-button h-12 px-8 bg-foreground text-background hover:bg-foreground/90 group relative overflow-hidden">
                                    <span className="relative z-10 flex items-center gap-2">
                                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                        COMMIT CHANGES
                                    </span>
                                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                                </Button>
                            </div>
                        </form>

                        {/* Floating 'APPROVED' Stamp */}
                        <div className="absolute bottom-24 right-12 pointer-events-none opacity-0 group-hover:opacity-10 transition-opacity duration-1000">
                            <div className="border-4 border-foreground text-foreground font-black text-6xl px-4 py-1 uppercase tracking-tighter opacity-10 select-none rotate-[-12deg]">
                                APPROVED
                            </div>
                        </div>
                    </div>

                </div>
            </motion.div>
        </div>
    );
}
