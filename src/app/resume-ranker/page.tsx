
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
// Icons
import { Users, ScanSearch, Briefcase, BrainCircuit, ServerOff, Trash2 } from "lucide-react";
// Hooks and Contexts
import { useToast } from "@/hooks/use-toast";
import { useLoading } from "@/contexts/loading-context";
import { useAuth } from "@/contexts/auth-context";
// AI Flows and Types
import { performBulkScreening, type PerformBulkScreeningInput, type PerformBulkScreeningOutput } from "@/ai/flows/rank-candidates";
import { extractJobRoles as extractJobRolesAI, type ExtractJobRolesInput as ExtractJobRolesAIInput, type ExtractJobRolesOutput as ExtractJobRolesAIOutput } from "@/ai/flows/extract-job-roles";
import type { ResumeFile, RankedCandidate, Filters, JobDescriptionFile, JobScreeningResult, ExtractedJobRole } from "@/lib/types";
// Firebase Services
import { saveJobScreeningResult, getAllJobScreeningResultsForUser, deleteJobScreeningResult } from "@/services/firestoreService";
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
  
  // State for data from Firestore and local session
  const [extractedJobRoles, setExtractedJobRoles] = useState<ExtractedJobRole[]>([]);
  const [allScreeningResults, setAllScreeningResults] = useState<JobScreeningResult[]>([]);
  
  // State for UI control and selections
  const [selectedJobRoleId, setSelectedJobRoleId] = useState<string | null>(null);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(initialFilters);
  
  // State for loading indicators
  const [isLoadingJDExtraction, setIsLoadingJDExtraction] = useState<boolean>(false);
  const [isLoadingScreening, setIsLoadingScreening] = useState<boolean>(false);
  const [isLoadingFromDB, setIsLoadingFromDB] = useState<boolean>(true);
  
  // State for modals and dialogs
  const [selectedCandidateForFeedback, setSelectedCandidateForFeedback] = useState<RankedCandidate | null>(null);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState<boolean>(false);
  const [historyToDelete, setHistoryToDelete] = useState<JobScreeningResult | null>(null);

  // Refs for scrolling to elements
  const resultsSectionRef = useRef<HTMLDivElement | null>(null);
  const processButtonRef = useRef<HTMLButtonElement | null>(null);

  // Check if Firestore is available
  const isFirestoreAvailable = !!firestoreDb;

  // Effect to fetch initial data from Firestore when the component mounts or the user changes
  useEffect(() => {
    setAppIsLoading(false);
    if (currentUser && isFirestoreAvailable) {
      setIsLoadingFromDB(true);
      getAllJobScreeningResultsForUser()
        .then((results) => {
          setAllScreeningResults(results);
          // Derive a unique list of job roles from the screening history
          const uniqueRolesMap = new Map<string, ExtractedJobRole>();
          const sortedResults = [...results].sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
          sortedResults.forEach(result => {
            if (!uniqueRolesMap.has(result.jobDescriptionName)) {
              uniqueRolesMap.set(result.jobDescriptionName, {
                id: result.jobDescriptionId,
                name: result.jobDescriptionName,
                contentDataUri: result.jobDescriptionDataUri,
                originalDocumentName: '',
                userId: currentUser.uid,
                createdAt: result.createdAt,
              });
            }
          });
          setExtractedJobRoles(Array.from(uniqueRolesMap.values()));
          setSelectedJobRoleId(null); 
          setSelectedHistoryId(null);
        })
        .catch(err => {
          console.error("Error loading data from Firestore:", err);
          toast({ title: "Error Loading Data", description: "Could not load saved data from the database.", variant: "destructive" });
        })
        .finally(() => setIsLoadingFromDB(false));
    } else {
      setIsLoadingFromDB(false);
      setExtractedJobRoles([]);
      setAllScreeningResults([]);
    }
  }, [currentUser, toast, setAppIsLoading, isFirestoreAvailable]);

  // Effect to scroll the main action button into view when ready
  useEffect(() => {
    const readyToProcess = extractedJobRoles.length > 0 && uploadedResumeFiles.length > 0 && !isProcessing;
    if (readyToProcess && processButtonRef.current) {
      const timer = setTimeout(() => {
        processButtonRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [extractedJobRoles.length, uploadedResumeFiles.length, isProcessing]);

  // Effect to scroll to the results section when screening starts
  useEffect(() => {
    if (isLoadingScreening && resultsSectionRef.current) {
      const timer = setTimeout(() => {
        resultsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100); 
      return () => clearTimeout(timer);
    }
  }, [isLoadingScreening]);

  // Memoized list of screening history for the currently selected job role
  const screeningHistoryForSelectedRole = useMemo(() => {
    if (!selectedJobRoleId) return [];
    const selectedRole = extractedJobRoles.find(r => r.id === selectedJobRoleId);
    if (!selectedRole) return [];
    return allScreeningResults.filter(r => r.jobDescriptionName === selectedRole.name).sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
  }, [selectedJobRoleId, allScreeningResults, extractedJobRoles]);

  // Memoized currently selected screening result object
  const currentScreeningResult = useMemo(() => {
    return allScreeningResults.find(result => result.id === selectedHistoryId) || null;
  }, [selectedHistoryId, allScreeningResults]);

  // Callback to handle JD file uploads and extraction
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
        const existingRoleNames = new Set(extractedJobRoles.map(r => r.name));
        const trulyNewRoles = tempRoles.filter(r => !existingRoleNames.has(r.name));

        if (trulyNewRoles.length > 0) {
          setExtractedJobRoles(prev => [...trulyNewRoles, ...prev]);
          setSelectedJobRoleId(trulyNewRoles[0].id);
          toast({ title: "New Job Role(s) Extracted", description: `${trulyNewRoles.length} new role(s) are ready for screening.` });
        } else {
          const firstExistingRole = extractedJobRoles.find(r => r.name === tempRoles[0].name);
          if (firstExistingRole) setSelectedJobRoleId(firstExistingRole.id);
          toast({ title: "Job Role Exists", description: `The role "${tempRoles[0].name}" already exists and has been selected.` });
        }
      } else {
         toast({ title: "No Job Roles Extracted", description: "AI could not find any distinct roles in the file(s)." });
      }
    } catch (error: any) {
      toast({ title: "Job Role Extraction Failed", description: `An error occurred: ${error.message.substring(0, 100)}`, variant: "destructive" });
    } finally {
      setIsLoadingJDExtraction(false);
    }
  }, [currentUser?.uid, toast, extractedJobRoles]);

  // Callback to perform the main screening operation
  const handleScreening = useCallback(async (targetJobRoleId?: string) => {
    const roleToScreen = extractedJobRoles.find(jr => jr.id === targetJobRoleId);
    if (!currentUser?.uid || !isFirestoreAvailable || !roleToScreen || uploadedResumeFiles.length === 0) {
      toast({ title: "Cannot Start Screening", description: "Please select a job role and upload resumes first.", variant: "destructive" });
      return;
    }

    setIsLoadingScreening(true);
    try {
      const input: PerformBulkScreeningInput = { jobRolesToScreen: [roleToScreen], resumesToRank: uploadedResumeFiles };
      const outputFromAI: PerformBulkScreeningOutput = await performBulkScreening(input);
      
      if (outputFromAI.length > 0 && outputFromAI[0]) {
        const savedResult = await saveJobScreeningResult(outputFromAI[0] as any);
        setAllScreeningResults(prev => [savedResult, ...prev]);
        setSelectedHistoryId(savedResult.id);
        toast({ title: "Screening Complete & Saved", description: "New screening session has been saved." });
      } else {
        toast({ title: "Screening Processed", description: "No new results were generated."});
      }
      setUploadedResumeFiles([]);
    } catch (error: any) {
      console.error("Bulk screening error:", error);
      toast({ title: "Bulk Screening Failed", description: error.message.substring(0, 100), variant: "destructive", duration: 10000 });
    } finally {
      setIsLoadingScreening(false);
    }
  }, [currentUser?.uid, extractedJobRoles, uploadedResumeFiles, toast, isFirestoreAvailable]);

  // Callback to handle resume file uploads
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

  // Handlers for changing selections and deleting history
  const handleJobRoleChange = useCallback((roleId: string | null) => { setSelectedJobRoleId(roleId); setSelectedHistoryId(null); setFilters(initialFilters); }, []);
  const handleHistoryChange = useCallback((historyId: string | null) => { setSelectedHistoryId(historyId); setFilters(initialFilters); }, []);
  const handleOpenDeleteHistoryDialog = (historyId: string) => { setHistoryToDelete(allScreeningResults.find(r => r.id === historyId) || null); };
  const handleConfirmDeleteHistory = async () => {
    if (!historyToDelete) return;
    try {
        await deleteJobScreeningResult(historyToDelete.id);
        toast({ title: "History Deleted", description: `Screening session from ${historyToDelete.createdAt.toDate().toLocaleString()} deleted.` });
        setAllScreeningResults(prev => prev.filter(r => r.id !== historyToDelete.id));
        if (selectedHistoryId === historyToDelete.id) setSelectedHistoryId(null);
    } catch (error) {
        toast({ title: "Deletion Failed", description: "Could not delete the history item.", variant: "destructive" });
    } finally {
        setHistoryToDelete(null);
    }
  };
  
  // Handlers for modals and filters
  const handleViewFeedback = (candidate: RankedCandidate) => { setSelectedCandidateForFeedback(candidate); setIsFeedbackModalOpen(true); };
  const handleFilterChange = (newFilters: Partial<Filters>) => { setFilters(prev => ({ ...prev, ...newFilters })); };
  const resetFilters = () => { setFilters(initialFilters); };

  // Memoized filtered list of candidates to display
  const displayedCandidates = useMemo(() => {
    if (!currentScreeningResult?.candidates) return [];
    return currentScreeningResult.candidates.filter(candidate => {
      const scoreMatch = candidate.score >= filters.scoreRange[0] && candidate.score <= filters.scoreRange[1];
      const keywordMatch = filters.skillKeyword.trim() === "" || candidate.keySkills.toLowerCase().includes(filters.skillKeyword.toLowerCase()) || candidate.name.toLowerCase().includes(filters.skillKeyword.toLowerCase());
      return scoreMatch && keywordMatch;
    });
  }, [currentScreeningResult, filters]);

  // Derived state for loading indicators
  const getLoadingStage = (): "roles" | "screening" | "general" => {
    if (isLoadingJDExtraction) return "roles"; if (isLoadingScreening) return "screening"; return "general";
  }
  const isProcessing = isLoadingJDExtraction || isLoadingScreening || isLoadingFromDB;

  // Memoized unique list of job roles for the dropdown
  const uniqueJobRolesForDropdown = useMemo(() => {
    const roleMap = new Map<string, ExtractedJobRole>();
    [...extractedJobRoles].sort((a,b) => b.createdAt.toMillis() - a.createdAt.toMillis()).forEach(role => {
        if(!roleMap.has(role.name)) roleMap.set(role.name, role);
    });
    return Array.from(roleMap.values());
  }, [extractedJobRoles]);

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-8">
       {/* Page Header */}
       <Card className="mb-8 shadow-md"><CardHeader><CardTitle className="text-2xl font-headline text-primary flex items-center"><BrainCircuit className="w-7 h-7 mr-3" /> AI-Powered Resume Ranker</CardTitle><CardDescription>Upload job descriptions and resumes to screen candidates. Your roles and screening history are saved.</CardDescription></CardHeader></Card>

      {/* Conditional Rendering for DB and Auth status */}
      {!isFirestoreAvailable && (<Card className="shadow-lg border-destructive"><CardHeader><CardTitle className="text-destructive flex items-center"><ServerOff className="w-5 h-5 mr-2" /> Database Not Connected</CardTitle></CardHeader><CardContent><p>Database features are disabled.</p></CardContent></Card>)}
      {!currentUser && isFirestoreAvailable && (<Card className="shadow-lg"><CardContent className="pt-6 text-center"><p className="text-lg text-muted-foreground">Please <a href="/login" className="text-primary underline">log in</a> to use the Resume Ranker.</p></CardContent></Card>)}

      {/* Main Content */}
      {currentUser && isFirestoreAvailable && (
        <>
          {/* Upload Section */}
          <div className="flex flex-col md:flex-row gap-8">
            <div className="flex-1"><Card className="shadow-lg h-full"><CardHeader><CardTitle className="flex items-center text-xl font-headline"><Briefcase className="w-6 h-6 mr-3 text-primary" />Upload Job Descriptions</CardTitle><CardDescription>Upload one or more JD files. Roles will be extracted and saved.</CardDescription></CardHeader><CardContent><FileUploadArea onFilesUpload={(files) => handleJobDescriptionUploadAndExtraction(files.map(f => ({ id: crypto.randomUUID(), file: f, dataUri: '', name: f.name })))} acceptedFileTypes={{ "application/pdf": [".pdf"], "text/plain": [".txt"],"application/msword": [".doc"], "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"]}} multiple={true} label="PDF, TXT, DOC, DOCX files up to 5MB" id="job-description-upload" maxSizeInBytes={MAX_FILE_SIZE_BYTES}/></CardContent></Card></div>
            <div className="flex-1"><Card className="shadow-lg h-full"><CardHeader><CardTitle className="flex items-center text-xl font-headline"><Users className="w-6 h-6 mr-3 text-primary" />Upload Resumes</CardTitle><CardDescription>Upload candidate resumes to be screened against a job role.</CardDescription></CardHeader><CardContent><FileUploadArea onFilesUpload={handleResumesUpload} acceptedFileTypes={{ "application/pdf": [".pdf"], "text/plain": [".txt"],"application/msword": [".doc"], "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"]}} multiple label="PDF, TXT, DOC, DOCX files up to 5MB" id="resume-upload" maxSizeInBytes={MAX_FILE_SIZE_BYTES}/></CardContent></Card></div>
          </div>
          
          {/* Action Button */}
          <div className="flex justify-center pt-4"><Button ref={processButtonRef} onClick={() => handleScreening(selectedJobRoleId || undefined)} disabled={isProcessing || !selectedJobRoleId || uploadedResumeFiles.length === 0} size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground text-base px-8 py-6 shadow-md">{(isLoadingScreening) ? <BrainCircuit className="w-5 h-5 mr-2 animate-spin" /> : <ScanSearch className="w-5 h-5 mr-2" />}Resume Ranking & Screening</Button></div>
          
          {/* Results Section */}
          <div ref={resultsSectionRef} className="space-y-8">
            {(isProcessing && !currentScreeningResult) && (<Card className="shadow-lg"><CardContent className="pt-6"><LoadingIndicator stage={getLoadingStage()} /></CardContent></Card>)}
            {(!isProcessing || extractedJobRoles.length > 0) && (<><Separator className="my-8" /><FilterControls filters={filters} onFilterChange={handleFilterChange} onResetFilters={resetFilters} extractedJobRoles={uniqueJobRolesForDropdown} selectedJobRoleId={selectedJobRoleId} onJobRoleChange={handleJobRoleChange} isLoading={isProcessing} screeningHistory={screeningHistoryForSelectedRole} selectedHistoryId={selectedHistoryId} onHistoryChange={handleHistoryChange} onDeleteHistory={handleOpenDeleteHistoryDialog}/></>)}
            {!isLoadingScreening && currentScreeningResult && (<Card className="shadow-lg mb-8"><CardHeader><CardTitle className="text-2xl font-headline text-primary">Results for: {currentScreeningResult.jobDescriptionName}</CardTitle><CardDescription>Screening from {currentScreeningResult.createdAt.toDate().toLocaleString()}. Processed: {currentScreeningResult.candidates.length}. Showing: {displayedCandidates.length}.</CardDescription></CardHeader><CardContent><CandidateTable candidates={displayedCandidates} onViewFeedback={handleViewFeedback} /></CardContent></Card>)}
            {!isProcessing && !selectedHistoryId && (<p className="text-center text-muted-foreground py-8">{extractedJobRoles.length === 0 ? "Upload a job description to begin." : !selectedJobRoleId ? "Select a job role from the dropdown." : screeningHistoryForSelectedRole.length === 0 ? "Upload resumes and click 'Screen' to create a session for this role." : "Select a screening session to view results."}</p>)}
          </div>

          {/* Dialogs and Modals */}
          <AlertDialog open={!!historyToDelete} onOpenChange={(open) => !open && setHistoryToDelete(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the screening session from <span className="font-semibold">{historyToDelete?.createdAt.toDate().toLocaleString()}</span>.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel onClick={() => setHistoryToDelete(null)}>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleConfirmDeleteHistory} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
          <FeedbackModal isOpen={isFeedbackModalOpen} onClose={() => setIsFeedbackModalOpen(false)} candidate={selectedCandidateForFeedback}/>
        </>
      )}
    </div>
  );
}
