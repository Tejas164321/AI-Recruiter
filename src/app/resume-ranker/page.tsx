
"use client";

import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
// UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileUploadArea } from "@/components/file-upload-area";
import { CandidateTable } from "@/components/candidate-table";
import { FeedbackModal } from "@/components/feedback-modal";
import { FilterControls } from "@/components/filter-controls";
import { LoadingIndicator } from "@/components/loading-indicator";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { EmailComposeModal } from "@/components/email-compose-modal";
// Icons
import { Users, ScanSearch, Briefcase, Mail, ServerOff, Trash2 } from "lucide-react";
// Hooks and Contexts
import { useToast } from "@/hooks/use-toast";
import { useLoading } from "@/contexts/loading-context";
import { useAuth } from "@/contexts/auth-context";
// AI Flows and Types
import { performBulkScreening, type PerformBulkScreeningInput, type PerformBulkScreeningOutput } from "@/ai/flows/rank-candidates";
import { extractJobRoles as extractJobRolesAI, type ExtractJobRolesInput as ExtractJobRolesAIInput, type ExtractJobRolesOutput as ExtractJobRolesAIOutput } from "@/ai/flows/extract-job-roles";
import type { ResumeFile, RankedCandidate, Filters, JobDescriptionFile, JobScreeningResult, ExtractedJobRole } from "@/lib/types";
// Firebase Services
import { saveJobScreeningResult } from "@/services/firestoreService";
import { db as firestoreDb } from "@/lib/firebase/config";
import { Timestamp } from "firebase/firestore";

// Initial state for filters
const initialFilters: Filters = {
  scoreRange: [0, 100],
  skillKeyword: "",
};
// Max file size for uploads
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

/**
 * Resume Ranker Page Component.
 * This is the core feature page where users can upload JDs and resumes,
 * screen them, and view ranked results.
 */
