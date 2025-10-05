
"use client";

import React, { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
// UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileUploadArea } from "@/components/file-upload-area";
import { CandidateTableWithActions } from "@/components/candidate-table-with-actions";
import { FeedbackModal } from "@/components/feedback-modal";
import { FilterControls } from "@/components/filter-controls";
import { LoadingIndicator } from "@/components/loading-indicator";
import { Separator } from "@/components/ui/separator";
import { EmailComposeModal, type EmailRecipient } from "@/components/email-compose-modal";
import { HistorySheet } from "@/components/history-sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
// Icons
import { Users, ScanSearch, Briefcase, Snail, ServerOff, Mail } from "lucide-react";
// Hooks and Contexts
import { useLoading } from "@/contexts/loading-context";
import { useAuth } from "@/contexts/auth-context";
// AI Flows and Types
import { performBulkScreening, type PerformBulkScreeningInput, type PerformBulkScreeningOutput } from "@/ai/flows/rank-candidates";
import { extractJobRoles as extractJobRolesAI, type ExtractJobRolesInput as ExtractJobRolesAIInput, type ExtractJobRolesOutput as ExtractJobRolesAIOutput } from "@/ai/flows/extract-job-roles";
import type { ResumeFile, RankedCandidate, Filters, JobScreeningResult, ExtractedJobRole } from "@/lib/types";
// Firebase Services
import { saveJobScreeningResult, getAllJobScreeningResultsForUser, deleteJobScreeningResult, deleteAllJobScreeningResults } from "@/services/firestoreService";
import { db as firestoreDb } from "@/lib/firebase/config";


// Max file size for uploads
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

const initialFilters: Filters = {
  scoreRange: [0, 100],
  skillKeyword: "",
};

export default function ResumeRankerPage() {
  const { setIsPageLoading } = useLoading();
  const { currentUser } = useAuth();
  const { toast } = useToast();

  const [extractedJobRoles, setExtractedJobRoles] = useState<ExtractJobRolesAIOutput>([]);
  const [uploadedResumeFiles, setUploadedResumeFiles] = useState<ResumeFile[]>([]);
  
  const [allScreeningResults, setAllScreeningResults] = useState<JobScreeningResult[]>([]);
  const [currentScreeningResult, setCurrentScreeningResult] = useState<JobScreeningResult | null>(null);

  const [selectedJobRoleId, setSelectedJobRoleId] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(initialFilters);
  
  const [isLoadingJDExtraction, setIsLoadingJDExtraction] = useState<boolean>(false);
  const [isLoadingScreening, setIsLoadingScreening] = useState<boolean>(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(true);
  
  const [selectedCandidateForFeedback, setSelectedCandidateForFeedback] = useState<RankedCandidate | null>(null);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState<boolean>(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState<boolean>(false);
  const [isHistorySheetOpen, setIsHistorySheetOpen] = useState<boolean>(false);
  const [emailRecipients, setEmailRecipients] = useState<EmailRecipient[]>([]);

  // State for deletion confirmations
  const [sessionToDelete, setSessionToDelete] = useState<JobScreeningResult | null>(null);
  const [isDeleteAllDialogOpen, setIsDeleteAllDialogOpen] = useState<boolean>(false);

  const resultsSectionRef = useRef<HTMLDivElement | null>(null);
  const processButtonRef = useRef<HTMLButtonElement | null>(null);
  const isFirestoreAvailable = !!firestoreDb;

  useEffect(() => {
    setIsPageLoading(false);
    if (currentUser && isFirestoreAvailable) {
        setIsLoadingHistory(true);
        getAllJobScreeningResultsForUser()
            .then(results => {
                setAllScreeningResults(results);
            })
            .catch(error => {
                console.error("Failed to load screening history:", error);
                toast({ title: "Error", description: "Could not load screening history.", variant: "destructive" });
            })
            .finally(() => {
                setIsLoadingHistory(false);
            });
    } else {
        setIsLoadingHistory(false);
    }
  }, [currentUser, isFirestoreAvailable, setIsPageLoading, toast]);


  const isProcessing = isLoadingJDExtraction || isLoadingScreening || isLoadingHistory;

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

  const handleJobDescriptionUploadAndExtraction = useCallback(async (files: File[]) => {
    if (!currentUser?.uid) return;
    setIsLoadingJDExtraction(true);
    setCurrentScreeningResult(null); // Clear previous results
    try {
      const jdUploadsPromises = files.map(async (file) => {
        const dataUri = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader(); reader.onload = () => resolve(reader.result as string); reader.onerror = reject; reader.readAsDataURL(file);
        });
        return { name: file.name, dataUri };
      });
      const jdUploads = await Promise.all(jdUploadsPromises);
      
      const aiInput: ExtractJobRolesAIInput = { jobDescriptionDocuments: jdUploads };
      const aiOutput: ExtractJobRolesAIOutput = await extractJobRolesAI(aiInput);
      
      if (aiOutput.length > 0) {
        setExtractedJobRoles(aiOutput);
        setSelectedJobRoleId(aiOutput[0].id); // Auto-select the first new role
        toast({ title: "Job Role(s) Extracted", description: `${aiOutput.length} new role(s) are ready for screening.` });
      } else {
        toast({ title: "No Job Roles Extracted", description: "AI could not find any distinct roles in the file(s).", variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Job Role Extraction Failed", description: `An error occurred: ${error.message.substring(0, 100)}`, variant: "destructive" });
    } finally {
      setIsLoadingJDExtraction(false);
    }
  }, [currentUser?.uid, toast]);

  const handleScreening = useCallback(async (targetJobRoleId?: string) => {
    const roleToScreen = extractedJobRoles.find(jr => jr.id === targetJobRoleId);
    if (!currentUser?.uid || !roleToScreen || uploadedResumeFiles.length === 0 || !isFirestoreAvailable) {
      toast({ title: "Cannot Start Screening", description: "Please ensure a job role is selected, resumes are uploaded, and you are logged in.", variant: "destructive" });
      return;
    }

    setIsLoadingScreening(true);
    try {
      const plainRoleToScreen = { id: roleToScreen.id, name: roleToScreen.name, contentDataUri: roleToScreen.contentDataUri, originalDocumentName: roleToScreen.originalDocumentName };
      const input: PerformBulkScreeningInput = { jobRolesToScreen: [plainRoleToScreen], resumesToRank: uploadedResumeFiles };
      const outputFromAI: PerformBulkScreeningOutput = await performBulkScreening(input);
      
      if (outputFromAI.length > 0 && outputFromAI[0]) {
        const resultToSave: Omit<JobScreeningResult, 'id' | 'userId' | 'createdAt'> = outputFromAI[0];
        const savedResult = await saveJobScreeningResult(resultToSave);
        
        setCurrentScreeningResult(savedResult);
        setAllScreeningResults(prev => [savedResult, ...prev.filter(r => r.id !== savedResult.id)]);

        toast({ title: "Screening Complete", description: "Results have been saved to your history." });
      } else {
        toast({ title: "Screening Processed", description: "No new results were generated.", variant: 'destructive'});
      }
      
    } catch (error: any) {
      console.error("Bulk screening error:", error);
      toast({ title: "Bulk Screening Failed", description: error.message.substring(0, 100), variant: "destructive", duration: 10000 });
    } finally {
      setIsLoadingScreening(false);
    }
  }, [currentUser?.uid, extractedJobRoles, uploadedResumeFiles, toast, isFirestoreAvailable]);
  
  const handleResumesUpload = useCallback(async (files: File[]) => {
    const newResumeFilesPromises = files.map(async (file) => {
      const dataUri = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader(); reader.onload = () => resolve(reader.result as string); reader.onerror = reject; reader.readAsDataURL(file);
      });
      return { id: crypto.randomUUID(), file, dataUri, name: file.name };
    });

    try {
        const newResumeFiles = await Promise.all(newResumeFilesPromises);
        setUploadedResumeFiles(newResumeFiles);
    } catch(error) {
        toast({ title: "Error processing resumes", description: "Could not read one or more resume files.", variant: "destructive" });
    }
  }, [toast]); 

  const handleJobRoleChange = (roleId: string | null) => { 
      setSelectedJobRoleId(roleId); 
      setFilters(initialFilters);
      // Clear current results when a new session role is selected
      setCurrentScreeningResult(null);
  };

  const handleLoadHistorySession = (result: JobScreeningResult) => {
    setCurrentScreeningResult(result);
    setSelectedJobRoleId(null); // Deselect any active session role
    setIsHistorySheetOpen(false);
    setFilters(initialFilters);
    toast({ title: "History Loaded", description: `Showing results for "${result.jobDescriptionName}" from ${result.createdAt.toDate().toLocaleDateString()}.`})
  };

  const handleDeleteSession = (session: JobScreeningResult) => {
    setSessionToDelete(session);
  };

  const handleConfirmDelete = async () => {
    if (!sessionToDelete) return;
    try {
      await deleteJobScreeningResult(sessionToDelete.id);
      setAllScreeningResults(prev => prev.filter(s => s.id !== sessionToDelete.id));
      if (currentScreeningResult?.id === sessionToDelete.id) {
        setCurrentScreeningResult(null);
      }
      toast({ title: "History Deleted", description: `Session for "${sessionToDelete.jobDescriptionName}" was deleted.` });
    } catch (error) {
      toast({ title: "Deletion Failed", description: "Could not delete the session.", variant: "destructive" });
    } finally {
      setSessionToDelete(null);
    }
  };

  const handleConfirmDeleteAll = async () => {
    try {
      await deleteAllJobScreeningResults();
      setAllScreeningResults([]);
      setCurrentScreeningResult(null);
      toast({ title: "History Cleared", description: "All screening history has been deleted." });
    } catch (error) {
      toast({ title: "Deletion Failed", description: "Could not clear all history.", variant: "destructive" });
    } finally {
      setIsDeleteAllDialogOpen(false);
      setIsHistorySheetOpen(false);
    }
  };

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
  
  const handleViewFeedback = (candidate: RankedCandidate) => { setSelectedCandidateForFeedback(candidate); setIsFeedbackModalOpen(true); };
  
  const handleEmailSingleCandidate = (candidate: RankedCandidate) => {
      if (!candidate.email) {
        toast({ title: "Email Not Found", description: `Could not find an email address for ${candidate.name}.`, variant: "destructive"});
        return;
      }
      setEmailRecipients([{ name: candidate.name, email: candidate.email }]); 
      setIsEmailModalOpen(true);
  };
  
  const handleEmailFilteredCandidates = () => {
      const recipientsWithEmail = displayedCandidates.filter(c => c.email).map(c => ({ name: c.name || "Candidate", email: c.email! }));
      
      if (recipientsWithEmail.length === 0) {
          toast({ title: "No Candidates to Email", description: "No candidates with extracted email addresses match the current filters.", variant: "destructive" });
          return;
      }
      
      if (recipientsWithEmail.length < displayedCandidates.length) {
          toast({ title: "Some Emails Missing", description: `Could not find email addresses for ${displayedCandidates.length - recipientsWithEmail.length} candidate(s). Only sending to ${recipientsWithEmail.length}.` });
      }

      setEmailRecipients(recipientsWithEmail);
      setIsEmailModalOpen(true);
  };

  const getLoadingStage = (): "roles" | "screening" | "general" => {
    if (isLoadingJDExtraction) return "roles"; if (isLoadingScreening) return "screening"; return "general";
  }

  if (!currentUser) {
     return (
        <div className="container mx-auto p-4 md:p-8 space-y-8 pt-24">
            <Card className="shadow-lg"><CardContent className="pt-6 text-center"><p className="text-lg text-muted-foreground">Please <a href="/login" className="text-primary underline">log in</a> to use the Resume Ranker.</p></CardContent></Card>
        </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-8 pt-24">
      <Card className="mb-8 shadow-md"><CardHeader><CardTitle className="text-2xl font-headline text-primary flex items-center"><Snail className="w-7 h-7 mr-3" /> AI-Powered Resume Ranker</CardTitle><CardDescription>Upload job descriptions to create roles, then upload resumes to screen candidates. Your screening sessions are saved automatically.</CardDescription></CardHeader></Card>

      {!isFirestoreAvailable && (<Card className="shadow-lg border-destructive"><CardHeader><CardTitle className="text-destructive flex items-center"><ServerOff className="w-5 h-5 mr-2" /> Database Not Connected</CardTitle></CardHeader><CardContent><p>Database features are disabled.</p></CardContent></Card>)}
      
      {isFirestoreAvailable && (
        <>
          <div className="flex flex-col md:flex-row gap-8">
            <div className="flex-1"><Card className="shadow-lg h-full"><CardHeader><CardTitle className="flex items-center text-xl font-headline"><Briefcase className="w-6 h-6 mr-3 text-primary" />Upload Job Descriptions</CardTitle><CardDescription>Create new roles for this session.</CardDescription></CardHeader><CardContent><FileUploadArea onFilesUpload={handleJobDescriptionUploadAndExtraction} acceptedFileTypes={{ "application/pdf": [".pdf"], "text/plain": [".txt"],"application/msword": [".doc"], "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"]}} multiple={true} label="PDF, TXT, DOC, DOCX files up to 5MB" id="job-description-upload" maxSizeInBytes={MAX_FILE_SIZE_BYTES}/></CardContent></Card></div>
            <div className="flex-1"><Card className="shadow-lg h-full"><CardHeader><CardTitle className="flex items-center text-xl font-headline"><Users className="w-6 h-6 mr-3 text-primary" />Upload Resumes</CardTitle><CardDescription>Upload resumes to screen for the selected role.</CardDescription></CardHeader><CardContent><FileUploadArea onFilesUpload={handleResumesUpload} acceptedFileTypes={{ "application/pdf": [".pdf"], "text/plain": [".txt"],"application/msword": [".doc"], "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"]}} multiple label="PDF, TXT, DOC, DOCX files up to 5MB" id="resume-upload" maxSizeInBytes={MAX_FILE_SIZE_BYTES}/></CardContent></Card></div>
          </div>
          
          <div className="flex justify-center pt-4"><Button ref={processButtonRef} onClick={() => handleScreening(selectedJobRoleId)} disabled={isProcessing || !selectedJobRoleId || uploadedResumeFiles.length === 0} size="lg" className="text-base px-8 py-6 shiny-button">{(isLoadingScreening) ? <Snail className="w-5 h-5 mr-2 animate-spin" /> : <ScanSearch className="w-5 h-5 mr-2" />}Screen Resumes & Save</Button></div>
          
          <div ref={resultsSectionRef} className="space-y-8">
            {isProcessing && !currentScreeningResult && (<Card className="shadow-lg"><CardContent className="pt-6"><LoadingIndicator stage={getLoadingStage()} /></CardContent></Card>)}
            
            {(extractedJobRoles.length > 0 || allScreeningResults.length > 0 || isProcessing) && (
              <>
                <Separator className="my-8" />
                <FilterControls
                  filters={filters}
                  onFilterChange={handleFilterChange}
                  onResetFilters={resetFilters}
                  extractedJobRoles={extractedJobRoles}
                  selectedJobRoleId={selectedJobRoleId}
                  onJobRoleChange={handleJobRoleChange}
                  onViewHistory={() => setIsHistorySheetOpen(true)}
                  isHistoryAvailable={allScreeningResults.length > 0}
                  isLoading={isProcessing}
                  onEmailFilteredCandidates={handleEmailFilteredCandidates}
                  isEmailActionable={!!currentScreeningResult}
                  emailCandidateCount={displayedCandidates.filter(c => c.email).length}
                />
              </>
            )}

            {!isLoadingScreening && currentScreeningResult && (
              <Card className="shadow-lg mb-8">
                <CardHeader>
                  <CardTitle className="text-2xl font-headline text-primary">Results for: {currentScreeningResult.jobDescriptionName}</CardTitle>
                  <CardDescription>Screening from session on {currentScreeningResult.createdAt.toDate().toLocaleString()}. Processed: {currentScreeningResult.candidates.length}. Showing: {displayedCandidates.length}.</CardDescription>
                </CardHeader>
                <CardContent>
                  <CandidateTableWithActions 
                    candidates={displayedCandidates} 
                    onViewFeedback={handleViewFeedback}
                    onEmailCandidate={handleEmailSingleCandidate}
                  />
                </CardContent>
              </Card>
            )}

            {!isProcessing && !currentScreeningResult && (
                <div className="text-center text-muted-foreground py-8">
                    {extractedJobRoles.length > 0 ? "Select a job role and upload resumes to start screening." : allScreeningResults.length > 0 ? "Upload a job description or select a session from history to begin." : "Upload a job description to get started."}
                </div>
            )}
          </div>

          <FeedbackModal isOpen={isFeedbackModalOpen} onClose={() => setIsFeedbackModalOpen(false)} candidate={selectedCandidateForFeedback}/>
          <EmailComposeModal 
            isOpen={isEmailModalOpen} 
            onClose={() => setIsEmailModalOpen(false)} 
            recipients={emailRecipients}
            jobTitle={currentScreeningResult?.jobDescriptionName || 'the position'}
           />
           <HistorySheet
            isOpen={isHistorySheetOpen}
            onClose={() => setIsHistorySheetOpen(false)}
            history={allScreeningResults}
            onSelectSession={handleLoadHistorySession}
            onDeleteSession={handleDeleteSession}
            onClearAllHistory={() => setIsDeleteAllDialogOpen(true)}
           />

          <AlertDialog open={!!sessionToDelete} onOpenChange={(open) => !open && setSessionToDelete(null)}>
            <AlertDialogContent>
              <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the history for <span className="font-semibold">{sessionToDelete?.jobDescriptionName}</span>.</AlertDialogDescription></AlertDialogHeader>
              <AlertDialogFooter><AlertDialogCancel onClick={() => setSessionToDelete(null)}>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Delete</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          
          <AlertDialog open={isDeleteAllDialogOpen} onOpenChange={setIsDeleteAllDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader><AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete all <span className="font-semibold">{allScreeningResults.length}</span> saved screening sessions.</AlertDialogDescription></AlertDialogHeader>
              <AlertDialogFooter><AlertDialogCancel onClick={() => setIsDeleteAllDialogOpen(false)}>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleConfirmDeleteAll} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Yes, delete all</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </div>
  );
}
