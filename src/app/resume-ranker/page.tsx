
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
import { extractJobRoles as extractJobRolesAI, type ExtractJobRolesOutput as ExtractJobRolesAIOutput } from "@/ai/flows/extract-job-roles";
import type { ResumeFile, RankedCandidate, Filters, JobScreeningResult, ExtractedJobRole, PerformBulkScreeningInput } from "@/lib/types";
// Firebase Services
import { saveJobScreeningResult, getAllJobScreeningResultsForUser, deleteJobScreeningResult, deleteAllJobScreeningResults } from "@/services/firestoreService";
import { db as firestoreDb } from "@/lib/firebase/config";
import { Timestamp } from "firebase/firestore";


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
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(true);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  
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


  const isProcessing = isLoadingJDExtraction || isStreaming || isLoadingHistory;

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
    if (isStreaming && resultsSectionRef.current) {
      const timer = setTimeout(() => {
        resultsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100); 
      return () => clearTimeout(timer);
    }
  }, [isStreaming]);

  const handleJobDescriptionUploadAndExtraction = useCallback(async (files: File[]) => {
    if (!currentUser?.uid) return;
    setIsLoadingJDExtraction(true);
    setCurrentScreeningResult(null);
    try {
      const jdUploadsPromises = files.map(async (file) => {
        const dataUri = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader(); reader.onload = () => resolve(reader.result as string); reader.onerror = reject; reader.readAsDataURL(file);
        });
        return { name: file.name, dataUri };
      });
      const jdUploads = await Promise.all(jdUploadsPromises);
      
      const aiInput = { jobDescriptionDocuments: jdUploads };
      const aiOutput: ExtractJobRolesAIOutput = await extractJobRolesAI(aiInput);
      
      if (aiOutput.length > 0) {
        setExtractedJobRoles(aiOutput);
        setSelectedJobRoleId(aiOutput[0].id);
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

 const handleScreening = useCallback(async () => {
    const roleToScreen = extractedJobRoles.find(jr => jr.id === selectedJobRoleId);
    if (!currentUser?.uid || !roleToScreen || uploadedResumeFiles.length === 0) {
      toast({ title: "Cannot Start Screening", description: "Please ensure a job role is selected and resumes are uploaded.", variant: "destructive" });
      return;
    }
    
    setIsStreaming(true);
    const screeningStartTime = Timestamp.now();
    setCurrentScreeningResult({
      id: `temp-${roleToScreen.id}`,
      jobDescriptionId: roleToScreen.id,
      jobDescriptionName: roleToScreen.name,
      jobDescriptionDataUri: roleToScreen.contentDataUri,
      candidates: [],
      userId: currentUser.uid,
      createdAt: screeningStartTime,
    });
    
    const uniqueCandidates = new Map<string, RankedCandidate>();

    try {
      const requestBody: PerformBulkScreeningInput = {
        jobDescription: {
          id: roleToScreen.id,
          name: roleToScreen.name,
          contentDataUri: roleToScreen.contentDataUri,
          originalDocumentName: roleToScreen.originalDocumentName,
        },
        resumes: uploadedResumeFiles.map(r => ({ id: r.id, dataUri: r.dataUri, name: r.name })),
      };

      const response = await fetch('/api/rank-resumes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok || !response.body) {
        const errorData = await response.json().catch(() => ({ error: 'Request failed', details: `Server responded with ${response.status}` }));
        throw new Error(errorData.details || 'An unknown server error occurred.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim() === '') continue;
          try {
            const candidate: RankedCandidate = JSON.parse(line);
            
            const key = candidate.email || candidate.id;
            const existingCandidate = uniqueCandidates.get(key);

            if (!existingCandidate || candidate.score > existingCandidate.score) {
              uniqueCandidates.set(key, candidate);
            }

            const candidatesToShow = Array.from(uniqueCandidates.values()).sort((a,b) => b.score - a.score);
            setCurrentScreeningResult(prev => prev ? { ...prev, candidates: candidatesToShow } : null);
          } catch (e) {
             console.error("Failed to parse chunk:", line, e);
          }
        }
      }

      const finalCandidates = Array.from(uniqueCandidates.values());
      if (currentUser?.uid && roleToScreen && finalCandidates.length > 0 && isFirestoreAvailable) {
        const resultToSave = {
            jobDescriptionId: roleToScreen.id,
            jobDescriptionName: roleToScreen.name,
            jobDescriptionDataUri: roleToScreen.contentDataUri,
            candidates: finalCandidates,
        };
        const savedResult = await saveJobScreeningResult(resultToSave);
        setCurrentScreeningResult(savedResult);
        setAllScreeningResults(prev => [savedResult, ...prev.filter(r => r.id !== savedResult.id)]);
        toast({ title: "Screening Complete", description: "Results have been saved to your history." });
      }

    } catch (error) {
      const message = error instanceof Error ? error.message : "An unknown error occurred during streaming.";
      console.error("Streaming error:", error);
      toast({ title: "Screening Failed", description: message, variant: "destructive" });
    } finally {
      setIsStreaming(false);
    }
  }, [currentUser?.uid, extractedJobRoles, uploadedResumeFiles, selectedJobRoleId, toast, isFirestoreAvailable]);
  
  const handleResumesUpload = useCallback(async (files: File[]) => {
    const newFiles: ResumeFile[] = [];
    const existingFileNames = new Set(uploadedResumeFiles.map(f => f.name));
    let skippedCount = 0;

    for (const file of files) {
        if (existingFileNames.has(file.name)) {
            skippedCount++;
            continue;
        }
        const dataUri = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = (error) => reject(error);
            reader.readAsDataURL(file);
        });
        newFiles.push({ id: crypto.randomUUID(), file, dataUri, name: file.name });
        existingFileNames.add(file.name);
    }

    if (skippedCount > 0) {
        toast({
            title: "Duplicate Files Skipped",
            description: `${skippedCount} file(s) with the same name were not added.`,
        });
    }
    
    if (newFiles.length > 0) {
        setUploadedResumeFiles(prev => [...prev, ...newFiles]);
    }

  }, [uploadedResumeFiles, toast]); 

  const handleJobRoleChange = (roleId: string | null) => {
    if (isStreaming) {
        toast({ title: "Screening in Progress", description: "Please wait for the current screening to finish before changing roles.", variant: "destructive" });
        return;
    }
    setSelectedJobRoleId(roleId);
    setFilters(initialFilters);
    
    const isSwitchingActiveSession = extractedJobRoles.some(jr => jr.id === roleId);

    if (!isSwitchingActiveSession || currentScreeningResult?.jobDescriptionId !== roleId) {
      setCurrentScreeningResult(null);
    }
  };

  const handleLoadHistorySession = (result: JobScreeningResult) => {
    setExtractedJobRoles([]);
    setUploadedResumeFiles([]);
    setCurrentScreeningResult(result);
    setSelectedJobRoleId(null);
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

  const emailableCandidateCount = useMemo(() => {
    return displayedCandidates.filter(c => c.email).length;
  }, [displayedCandidates]);
  
  const handleViewFeedback = (candidate: RankedCandidate) => { setSelectedCandidateForFeedback(candidate); setIsFeedbackModalOpen(true); };
  
  const handleEmailSingleCandidate = (candidate: RankedCandidate) => {
      if (!candidate.email) {
        toast({ title: "Email Not Found", description: `Could not find an email address for ${candidate.name}.`, variant: "destructive"});
        return;
      }
       setSelectedCandidateForFeedback(candidate);
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
    if (isLoadingJDExtraction) return "roles"; if (isStreaming) return "screening"; return "general";
  }

  if (!currentUser) {
     return (
        <div className="container mx-auto p-4 md:p-8 space-y-8 pt-24">
            <Card className="shadow-lg"><CardContent className="pt-6 text-center"><p className="text-lg text-muted-foreground">Please <a href="/login" className="text-primary underline">log in</a> to use the Resume Ranker.</p></CardContent></Card>
        </div>
    );
  }

  const processedCount = currentScreeningResult?.candidates?.length || 0;
  const totalToProcess = uploadedResumeFiles.length;
  const progressPercentage = totalToProcess > 0 ? (processedCount / totalToProcess) * 100 : 0;

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-8 pt-24">
      <Card className="mb-8 shadow-md"><CardHeader><CardTitle className="text-2xl font-headline text-primary flex items-center"><Snail className="w-7 h-7 mr-3" /> AI-Powered Resume Ranker</CardTitle><CardDescription>Upload job descriptions to create roles, then upload resumes to screen candidates. Your screening sessions are saved automatically.</CardDescription></CardHeader></Card>

      {!isFirestoreAvailable && (<Card className="shadow-lg border-destructive"><CardHeader><CardTitle className="text-destructive flex items-center"><ServerOff className="w-5 h-5 mr-2" /> Database Not Connected</CardTitle></CardHeader><CardContent><p>Database features are disabled.</p></CardContent></Card>)}
      
      {isFirestoreAvailable && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="shadow-lg"><CardHeader><CardTitle className="flex items-center text-xl font-headline"><Briefcase className="w-6 h-6 mr-3 text-primary" />Upload Job Descriptions</CardTitle><CardDescription>Create new roles for this session.</CardDescription></CardHeader><CardContent><FileUploadArea onFilesUpload={handleJobDescriptionUploadAndExtraction} acceptedFileTypes={{ "application/pdf": [".pdf"], "text/plain": [".txt"],"application/msword": [".doc"], "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"]}} multiple={true} label="PDF, TXT, DOC, DOCX files up to 5MB" id="job-description-upload" maxSizeInBytes={MAX_FILE_SIZE_BYTES}/></CardContent></Card>
            <Card className="shadow-lg"><CardHeader><CardTitle className="flex items-center text-xl font-headline"><Users className="w-6 h-6 mr-3 text-primary" />Upload Resumes</CardTitle><CardDescription>Upload resumes to screen for the selected role.</CardDescription></CardHeader><CardContent><FileUploadArea onFilesUpload={handleResumesUpload} acceptedFileTypes={{ "application/pdf": [".pdf"], "text/plain": [".txt"],"application/msword": [".doc"], "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"]}} multiple label="PDF, TXT, DOC, DOCX files up to 5MB" id="resume-upload" maxSizeInBytes={MAX_FILE_SIZE_BYTES}/></CardContent></Card>
          </div>
          
          <div className="flex justify-center pt-4"><Button ref={processButtonRef} onClick={handleScreening} disabled={isProcessing || !selectedJobRoleId || uploadedResumeFiles.length === 0} size="lg" className="shiny-button">{(isStreaming) ? <Snail className="w-5 h-5 mr-2 animate-spin" /> : <ScanSearch className="w-5 h-5 mr-2" />}Screen Resumes &amp; Save</Button></div>
          
          <div ref={resultsSectionRef} className="space-y-8">
            {isStreaming && (
              <Card className="shadow-lg">
                <CardContent className="pt-6">
                  <LoadingIndicator
                    stage={getLoadingStage()}
                    progress={progressPercentage}
                    processedItems={processedCount}
                    totalItems={totalToProcess}
                  />
                </CardContent>
              </Card>
            )}
            
            {(extractedJobRoles.length > 0 || allScreeningResults.length > 0 || isLoadingJDExtraction) && !isStreaming && (
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
                />
              </>
            )}

            {currentScreeningResult && !isStreaming && (
              <Card className="shadow-lg mb-8">
                <CardHeader>
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      <div>
                        <CardTitle className="text-2xl font-headline text-primary">
                          Results for: {currentScreeningResult.jobDescriptionName}
                        </CardTitle>
                        <CardDescription>
                           Session from {currentScreeningResult.createdAt.toDate().toLocaleString()}.
                          Processed: {currentScreeningResult.candidates.length} unique candidate(s). 
                          Showing: {displayedCandidates.length}.
                        </CardDescription>
                      </div>
                      <Button variant="outline" size="sm" onClick={handleEmailFilteredCandidates} disabled={isProcessing || emailableCandidateCount === 0}>
                          <Mail className="w-4 h-4 mr-2" />
                          Email Filtered ({emailableCandidateCount})
                      </Button>
                  </div>
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