export default function ResumeRankerPage() {
  const { setIsPageLoading: setAppIsLoading } = useLoading();
  const { currentUser } = useAuth();
  const { toast } = useToast();

  // State for file uploads in the current session
  const [uploadedResumeFiles, setUploadedResumeFiles] = useState<ResumeFile[]>([]);
  
  // State for data from the current session
  const [extractedJobRoles, setExtractedJobRoles] = useState<ExtractedJobRole[]>([]);
  const [currentScreeningResult, setCurrentScreeningResult] = useState<JobScreeningResult | null>(null);

  // State for UI control and selections
  const [selectedJobRoleId, setSelectedJobRoleId] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(initialFilters);
  
  // State for loading indicators
  const [isLoadingJDExtraction, setIsLoadingJDExtraction] = useState<boolean>(false);
  const [isLoadingScreening, setIsLoadingScreening] = useState<boolean>(false);
  
  // State for modals and dialogs
  const [selectedCandidateForFeedback, setSelectedCandidateForFeedback] = useState<RankedCandidate | null>(null);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState<boolean>(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [candidatesForEmail, setCandidatesForEmail] = useState<RankedCandidate[]>([]);

  // Refs for scrolling to elements
  const resultsSectionRef = useRef<HTMLDivElement | null>(null);
  const processButtonRef = useRef<HTMLButtonElement | null>(null);

  const isFirestoreAvailable = !!firestoreDb;

  // Turn off the global page loader as soon as the component starts to mount.
  useEffect(() => {
    setAppIsLoading(false);
  }, [setAppIsLoading]);

  // Derived loading state for easier management in the UI
  const isProcessing = isLoadingJDExtraction || isLoadingScreening;

  useEffect(() => {
    const readyToProcess = extractedJobRoles.length > 0 && uploadedResumeFiles.length > 0 && !isProcessing;
    if (readyToProcess && processButtonRef.current) {
      const timer = setTimeout(() => {
        processButtonRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [extractedJobRoles.length, uploadedResumeFiles.length, isProcessing]);

  useEffect(() => {
    if (isLoadingScreening && resultsSectionRef.current) {
      const timer = setTimeout(() => {
        resultsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100); 
      return () => clearTimeout(timer);
    }
  }, [isLoadingScreening]);

  const handleJobDescriptionUploadAndExtraction = useCallback(async (initialJdUploads: JobDescriptionFile[]) => {
    if (!currentUser?.uid) return;
    setIsLoadingJDExtraction(true);
    try {
      const jdUploads = await Promise.all(initialJdUploads.map(async (jdFile) => {
        const dataUri = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader(); reader.onload = () => resolve(reader.result as string); reader.onerror = reject; reader.readAsDataURL(jdFile.file);
        });
        return { ...jdFile, dataUri };
      }));
      
      const aiInput: ExtractJobRolesAIInput = { jobDescriptionDocuments: jdUploads.map(jd => ({ name: jd.name, dataUri: jd.dataUri })) };
      const aiOutput: ExtractJobRolesAIOutput = await extractJobRolesAI(aiInput);
      
      if (aiOutput.length > 0) {
        const tempRoles = aiOutput.map(role => ({ ...role, userId: currentUser.uid, createdAt: Timestamp.now() })) as ExtractedJobRole[];
        setExtractedJobRoles(prev => [...tempRoles, ...prev]);
        setSelectedJobRoleId(tempRoles[0].id);
        toast({ title: "Job Role(s) Extracted", description: `${tempRoles.length} role(s) are ready.` });
      } else {
         toast({ title: "No Job Roles Extracted", description: "AI could not find any distinct roles in the file(s)." });
      }
    } catch (error: any) {
      toast({ title: "Job Role Extraction Failed", description: `An error occurred: ${error.message.substring(0, 100)}`, variant: "destructive" });
    } finally {
      setIsLoadingJDExtraction(false);
    }
  }, [currentUser?.uid, toast]);

  const handleScreening = useCallback(async () => {
    const roleToScreen = extractedJobRoles.find(jr => jr.id === selectedJobRoleId);
    if (!currentUser?.uid || !isFirestoreAvailable || !roleToScreen || uploadedResumeFiles.length === 0) {
      toast({ title: "Cannot Start Screening", description: "Please select a job role and upload resumes first.", variant: "destructive" });
      return;
    }

    setIsLoadingScreening(true);
    try {
      const plainRoleToScreen = {
        id: roleToScreen.id,
        name: roleToScreen.name,
        contentDataUri: roleToScreen.contentDataUri,
        originalDocumentName: roleToScreen.originalDocumentName,
      };

      const input: PerformBulkScreeningInput = { jobRolesToScreen: [plainRoleToScreen], resumesToRank: uploadedResumeFiles };
      const outputFromAI: PerformBulkScreeningOutput = await performBulkScreening(input);
      
      if (outputFromAI.length > 0 && outputFromAI[0]) {
        const resultWithTimestamp = { ...outputFromAI[0], userId: currentUser.uid, createdAt: Timestamp.now() } as Omit<JobScreeningResult, 'id'>;
        setCurrentScreeningResult({ ...resultWithTimestamp, id: "session_result" });
        toast({ title: "Screening Complete", description: "Results are displayed below." });
      } else {
        toast({ title: "Screening Processed", description: "No new results were generated."});
      }
      
    } catch (error: any) {
      console.error("Bulk screening error:", error);
      toast({ title: "Bulk Screening Failed", description: error.message.substring(0, 100), variant: "destructive", duration: 10000 });
    } finally {
      setIsLoadingScreening(false);
    }
  }, [currentUser?.uid, selectedJobRoleId, extractedJobRoles, uploadedResumeFiles, toast, isFirestoreAvailable]);

  const handleResumesUpload = useCallback(async (files: File[]) => {
     const newResumeFilesPromises = files.map(async (file) => {
      const dataUri = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader(); reader.onload = () => resolve(reader.result as string); reader.onerror = reject; reader.readAsDataURL(file);
      });
      return { id: crypto.randomUUID(), file, dataUri, name: file.name };
    });
    try {
        setUploadedResumeFiles(await Promise.all(newResumeFilesPromises)); 
    } catch (error) {
         toast({ title: "Error processing resumes", description: "Could not read one or more resume files.", variant: "destructive"});
    }
  }, [toast]); 

  const handleJobRoleChange = (roleId: string | null) => {
    setSelectedJobRoleId(roleId);
    setFilters(initialFilters);
    setCurrentScreeningResult(null); // Clear previous results when role changes
  };

  const handleViewFeedback = (candidate: RankedCandidate) => { setSelectedCandidateForFeedback(candidate); setIsFeedbackModalOpen(true); };
  const handleFilterChange = (newFilters: Partial<Filters>) => { setFilters(prev => ({ ...prev, ...newFilters })); };
  const resetFilters = () => { setFilters(initialFilters); };

  const displayedCandidates = useMemo(() => {
    if (!currentScreeningResult?.candidates) return [];
    return currentScreeningResult.candidates.filter(candidate => {
      const scoreMatch = candidate.score >= filters.scoreRange[0] && candidate.score <= filters.scoreRange[1];
      const keywordMatch = filters.skillKeyword.trim() === "" || 
        candidate.keySkills.toLowerCase().includes(filters.skillKeyword.toLowerCase()) || 
        candidate.name.toLowerCase().includes(filters.skillKeyword.toLowerCase());
      return scoreMatch && keywordMatch;
    });
  }, [currentScreeningResult, filters]);

  const handleOpenEmailModal = (candidates: RankedCandidate[]) => {
    if (candidates.length > 0) {
      setCandidatesForEmail(candidates);
      setIsEmailModalOpen(true);
    }
  };

  const getLoadingStage = (): "roles" | "screening" | "general" => {
    if (isLoadingJDExtraction) return "roles"; if (isLoadingScreening) return "screening"; return "general";
  }
  
  if (!currentUser) {
    return (
      <div className="container mx-auto p-4 md:p-8 space-y-8 pt-24">
        <Card className="shadow-lg">
            <CardContent className="pt-6 text-center">
                <p className="text-lg text-muted-foreground">
                    Please <a href="/login" className="text-primary underline">log in</a> to use the Resume Ranker.
                </p>
            </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-8 pt-24">
       <Card className="mb-8 shadow-md"><CardHeader><CardTitle className="text-2xl font-headline text-primary flex items-center"><ScanSearch className="w-7 h-7 mr-3" /> AI-Powered Resume Ranker</CardTitle><CardDescription>Upload job descriptions and resumes to screen candidates. Your roles and screening history are saved.</CardDescription></CardHeader></Card>

      {!isFirestoreAvailable && (<Card className="shadow-lg border-destructive"><CardHeader><CardTitle className="text-destructive flex items-center"><ServerOff className="w-5 h-5 mr-2" /> Database Not Connected</CardTitle></CardHeader><CardContent><p>Database features are disabled.</p></CardContent></Card>)}
      
      {isFirestoreAvailable && (
        <>
          <div className="flex flex-col md:flex-row gap-8">
            <div className="flex-1"><Card className="shadow-lg h-full"><CardHeader><CardTitle className="flex items-center text-xl font-headline"><Briefcase className="w-6 h-6 mr-3 text-primary" />Upload Job Descriptions</CardTitle><CardDescription>Upload one or more JD files. Roles will be extracted for this session.</CardDescription></CardHeader><CardContent><FileUploadArea onFilesUpload={(files) => handleJobDescriptionUploadAndExtraction(files.map(f => ({ id: crypto.randomUUID(), file: f, dataUri: '', name: f.name })))} acceptedFileTypes={{ "application/pdf": [".pdf"], "text/plain": [".txt"],"application/msword": [".doc"], "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"]}} multiple={true} label="PDF, TXT, DOC, DOCX files up to 5MB" id="job-description-upload" maxSizeInBytes={MAX_FILE_SIZE_BYTES}/></CardContent></Card></div>
            <div className="flex-1"><Card className="shadow-lg h-full"><CardHeader><CardTitle className="flex items-center text-xl font-headline"><Users className="w-6 h-6 mr-3 text-primary" />Upload Resumes</CardTitle><CardDescription>Upload candidate resumes to be screened against a job role.</CardDescription></CardHeader><CardContent><FileUploadArea onFilesUpload={handleResumesUpload} acceptedFileTypes={{ "application/pdf": [".pdf"], "text/plain": [".txt"],"application/msword": [".doc"], "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"]}} multiple label="PDF, TXT, DOC, DOCX files up to 5MB" id="resume-upload" maxSizeInBytes={MAX_FILE_SIZE_BYTES}/></CardContent></Card></div>
          </div>
          
          <div className="flex justify-center pt-4"><Button ref={processButtonRef} onClick={handleScreening} disabled={isProcessing || !selectedJobRoleId || uploadedResumeFiles.length === 0} size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground text-base px-8 py-6 shadow-md">{(isLoadingScreening) ? <ScanSearch className="w-5 h-5 mr-2 animate-spin" /> : <ScanSearch className="w-5 h-5 mr-2" />}Screen Resumes</Button></div>
          
          <div ref={resultsSectionRef} className="space-y-8">
            {(isProcessing) && (<Card className="shadow-lg"><CardContent className="pt-6"><LoadingIndicator stage={getLoadingStage()} /></CardContent></Card>)}
            
            {!isProcessing && extractedJobRoles.length > 0 && (<><Separator className="my-8" /><FilterControls filters={filters} onFilterChange={handleFilterChange} onResetFilters={resetFilters} extractedJobRoles={extractedJobRoles} selectedJobRoleId={selectedJobRoleId} onJobRoleChange={handleJobRoleChange} isLoading={isProcessing} screeningHistory={[]} selectedHistoryId={null} onHistoryChange={()=>{}} onDeleteHistory={()=>{}} /></>)}
            
            {!isProcessing && currentScreeningResult && (
              <Card className="shadow-lg mb-8">
                <CardHeader>
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <CardTitle className="text-2xl font-headline text-primary">Results for: {currentScreeningResult.jobDescriptionName}</CardTitle>
                      <CardDescription>Screening from this session. Processed: {currentScreeningResult.candidates.length}. Showing: {displayedCandidates.length}.</CardDescription>
                    </div>
                     <Button onClick={() => handleOpenEmailModal(displayedCandidates)} disabled={displayedCandidates.length === 0} variant="outline" >
                      <Mail className="w-4 h-4 mr-2" />
                      Email ({displayedCandidates.length}) Filtered Candidates
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <CandidateTable
                     candidates={displayedCandidates} 
                     onViewFeedback={handleViewFeedback}
                     onSendEmail={(candidate) => handleOpenEmailModal([candidate])}
                  />
                </CardContent>
              </Card>
            )}
            {!isProcessing && !currentScreeningResult && extractedJobRoles.length > 0 && (<p className="text-center text-muted-foreground py-8">Select a job role and screen resumes to view results.</p>)}
            {!isProcessing && extractedJobRoles.length === 0 && (<p className="text-center text-muted-foreground py-8">Upload a job description to begin.</p>)}

          </div>

          <FeedbackModal isOpen={isFeedbackModalOpen} onClose={() => setIsFeedbackModalOpen(false)} candidate={selectedCandidateForFeedback}/>
          <EmailComposeModal 
            isOpen={isEmailModalOpen} 
            onClose={() => setIsEmailModalOpen(false)} 
            candidates={candidatesForEmail}
            jobRoleName={currentScreeningResult?.jobDescriptionName || ""}
          />
        </>
      )}
    </div>
  );
}

    