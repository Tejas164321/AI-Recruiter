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
import { Loader2, Save, User, Briefcase, FileText, Camera, Fingerprint, Scan, ShieldCheck, Activity, Upload, Eye, EyeOff, Workflow } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { saveUserApiConfig, getUserApiConfig, DEFAULT_API_CONFIG, type ApiConfig } from "@/services/user-config";

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

    const [activeTab, setActiveTab] = useState<'dossier' | 'apiconfig'>('dossier');
    const [apiConfig, setApiConfig] = useState<ApiConfig>(DEFAULT_API_CONFIG);

    const [showGemini, setShowGemini] = useState(false);
    const [showGpt, setShowGpt] = useState(false);
    const [showClaude, setShowClaude] = useState(false);
    const [showGrok, setShowGrok] = useState(false);
    const [showLocalInstructions, setShowLocalInstructions] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleModelToggle = (provider: 'gemini' | 'claude' | 'gpt' | 'grok' | 'local', checked: boolean) => {
        setApiConfig(prev => {
            const nextEnabled = {
                gemini: prev.enabledModels?.gemini ?? (prev.activeModel === 'gemini' || !!prev.keys?.gemini),
                gpt: prev.enabledModels?.gpt ?? (prev.activeModel === 'gpt' || !!prev.keys?.gpt),
                claude: prev.enabledModels?.claude ?? (prev.activeModel === 'claude' || !!prev.keys?.claude),
                grok: prev.enabledModels?.grok ?? (prev.activeModel === 'grok' || !!prev.keys?.grok),
                local: prev.enabledModels?.local ?? (prev.activeModel === 'local' || !!prev.enableLocal),
            };

            if (prev.mode === 'manual') {
                if (checked) {
                    // Turn everything else OFF, turn this provider ON
                    Object.keys(nextEnabled).forEach(key => {
                        nextEnabled[key as keyof typeof nextEnabled] = key === provider;
                    });
                    return {
                        ...prev,
                        activeModel: provider,
                        enableLocal: provider === 'local',
                        enabledModels: nextEnabled
                    };
                } else {
                    return prev;
                }
            } else {
                // Auto mode: multiple can be active
                nextEnabled[provider] = checked;
                return {
                    ...prev,
                    enableLocal: provider === 'local' ? checked : prev.enableLocal,
                    enabledModels: nextEnabled
                };
            }
        });
    };

    const handleModeChange = (newMode: 'auto' | 'manual') => {
        setApiConfig(prev => {
            const nextEnabled = {
                gemini: prev.enabledModels?.gemini ?? (prev.activeModel === 'gemini' || !!prev.keys?.gemini),
                gpt: prev.enabledModels?.gpt ?? (prev.activeModel === 'gpt' || !!prev.keys?.gpt),
                claude: prev.enabledModels?.claude ?? (prev.activeModel === 'claude' || !!prev.keys?.claude),
                grok: prev.enabledModels?.grok ?? (prev.activeModel === 'grok' || !!prev.keys?.grok),
                local: prev.enabledModels?.local ?? (prev.activeModel === 'local' || !!prev.enableLocal),
            };
            let activeModel = prev.activeModel;

            if (newMode === 'manual') {
                // In manual mode, ensure only one is enabled
                const enabledList = Object.entries(nextEnabled).filter(([_, enabled]) => enabled);
                const firstEnabled = enabledList.length > 0 ? enabledList[0][0] as any : 'gemini';

                Object.keys(nextEnabled).forEach(key => {
                    nextEnabled[key as keyof typeof nextEnabled] = key === firstEnabled;
                });
                activeModel = firstEnabled;
            }

            return {
                ...prev,
                mode: newMode,
                activeModel,
                enableLocal: activeModel === 'local',
                enabledModels: nextEnabled
            };
        });
    };

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

            // Load API settings
            getUserApiConfig(currentUser.uid).then(config => {
                setApiConfig(config);
            });
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
            if (activeTab === 'dossier') {
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
            } else {
                // Save System API Credentials
                await saveUserApiConfig(currentUser.uid, apiConfig);

                toast({
                    title: "API Credentials Saved",
                    description: "System API Keys committed successfully.",
                    className: "font-mono"
                });
            }
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
                <div className="flex flex-col md:flex-row gap-0 shadow-2xl rounded-sm overflow-hidden border border-foreground/20 bg-card">

                    {/* LEFT PANEL: Identity & Status (Darker/Contrast or Sidebar style) */}
                    <div className="w-full md:w-1/3 bg-muted/30 border-r-2 border-dashed border-foreground/20 p-8 flex flex-col relative overflow-hidden group/sidebar">
                        {/* Decorative 'Tape' - Changed to Red for 'Classified' feel */}
                        <div className="absolute top-4 -left-8 w-32 h-8 bg-red-500/10 rotate-[-45deg] border border-red-500/20"></div>

                        {/* ID Card Header */}
                        <div className="mb-8 text-center relative flex flex-col items-center">
                            <div className="inline-block relative group cursor-pointer" onClick={handleImageClick}>
                                <div className="w-40 h-40 rounded-sm border-[6px] border-card shadow-md overflow-hidden bg-muted relative transition-transform group-hover:scale-105">
                                    {(filePreview || photoURL) ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={filePreview || photoURL} alt="Agent" className="w-full h-full object-cover filter sepia-[.2] contrast-110" />
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center bg-muted text-muted-foreground gap-2">
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
                                <div className="absolute -bottom-3 -right-3 bg-foreground text-background text-[10px] font-mono font-bold px-2 py-1 rounded-sm rotate-3 shadow-sm border border-card">
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
                            <div className="bg-background/50 p-4 rounded-sm border border-foreground/5 relative overflow-hidden group/stat">
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



                            <div className="bg-background/50 p-4 rounded-sm border border-foreground/5 hover:border-foreground/10 transition-colors">
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
                            <div className="relative group/qr bg-card p-1 border border-foreground/5 shadow-sm">
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

                        {/* Tabs Selector */}
                        <div className="flex border-b border-dashed border-foreground/20 mb-6 font-mono text-xs z-10 relative">
                            <button
                                type="button"
                                onClick={() => setActiveTab('dossier')}
                                className={`px-4 py-2 uppercase border-t border-l border-r border-transparent ${activeTab === 'dossier' ? 'border-foreground/20 bg-muted/40 font-bold border-b-graph-paper text-primary' : 'opacity-60 hover:opacity-100'}`}
                            >
                                Dossier Profile
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('apiconfig')}
                                className={`px-4 py-2 uppercase border-t border-l border-r border-transparent ${activeTab === 'apiconfig' ? 'border-foreground/20 bg-muted/40 font-bold border-b-graph-paper text-primary' : 'opacity-60 hover:opacity-100'}`}
                            >
                                System API Keys
                            </button>
                        </div>

                        {/* Background Watermark */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full flex items-center justify-center overflow-hidden pointer-events-none z-0">
                            <div className="text-[12rem] font-black text-foreground/[0.03] -rotate-45 select-none whitespace-nowrap uppercase">
                                {activeTab === 'dossier' ? (displayName || "PROFILE") : "API KEYS"}
                            </div>
                        </div>

                        <form onSubmit={handleSave} className="space-y-8 relative z-10 flex-1">
                            {activeTab === 'dossier' ? (
                                <>
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
                                    </div>

                                    {/* Section 2: Notes / Bio */}
                                    <div className="space-y-4 pt-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="w-2 h-2 bg-primary rotate-45"></div>
                                            <h3 className="font-bold font-headline uppercase tracking-wider">Field Notes & Personal Bio</h3>
                                            <div className="h-px bg-foreground/10 flex-1 ml-2"></div>
                                        </div>

                                        <div className="relative bg-muted/50 p-1 rounded-sm shadow-inner min-h-[160px]">
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
                                </>
                            ) : (
                                <>
                                    {/* Section 1: Outreach Engine Mode */}
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-2 mb-4">
                                            <div className="w-2 h-2 bg-primary rotate-45"></div>
                                            <h3 className="font-bold font-headline uppercase tracking-wider">Outreach Engine Mode</h3>
                                            <div className="h-px bg-foreground/10 flex-1 ml-2"></div>
                                        </div>

                                        <div className="bg-muted/30 border border-foreground/10 rounded-sm p-4 space-y-2">
                                            <div className="flex gap-6">
                                                <label className="flex items-center gap-2 font-mono text-xs cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        name="mode"
                                                        value="auto"
                                                        checked={apiConfig.mode === 'auto'}
                                                        onChange={() => handleModeChange('auto')}
                                                        className="text-primary focus:ring-0 border-foreground/30"
                                                    />
                                                    Auto Failover
                                                </label>
                                                <label className="flex items-center gap-2 font-mono text-xs cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        name="mode"
                                                        value="manual"
                                                        checked={apiConfig.mode === 'manual'}
                                                        onChange={() => handleModeChange('manual')}
                                                        className="text-primary focus:ring-0 border-foreground/30"
                                                    />
                                                    Manual Override
                                                </label>
                                            </div>
                                            <p className="text-[11px] text-muted-foreground leading-normal mt-2">
                                                {apiConfig.mode === 'auto' 
                                                    ? "Auto Failover: The engine cascades through all enabled models in priority order if a provider experiences busy servers or runs out of quota."
                                                    : "Manual Override: The engine processes candidates using ONLY the single enabled model below."}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Section 2: Model Providers & Credentials */}
                                    <div className="space-y-6 pt-4 border-t border-dashed border-foreground/10">
                                        <div className="flex items-center gap-2 mb-4">
                                            <div className="w-2 h-2 bg-primary rotate-45"></div>
                                            <h3 className="font-bold font-headline uppercase tracking-wider">Model Configuration & Keys</h3>
                                            <div className="h-px bg-foreground/10 flex-1 ml-2"></div>
                                        </div>

                                        <div className="flex flex-col gap-4">
                                            {/* Gemini */}
                                            <div className="border border-foreground/10 rounded-sm p-4 bg-muted/10 space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <input
                                                            type="checkbox"
                                                            checked={!!apiConfig.enabledModels?.gemini}
                                                            onChange={(e) => handleModelToggle('gemini', e.target.checked)}
                                                            className="w-4 h-4 rounded text-primary focus:ring-0 border-foreground/30 cursor-pointer"
                                                        />
                                                        <span className="font-headline font-bold text-sm tracking-wide uppercase">Google Gemini (Cloud Default)</span>
                                                    </div>
                                                    <span className={`text-[10px] font-mono px-2 py-0.5 border rounded-sm ${apiConfig.enabledModels?.gemini ? 'bg-green-500/10 text-green-700 border-green-500/20' : 'bg-foreground/5 text-muted-foreground border-foreground/10'}`}>
                                                        {apiConfig.enabledModels?.gemini ? 'ACTIVE' : 'OFF'}
                                                    </span>
                                                </div>
                                                {apiConfig.enabledModels?.gemini && (
                                                    <div className="space-y-2 group pt-2 border-t border-dashed border-foreground/10">
                                                        <Label className="font-mono text-[10px] uppercase text-muted-foreground">Google Gemini API Key</Label>
                                                        <div className="relative">
                                                            <Input
                                                                type={showGemini ? "text" : "password"}
                                                                value={apiConfig.keys.gemini || ""}
                                                                onChange={(e) => setApiConfig(prev => ({
                                                                    ...prev,
                                                                    keys: { ...prev.keys, gemini: e.target.value }
                                                                }))}
                                                                className="border-0 border-b border-foreground focus-visible:ring-0 focus-visible:border-b-2 rounded-none px-0 bg-transparent font-mono text-xs py-1 pr-8 h-auto"
                                                                placeholder="GOOGLE_API_KEY override"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => setShowGemini(!showGemini)}
                                                                className="absolute right-0 bottom-1.5 text-muted-foreground hover:text-foreground"
                                                            >
                                                                {showGemini ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* GPT */}
                                            <div className="border border-foreground/10 rounded-sm p-4 bg-muted/10 space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <input
                                                            type="checkbox"
                                                            checked={!!apiConfig.enabledModels?.gpt}
                                                            onChange={(e) => handleModelToggle('gpt', e.target.checked)}
                                                            className="w-4 h-4 rounded text-primary focus:ring-0 border-foreground/30 cursor-pointer"
                                                        />
                                                        <span className="font-headline font-bold text-sm tracking-wide uppercase">OpenAI GPT-4o-Mini</span>
                                                    </div>
                                                    <span className={`text-[10px] font-mono px-2 py-0.5 border rounded-sm ${apiConfig.enabledModels?.gpt ? 'bg-green-500/10 text-green-700 border-green-500/20' : 'bg-foreground/5 text-muted-foreground border-foreground/10'}`}>
                                                        {apiConfig.enabledModels?.gpt ? 'ACTIVE' : 'OFF'}
                                                    </span>
                                                </div>
                                                {apiConfig.enabledModels?.gpt && (
                                                    <div className="space-y-2 group pt-2 border-t border-dashed border-foreground/10">
                                                        <Label className="font-mono text-[10px] uppercase text-muted-foreground">OpenAI GPT API Key</Label>
                                                        <div className="relative">
                                                            <Input
                                                                type={showGpt ? "text" : "password"}
                                                                value={apiConfig.keys.gpt || ""}
                                                                onChange={(e) => setApiConfig(prev => ({
                                                                    ...prev,
                                                                    keys: { ...prev.keys, gpt: e.target.value }
                                                                }))}
                                                                className="border-0 border-b border-foreground focus-visible:ring-0 focus-visible:border-b-2 rounded-none px-0 bg-transparent font-mono text-xs py-1 pr-8 h-auto"
                                                                placeholder="sk-proj-..."
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => setShowGpt(!showGpt)}
                                                                className="absolute right-0 bottom-1.5 text-muted-foreground hover:text-foreground"
                                                            >
                                                                {showGpt ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Claude */}
                                            <div className="border border-foreground/10 rounded-sm p-4 bg-muted/10 space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <input
                                                            type="checkbox"
                                                            checked={!!apiConfig.enabledModels?.claude}
                                                            onChange={(e) => handleModelToggle('claude', e.target.checked)}
                                                            className="w-4 h-4 rounded text-primary focus:ring-0 border-foreground/30 cursor-pointer"
                                                        />
                                                        <span className="font-headline font-bold text-sm tracking-wide uppercase">Anthropic Claude 3.5 Haiku</span>
                                                    </div>
                                                    <span className={`text-[10px] font-mono px-2 py-0.5 border rounded-sm ${apiConfig.enabledModels?.claude ? 'bg-green-500/10 text-green-700 border-green-500/20' : 'bg-foreground/5 text-muted-foreground border-foreground/10'}`}>
                                                        {apiConfig.enabledModels?.claude ? 'ACTIVE' : 'OFF'}
                                                    </span>
                                                </div>
                                                {apiConfig.enabledModels?.claude && (
                                                    <div className="space-y-2 group pt-2 border-t border-dashed border-foreground/10">
                                                        <Label className="font-mono text-[10px] uppercase text-muted-foreground">Anthropic Claude API Key</Label>
                                                        <div className="relative">
                                                            <Input
                                                                type={showClaude ? "text" : "password"}
                                                                value={apiConfig.keys.claude || ""}
                                                                onChange={(e) => setApiConfig(prev => ({
                                                                    ...prev,
                                                                    keys: { ...prev.keys, claude: e.target.value }
                                                                }))}
                                                                className="border-0 border-b border-foreground focus-visible:ring-0 focus-visible:border-b-2 rounded-none px-0 bg-transparent font-mono text-xs py-1 pr-8 h-auto"
                                                                placeholder="sk-ant-..."
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => setShowClaude(!showClaude)}
                                                                className="absolute right-0 bottom-1.5 text-muted-foreground hover:text-foreground"
                                                            >
                                                                {showClaude ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Grok */}
                                            <div className="border border-foreground/10 rounded-sm p-4 bg-muted/10 space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <input
                                                            type="checkbox"
                                                            checked={!!apiConfig.enabledModels?.grok}
                                                            onChange={(e) => handleModelToggle('grok', e.target.checked)}
                                                            className="w-4 h-4 rounded text-primary focus:ring-0 border-foreground/30 cursor-pointer"
                                                        />
                                                        <span className="font-headline font-bold text-sm tracking-wide uppercase">xAI Grok Beta</span>
                                                    </div>
                                                    <span className={`text-[10px] font-mono px-2 py-0.5 border rounded-sm ${apiConfig.enabledModels?.grok ? 'bg-green-500/10 text-green-700 border-green-500/20' : 'bg-foreground/5 text-muted-foreground border-foreground/10'}`}>
                                                        {apiConfig.enabledModels?.grok ? 'ACTIVE' : 'OFF'}
                                                    </span>
                                                </div>
                                                {apiConfig.enabledModels?.grok && (
                                                    <div className="space-y-2 group pt-2 border-t border-dashed border-foreground/10">
                                                        <Label className="font-mono text-[10px] uppercase text-muted-foreground">xAI Grok API Key</Label>
                                                        <div className="relative">
                                                            <Input
                                                                type={showGrok ? "text" : "password"}
                                                                value={apiConfig.keys.grok || ""}
                                                                onChange={(e) => setApiConfig(prev => ({
                                                                    ...prev,
                                                                    keys: { ...prev.keys, grok: e.target.value }
                                                                }))}
                                                                className="border-0 border-b border-foreground focus-visible:ring-0 focus-visible:border-b-2 rounded-none px-0 bg-transparent font-mono text-xs py-1 pr-8 h-auto"
                                                                placeholder="xai-..."
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => setShowGrok(!showGrok)}
                                                                className="absolute right-0 bottom-1.5 text-muted-foreground hover:text-foreground"
                                                            >
                                                                {showGrok ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Local LLM */}
                                            <div className="border border-foreground/10 rounded-sm p-4 bg-muted/10 space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <input
                                                            type="checkbox"
                                                            checked={!!apiConfig.enabledModels?.local}
                                                            onChange={(e) => handleModelToggle('local', e.target.checked)}
                                                            className="w-4 h-4 rounded text-primary focus:ring-0 border-foreground/30 cursor-pointer"
                                                        />
                                                        <span className="font-headline font-bold text-sm tracking-wide uppercase flex items-center gap-2">
                                                            Local LLM (Ollama)
                                                            <span className="text-[10px] text-primary normal-case font-mono font-normal tracking-normal">(Qwen 2.5 Recommended)</span>
                                                        </span>
                                                    </div>
                                                    <span className={`text-[10px] font-mono px-2 py-0.5 border rounded-sm ${apiConfig.enabledModels?.local ? 'bg-green-500/10 text-green-700 border-green-500/20' : 'bg-foreground/5 text-muted-foreground border-foreground/10'}`}>
                                                        {apiConfig.enabledModels?.local ? 'ACTIVE' : 'OFF'}
                                                    </span>
                                                </div>
                                                {apiConfig.enabledModels?.local && (
                                                    <div className="space-y-4 pt-3 border-t border-dashed border-foreground/10">
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                            <div className="space-y-2 group">
                                                                <Label className="font-mono text-[10px] uppercase text-muted-foreground">Local Endpoint URL</Label>
                                                                <div className="relative">
                                                                    <Input
                                                                        value={apiConfig.localUrl}
                                                                        onChange={(e) => setApiConfig(prev => ({ ...prev, localUrl: e.target.value }))}
                                                                        className="border-0 border-b border-foreground focus-visible:ring-0 focus-visible:border-b-2 rounded-none px-0 bg-transparent font-mono text-xs py-1 h-auto"
                                                                        placeholder="http://localhost:11434"
                                                                    />
                                                                    <div className="absolute bottom-0 left-0 w-0 h-[2px] bg-primary transition-all duration-300 group-focus-within:w-full"></div>
                                                                </div>
                                                            </div>

                                                            <div className="space-y-2 group">
                                                                <Label className="font-mono text-[10px] uppercase text-muted-foreground">Local Model Name</Label>
                                                                <div className="relative">
                                                                    <Input
                                                                        value={apiConfig.localModel}
                                                                        onChange={(e) => setApiConfig(prev => ({ ...prev, localModel: e.target.value }))}
                                                                        className="border-0 border-b border-foreground focus-visible:ring-0 focus-visible:border-b-2 rounded-none px-0 bg-transparent font-mono text-xs py-1 h-auto"
                                                                        placeholder="qwen2.5"
                                                                    />
                                                                    <div className="absolute bottom-0 left-0 w-0 h-[2px] bg-primary transition-all duration-300 group-focus-within:w-full"></div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Local instructions info block */}
                                                        <div className="p-3 bg-background border border-foreground/5 rounded-sm">
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-[10px] font-mono font-bold text-muted-foreground flex items-center gap-1.5 uppercase">
                                                                    <Briefcase className="w-3.5 h-3.5" /> Instructions
                                                                </span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setShowLocalInstructions(!showLocalInstructions)}
                                                                    className="text-[10px] font-mono text-primary hover:underline focus:outline-none uppercase"
                                                                >
                                                                    {showLocalInstructions ? 'Show Less [-]' : 'Read More [+]'}
                                                                </button>
                                                            </div>
                                                            
                                                            <AnimatePresence initial={false}>
                                                                {showLocalInstructions ? (
                                                                    <motion.div
                                                                        initial={{ height: 0, opacity: 0 }}
                                                                        animate={{ height: "auto", opacity: 1 }}
                                                                        exit={{ height: 0, opacity: 0 }}
                                                                        transition={{ duration: 0.2 }}
                                                                        className="overflow-hidden mt-2 pt-2 border-t border-dashed border-foreground/10 text-[11px] leading-relaxed text-muted-foreground font-mono space-y-2"
                                                                    >
                                                                        <p className="font-bold text-foreground">Follow these steps to run the local model:</p>
                                                                        <ol className="list-decimal pl-4 space-y-1.5">
                                                                            <li>Download Ollama from <a href="https://ollama.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">ollama.com</a> and install it.</li>
                                                                            <li>Launch Ollama application to start the server background service.</li>
                                                                            <li>Download and run Qwen 2.5 model in your terminal: <code className="bg-muted px-1.5 py-0.5 rounded text-foreground font-bold">ollama run qwen2.5</code></li>
                                                                            <li>Ensure Ollama is reachable at <code className="bg-muted px-1.5 py-0.5 rounded text-foreground">http://localhost:11434</code> (which matches the default URL).</li>
                                                                        </ol>
                                                                        <p className="text-[10px] italic">Note: Qwen 2.5 model is highly optimized for structured JSON generation, layout analysis, and technical evaluations.</p>
                                                                    </motion.div>
                                                                ) : (
                                                                    <p className="text-[11px] text-muted-foreground mt-1 font-mono">
                                                                        Ollama must be running locally. Recommended command: <code className="bg-muted px-1.5 py-0.5 rounded text-foreground font-bold">ollama run qwen2.5</code>
                                                                    </p>
                                                                )}
                                                            </AnimatePresence>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}

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
            </motion.div >
        </div >
    );
}
