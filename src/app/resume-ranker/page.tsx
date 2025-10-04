
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
  // App-wide loading state context
  const { setIsPageLoading: setAppIsLoading } = useLoading();
  // Authentication context to get the current user
  const { currentUser } = useAuth();
  // Toast notifications hook
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
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [candidatesForEmail, setCandidatesForEmail] = useState<RankedCandidate[]>([]);
  const [historyToDelete, setHistoryToDelete] = useState<JobScreeningResult | null>(null);

  // Refs for scrolling to elements
  const resultsSectionRef = useRef<HTMLDivElement | null>(null);
  const processButtonRef = useRef<HTMLButtonElement | null>(null);

  // Check if Firestore is available
  const isFirestoreAvailable = !!firestoreDb;

  /**
   * Effect to fetch initial data from Firestore when the component mounts or the user changes.
   * This retrieves all previously saved screening sessions.
   */
  useEffect(() => {
    setAppIsLoading(false); // IMPORTANT: Immediately disable the full-page loader
    if (currentUser && isFirestoreAvailable) {
      setIsLoadingFromDB(true);
      getAllJobScreeningResultsForUser()
        .then((results) => {
          setAllScreeningResults(results);
        })
        .catch(err => {
          console.error("Error loading data from Firestore:", err);
          toast({ title: "Error Loading Data", description: "Could not load saved data from the database.", variant: "destructive" });
        })
        .finally(() => setIsLoadingFromDB(false));
    } else {
      setIsLoadingFromDB(false);
      setAllScreeningResults([]);
      setExtractedJobRoles([]);
    }
  }, [currentUser, isFirestoreAvailable, setAppIsLoading, toast]);


  // Derived loading state for easier management in the UI
  const isProcessing = isLoadingJDExtraction || isLoadingScreening || isLoadingFromDB;

  /**
   * Effect to scroll the main action button into view when both JDs and resumes have been uploaded.
   * This guides the user to the next logical step.
   */
  useEffect(() => {
    const readyToProcess = extractedJobRoles.length > 0 && uploadedResumeFiles.length > 0 && !isProcessing;
    if (readyToProcess && processButtonRef.current) {
      const timer = setTimeout(() => {
        processButtonRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [extractedJobRoles.length, uploadedResumeFiles.length, isProcessing]);

  /**
   * Effect to scroll to the results section when a screening process begins.
   * This automatically brings the results into view for the user.
   */
  useEffect(() => {
    if (isLoadingScreening && resultsSectionRef.current) {
      const timer = setTimeout(() => {
        resultsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100); 
      return () => clearTimeout(timer);
    }
  }, [isLoadingScreening]);

  /**
   * Memoized list of unique job roles for the dropdown.
   * This is a critical performance optimization to prevent infinite loops.
   * It combines roles from the current session and Firestore history into a stable list.
   */
  const uniqueJobRolesForDropdown = useMemo(() => {
      const roleMap = new Map<string, ExtractedJobRole>();
      
      // Prioritize roles extracted in the current session
      extractedJobRoles.forEach(role => {
          roleMap.set(role.id, role);
      });
      
      // Add roles from Firestore history if they don't already exist from the session
      allScreeningResults.forEach(result => {
        // A role from history is uniquely identified by its name. If we already have a session role with this name, skip.
        const hasSessionRoleWithSameName = Array.from(roleMap.values()).some(sessionRole => sessionRole.name === result.jobDescriptionName);
        if (!hasSessionRoleWithSameName && currentUser) {
          roleMap.set(result.jobDescriptionId, {
            id: result.jobDescriptionId,
            name: result.jobDescriptionName,
            contentDataUri: result.jobDescriptionDataUri,
            originalDocumentName: '',
            userId: currentUser.uid,
            createdAt: result.createdAt,
          });
        }
      });

      // Sort the final list by creation date, newest first.
      return Array.from(roleMap.values()).sort((a,b) => b.createdAt.toMillis() - a.createdAt.toMillis());
  }, [allScreeningResults, extractedJobRoles, currentUser]);


  /**
   * Memoized list of screening history sessions for the currently selected job role.
   * This filters the master list of results to only show relevant history.
   */
  const screeningHistoryForSelectedRole = useMemo(() => {
    if (!selectedJobRoleId) return [];
    const selectedRole = uniqueJobRolesForDropdown.find(r => r.id === selectedJobRoleId);
    if (!selectedRole) return [];
    return allScreeningResults
      .filter(r => r.jobDescriptionName === selectedRole.name)
      .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
  }, [selectedJobRoleId, allScreeningResults, uniqueJobRolesForDropdown]);

  /**
   * Memoized object for the currently selected screening result.
   * This finds the full result object based on the selected history ID.
   */
  const currentScreeningResult = useMemo(() => {
    return allScreeningResults.find(result => result.id === selectedHistoryId) || null;
  }, [selectedHistoryId, allScreeningResults]);

  /**
   * Callback to handle job description file uploads.
   * It calls the AI to extract distinct job roles from the uploaded files.
   * @param {JobDescriptionFile[]} initialJdUploads - The files uploaded by the user.
   */
  const handleJobDescriptionUploadAndExtraction = useCallback(async (initialJdUploads: JobDescriptionFile[]) => {
    if (!currentUser?.uid) return;
    setIsLoadingJDExtraction(true);
    try {
      // First, convert all file objects to data URIs.
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
        
        // Filter out roles that already exist by name in the dropdown
        const existingRoleNames = new Set(uniqueJobRolesForDropdown.map(r => r.name));
        const trulyNewRoles = tempRoles.filter(r => !existingRoleNames.has(r.name));

        if (trulyNewRoles.length > 0) {
          // Add only the genuinely new roles to the state
          setExtractedJobRoles(prev => [...trulyNewRoles, ...prev]);
          // Auto-select the first new role to provide immediate feedback
          setSelectedJobRoleId(trulyNewRoles[0].id); 
          toast({ title: "New Job Role(s) Extracted", description: `${trulyNewRoles.length} new role(s) are ready for screening.` });
        } else {
          // If the uploaded role(s) already existed, find and select the first one.
          const firstExistingRole = uniqueJobRolesForDropdown.find(r => r.name === tempRoles[0].name);
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
  }, [currentUser?.uid, toast, uniqueJobRolesForDropdown]);

  /**
   * Callback to perform the main screening operation.
   * It calls the AI to rank uploaded resumes against the selected job role.
   * @param {string} [targetJobRoleId] - The ID of the job role to screen against.
   */
  const handleScreening = useCallback(async (targetJobRoleId?: string) => {
    const roleToScreen = uniqueJobRolesForDropdown.find(jr => jr.id === targetJobRoleId);
    if (!currentUser?.uid || !isFirestoreAvailable || !roleToScreen || uploadedResumeFiles.length === 0) {
      toast({ title: "Cannot Start Screening", description: "Please select a job role and upload resumes first.", variant: "destructive" });
      return;
    }

    setIsLoadingScreening(true);
    try {
      // Manually create a "plain" object to send to the server action.
      // This strips out complex objects like the Firebase Timestamp.
      const plainRoleToScreen = {
        id: roleToScreen.id,
        name: roleToScreen.name,
        contentDataUri: roleToScreen.contentDataUri,
        originalDocumentName: roleToScreen.originalDocumentName,
      };

      const input: PerformBulkScreeningInput = { jobRolesToScreen: [plainRoleToScreen], resumesToRank: uploadedResumeFiles };
      const outputFromAI: PerformBulkScreeningOutput = await performBulkScreening(input);
      
      // Save the result to Firestore and update the local state.
      if (outputFromAI.length > 0 && outputFromAI[0]) {
        const savedResult = await saveJobScreeningResult(outputFromAI[0] as any);
        setAllScreeningResults(prev => [savedResult, ...prev]);
        setSelectedHistoryId(savedResult.id); // Auto-select the new screening session.
        toast({ title: "Screening Complete & Saved", description: "New screening session has been saved." });
      } else {
        toast({ title: "Screening Processed", description: "No new results were generated."});
      }
      
    } catch (error: any) {
      console.error("Bulk screening error:", error);
      toast({ title: "Bulk Screening Failed", description: error.message.substring(0, 100), variant: "destructive", duration: 10000 });
    } finally {
      setIsLoadingScreening(false);
    }
  }, [currentUser?.uid, uniqueJobRolesForDropdown, uploadedResumeFiles, toast, isFirestoreAvailable]);

  /**
   * Callback to handle resume file uploads from the FileUploadArea component.
   * @param {File[]} files - An array of File objects.
   */
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
        if (selectedHistoryId === historyToDelete.id) setSelectedHistoryId(null); // Clear selection if the active history was deleted.
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

  /**
   * Memoized list of candidates to display, after applying filters.
   */
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

  // Handler to open email modal for single or multiple candidates
  const handleOpenEmailModal = (candidates: RankedCandidate[]) => {
    if (candidates.length > 0) {
      setCandidatesForEmail(candidates);
      setIsEmailModalOpen(true);
    }
  };

  /**
   * Determines the current loading stage to show a relevant message.
   * @returns {"roles" | "screening" | "general"} The current stage.
   */
  const getLoadingStage = (): "roles" | "screening" | "general" => {
    if (isLoadingJDExtraction) return "roles"; if (isLoadingScreening) return "screening"; return "general";
  }

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-8 pt-24">
       {/* Page Header */}
       <Card className="mb-8 shadow-md"><CardHeader><CardTitle className="text-2xl font-headline text-primary flex items-center"><ScanSearch className="w-7 h-7 mr-3" /> AI-Powered Resume Ranker</CardTitle><CardDescription>Upload job descriptions and resumes to screen candidates. Your roles and screening history are saved.</CardDescription></CardHeader></Card>

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
          <div className="flex justify-center pt-4"><Button ref={processButtonRef} onClick={() => handleScreening(selectedJobRoleId || undefined)} disabled={isProcessing || !selectedJobRoleId || uploadedResumeFiles.length === 0} size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground text-base px-8 py-6 shadow-md">{(isLoadingScreening) ? <ScanSearch className="w-5 h-5 mr-2 animate-spin" /> : <ScanSearch className="w-5 h-5 mr-2" />}Screen Resumes</Button></div>
          
          {/* Results Section */}
          <div ref={resultsSectionRef} className="space-y-8">
            {(isProcessing && !currentScreeningResult) && (<Card className="shadow-lg"><CardContent className="pt-6"><LoadingIndicator stage={getLoadingStage()} /></CardContent></Card>)}
            {(!isProcessing || uniqueJobRolesForDropdown.length > 0) && (<><Separator className="my-8" /><FilterControls filters={filters} onFilterChange={handleFilterChange} onResetFilters={resetFilters} extractedJobRoles={uniqueJobRolesForDropdown} selectedJobRoleId={selectedJobRoleId} onJobRoleChange={handleJobRoleChange} isLoading={isProcessing} screeningHistory={screeningHistoryForSelectedRole} selectedHistoryId={selectedHistoryId} onHistoryChange={handleHistoryChange} onDeleteHistory={handleOpenDeleteHistoryDialog}/></>)}
            {!isLoadingScreening && currentScreeningResult && (
              <Card className="shadow-lg mb-8">
                <CardHeader>
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <CardTitle className="text-2xl font-headline text-primary">Results for: {currentScreeningResult.jobDescriptionName}</CardTitle>
                      <CardDescription>Screening from {currentScreeningResult.createdAt.toDate().toLocaleString()}. Processed: {currentScreeningResult.candidates.length}. Showing: {displayedCandidates.length}.</CardDescription>
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
            {!isProcessing && !selectedHistoryId && (<p className="text-center text-muted-foreground py-8">{uniqueJobRolesForDropdown.length === 0 ? "Upload a job description to begin." : !selectedJobRoleId ? "Select a job role from the dropdown." : screeningHistoryForSelectedRole.length === 0 ? "Upload resumes and click 'Screen' to create a session for this role." : "Select a screening session to view results."}</p>)}
          </div>

          {/* Dialogs and Modals */}
          <AlertDialog open={!!historyToDelete} onOpenChange={(open) => !open && setHistoryToDelete(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the screening session from <span className="font-semibold">{historyToDelete?.createdAt.toDate().toLocaleString()}</span>.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel onClick={() => setHistoryToDelete(null)}>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleConfirmDeleteHistory} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
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

    