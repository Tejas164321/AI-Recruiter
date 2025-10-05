
"use client";

import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
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
// Icons
import { Users, ScanSearch, Briefcase, Snail, ServerOff, Mail } from "lucide-react";
// Hooks and Contexts
import { useToast } from "@/hooks/use-toast";
import { useLoading } from "@/contexts/loading-context";
import { useAuth } from "@/contexts/auth-context";
// AI Flows and Types
import { performBulkScreening, type PerformBulkScreeningInput, type PerformBulkScreeningOutput } from "@/ai/flows/rank-candidates";
import { extractJobRoles as extractJobRolesAI, type ExtractJobRolesInput as ExtractJobRolesAIInput, type ExtractJobRolesOutput as ExtractJobRolesAIOutput } from "@/ai/flows/extract-job-roles";
import type { ResumeFile, RankedCandidate, Filters, JobDescriptionFile, JobScreeningResult, ExtractedJobRole } from "@/lib/types";
// Firebase Services
import { saveJobScreeningResult, getAllJobScreeningResultsForUser } from "@/services/firestoreService";
import { db as firestoreDb } from "@/lib/firebase/config";


// Initial state for filters
const initialFilters: Filters = {
  scoreRange: [0, 100],
  skillKeyword: "",
};
// Max file size for uploads
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export default function ResumeRankerPage() {
  const { setIsPageLoading } = useLoading();
  const { currentUser } = useAuth();
  const { toast } = useToast();

  const [extractedJobRoles, setExtractedJobRoles] = useState<ExtractedJobRole[]>([]);
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

  const handleJobDescriptionUploadAndExtraction = useCallback(async (initialJdUploads: JobDescriptionFile[]) => {
    if (!currentUser?.uid) return;
    setIsLoadingJDExtraction(true);
    setCurrentScreeningResult(null); // Clear previous results
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
        setUploadedResumeFiles(await Promise.all(newResumeFilesPromises)); 
    } catch (error) {
         toast({ title: "Error processing resumes", description: "Could not read one or more resume files.", variant: "destructive"});
    }
  }, [toast]); 

  const handleJobRoleChange = (roleId: string | null) => { 
      setSelectedJobRoleId(roleId); 
      setFilters(initialFilters);
      if (roleId) {
        // If a role is selected, find the most recent result for it in history and display it.
        const historicalResult = allScreeningResults.find(r => r.jobDescriptionId === roleId);
        setCurrentScreeningResult(historicalResult || null);
      } else {
         setCurrentScreeningResult(null); // Clear results if no role is selected
      }
  };

  const handleLoadHistorySession = (result: JobScreeningResult) => {
    // We set the current screening result to the historical one for display
    setCurrentScreeningResult(result);
    
    // Clear the active session job role selection, as we are now in "history view" mode
    setSelectedJobRoleId(null); 
    
    setIsHistorySheetOpen(false); // Close the sheet after selection
    setFilters(initialFilters);
    toast({ title: "History Loaded", description: `Showing results for "${result.jobDescriptionName}" from ${result.createdAt.toDate().toLocaleDateString()}.`})
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
            <div className="flex-1"><Card className="shadow-lg h-full"><CardHeader><CardTitle className="flex items-center text-xl font-headline"><Briefcase className="w-6 h-6 mr-3 text-primary" />Upload Job Descriptions</CardTitle><CardDescription>Create new roles for this session.</CardDescription></CardHeader><CardContent><FileUploadArea onFilesUpload={(files) => handleJobDescriptionUploadAndExtraction(files.map(f => ({ id: crypto.randomUUID(), file: f, dataUri: '', name: f.name })))} acceptedFileTypes={{ "application/pdf": [".pdf"], "text/plain": [".txt"],"application/msword": [".doc"], "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"]}} multiple={true} label="PDF, TXT, DOC, DOCX files up to 5MB" id="job-description-upload" maxSizeInBytes={MAX_FILE_SIZE_BYTES}/></CardContent></Card></div>
            <div className="flex-1"><Card className="shadow-lg h-full"><CardHeader><CardTitle className="flex items-center text-xl font-headline"><Users className="w-6 h-6 mr-3 text-primary" />Upload Resumes</CardTitle><CardDescription>Upload resumes to screen for the selected role.</CardDescription></CardHeader><CardContent><FileUploadArea onFilesUpload={handleResumesUpload} acceptedFileTypes={{ "application/pdf": [".pdf"], "text/plain": [".txt"],"application/msword": [".doc"], "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"]}} multiple label="PDF, TXT, DOC, DOCX files up to 5MB" id="resume-upload" maxSizeInBytes={MAX_FILE_SIZE_BYTES}/></CardContent></Card></div>
          </div>
          
          <div className="flex justify-center pt-4"><Button ref={processButtonRef} onClick={() => handleScreening(selectedJobRoleId)} disabled={isProcessing || !selectedJobRoleId || uploadedResumeFiles.length === 0} size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground text-base px-8 py-6 shadow-md">{(isLoadingScreening) ? <Snail className="w-5 h-5 mr-2 animate-spin" /> : <ScanSearch className="w-5 h-5 mr-2" />}Screen Resumes & Save</Button></div>
          
          <div ref={resultsSectionRef} className="space-y-8">
            {isProcessing && !currentScreeningResult && (<Card className="shadow-lg"><CardContent className="pt-6"><LoadingIndicator stage={getLoadingStage()} /></CardContent></Card>)}
            
            {(extractedJobRoles.length > 0 || allScreeningResults.length > 0 || isProcessing) && (
              <>
                <Separator className="my-8" />
                <div className="p-6 rounded-lg border shadow-sm space-y-6 bg-card">
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
                  />
                   {currentScreeningResult && (
                    <Button onClick={handleEmailFilteredCandidates} disabled={isProcessing || displayedCandidates.length === 0}>
                      <Mail className="mr-2 h-4 w-4" />
                      Email Filtered Candidates ({displayedCandidates.filter(c => c.email).length})
                    </Button>
                  )}
                </div>
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
                    {extractedJobRoles.length === 0 ? "Upload a job description to begin." : !selectedJobRoleId ? "Select a job role to see its latest results, or view history." : "No saved results for this role. Upload resumes and click 'Screen' to begin."}
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
           />
        </>
      )}
    </div>
  );
}
