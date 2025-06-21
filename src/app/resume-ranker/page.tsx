
"use client";

import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileUploadArea } from "@/components/file-upload-area";
import { CandidateTable } from "@/components/candidate-table";
import { FeedbackModal } from "@/components/feedback-modal";
import { FilterControls } from "@/components/filter-controls";
import { useToast } from "@/hooks/use-toast";
import { performBulkScreening, type PerformBulkScreeningInput, type PerformBulkScreeningOutput } from "@/ai/flows/rank-candidates";
import { extractJobRoles as extractJobRolesAI, type ExtractJobRolesInput as ExtractJobRolesAIInput, type ExtractJobRolesOutput as ExtractJobRolesAIOutput } from "@/ai/flows/extract-job-roles";
import type { ResumeFile, RankedCandidate, Filters, JobDescriptionFile, JobScreeningResult, ExtractedJobRole } from "@/lib/types";
import {
  saveJobScreeningResult,
  getAllJobScreeningResultsForUser,
} from "@/services/firestoreService";
import { Users, ScanSearch, Briefcase, BrainCircuit, ServerOff } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { LoadingIndicator } from "@/components/loading-indicator";
import { useLoading } from "@/contexts/loading-context";
import { useAuth } from "@/contexts/auth-context";
import { db as firestoreDb } from "@/lib/firebase/config";
import { Timestamp } from "firebase/firestore";

const initialFilters: Filters = {
  scoreRange: [0, 100],
  skillKeyword: "",
};

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

export default function ResumeRankerPage() {
  const { setIsPageLoading: setAppIsLoading } = useLoading();
  const { currentUser } = useAuth();
  const { toast } = useToast();

  // State for file uploads
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
  
  // State for modals
  const [selectedCandidateForFeedback, setSelectedCandidateForFeedback] = useState<RankedCandidate | null>(null);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState<boolean>(false);

  const resultsSectionRef = useRef<HTMLDivElement | null>(null);
  const processButtonRef = useRef<HTMLButtonElement | null>(null);

  const isFirestoreAvailable = !!firestoreDb;

  // Initial data fetch and reset logic on user change
  useEffect(() => {
    setAppIsLoading(false);
    if (currentUser && isFirestoreAvailable) {
      setIsLoadingFromDB(true);
      getAllJobScreeningResultsForUser()
        .then((results) => {
          setAllScreeningResults(results);

          // Derive unique job roles from the screening history
          const uniqueRolesMap = new Map<string, ExtractedJobRole>();
          results.forEach(result => {
            if (!uniqueRolesMap.has(result.jobDescriptionId)) {
              uniqueRolesMap.set(result.jobDescriptionId, {
                id: result.jobDescriptionId,
                name: result.jobDescriptionName,
                contentDataUri: result.jobDescriptionDataUri,
                originalDocumentName: '', 
                userId: currentUser.uid,
                createdAt: result.createdAt,
              });
            }
          });
          const derivedRoles = Array.from(uniqueRolesMap.values())
             .sort((a,b) => b.createdAt.toMillis() - a.createdAt.toMillis());

          setExtractedJobRoles(derivedRoles);
          setSelectedJobRoleId(null); 
          setSelectedHistoryId(null);
        })
        .catch(err => {
          let description = "Could not load saved data.";
          if (err.code === 'failed-precondition' || String(err).includes('index')) {
              description = "Error loading data. A database index is likely required. See developer console for a link to create it.";
          } else {
              description = String(err.message || err).substring(0, 100);
          }
          toast({ title: "Error Loading Data", description, variant: "destructive" });
        })
        .finally(() => setIsLoadingFromDB(false));
    } else {
      setIsLoadingFromDB(false);
      setExtractedJobRoles([]);
      setAllScreeningResults([]);
    }
  }, [currentUser, toast, setAppIsLoading, isFirestoreAvailable]);

  // Scroll logic for process button
  useEffect(() => {
    if (
      extractedJobRoles.length > 0 &&
      uploadedResumeFiles.length > 0 &&
      !isLoadingJDExtraction &&
      !isLoadingScreening &&
      processButtonRef.current
    ) {
      const timer = setTimeout(() => {
        processButtonRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [extractedJobRoles.length, uploadedResumeFiles.length, isLoadingJDExtraction, isLoadingScreening]);

  // Scroll logic for results section
  useEffect(() => {
    const shouldScroll = isLoadingScreening;
    if (shouldScroll && resultsSectionRef.current) {
      const timer = setTimeout(() => {
        resultsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100); 
      return () => clearTimeout(timer);
    }
  }, [isLoadingScreening]);

  const screeningHistoryForSelectedRole = useMemo(() => {
    if (!selectedJobRoleId) return [];
    return allScreeningResults
      .filter(r => r.jobDescriptionId === selectedJobRoleId)
      .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
  }, [selectedJobRoleId, allScreeningResults]);

  const currentScreeningResult = useMemo(() => {
    if (!selectedHistoryId) return null;
    return allScreeningResults.find(result => result.id === selectedHistoryId) || null;
  }, [selectedHistoryId, allScreeningResults]);

  const handleJobDescriptionUploadAndExtraction = useCallback(async (initialJdUploads: JobDescriptionFile[]) => {
    if (!currentUser?.uid) {
      toast({ title: "Not Authenticated", description: "Please log in to process job descriptions.", variant: "destructive" });
      return;
    }
    if (initialJdUploads.length === 0) return;
    
    setIsLoadingJDExtraction(true);
    try {
      const jdUploadsWithDataUriPromises = initialJdUploads.map(async (jdFile) => {
        const dataUri = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = (error) => reject(error);
          reader.readAsDataURL(jdFile.file);
        });
        return { ...jdFile, dataUri };
      });
      const jdUploads = await Promise.all(jdUploadsWithDataUriPromises);

      const aiInput: ExtractJobRolesAIInput = {
        jobDescriptionDocuments: jdUploads.map(jd => ({ name: jd.name, dataUri: jd.dataUri })),
      };
      const aiOutput: ExtractJobRolesAIOutput = await extractJobRolesAI(aiInput);
      
      if (aiOutput.length > 0) {
        const tempRoles = aiOutput.map(role => ({
          ...role,
          userId: currentUser.uid,
          createdAt: Timestamp.now(),
        })) as ExtractedJobRole[];
        
        setExtractedJobRoles(prev => [...tempRoles, ...prev]);
        toast({ title: "Job Roles Extracted", description: `${tempRoles.length} role(s) were extracted and are ready for screening.` });
        if (tempRoles.length > 0) {
           setSelectedJobRoleId(tempRoles[0].id);
           setSelectedHistoryId(null);
        }

      } else {
         toast({ title: "No Job Roles Extracted", description: "AI could not extract any roles from the provided file(s).", variant: "default" });
      }
    } catch (error: any) {
      const message = error.message || String(error);
      toast({
          title: "Job Role Extraction Failed",
          description: `An unexpected error occurred: ${message.substring(0, 100)}`,
          variant: "destructive",
      });
    } finally {
      setIsLoadingJDExtraction(false);
    }
  }, [currentUser?.uid, toast]);

  const startOrRefreshBulkScreening = useCallback(async (targetJobRoleId?: string) => {
    if (!currentUser?.uid || !isFirestoreAvailable) {
        toast({ title: "Not Authenticated", description: "Please log in to screen candidates.", variant: "destructive" });
        return;
    }
    const roleToScreen = extractedJobRoles.find(jr => jr.id === targetJobRoleId);
    if (!roleToScreen || uploadedResumeFiles.length === 0) {
      if(!roleToScreen) toast({ title: "No Job Role Selected", description: "Cannot start screening without a selected job role.", variant: "destructive" });
      if(uploadedResumeFiles.length === 0) toast({ title: "No Resumes Uploaded", description: "Please upload resumes to screen.", variant: "destructive" });
      return;
    }

    setIsLoadingScreening(true);
    try {
      const input: PerformBulkScreeningInput = {
        jobRolesToScreen: [roleToScreen],
        resumesToRank: uploadedResumeFiles,
      };
      
      const outputFromAI: PerformBulkScreeningOutput = await performBulkScreening(input);
      
      if (outputFromAI.length > 0 && outputFromAI[0]) {
        const resultToSave = outputFromAI[0];
        const savedResult = await saveJobScreeningResult(resultToSave as any); // Cast needed for Omit
        setAllScreeningResults(prev => [savedResult, ...prev]);
        setSelectedHistoryId(savedResult.id);
        toast({ title: "Screening Complete & Saved", description: "New screening session saved." });
      } else {
        toast({ title: "Screening Processed", description: "No new results were generated.", variant: "default"});
      }
      setUploadedResumeFiles([]);
    } catch (error: any) {
      const message = error.message || String(error);
      let description = message.substring(0, 100);
      let title = "Bulk Screening Failed";

      if (error.code === 'failed-precondition' || message.toLowerCase().includes('index')) {
        title = "Database Index Required";
        description = "A one-time database setup is needed. Please open your browser's developer console (F12) to find a direct link to create the required Firestore index.";
        console.error("FIRESTORE: A composite index is required for this query. Please create it using the link that should be provided in the full error message below.", error);
      } else {
        console.error("Bulk screening error:", error);
      }

      toast({
        title: title,
        description: description,
        variant: "destructive",
        duration: 10000
      });
    } finally {
      setIsLoadingScreening(false);
    }
  }, [currentUser?.uid, extractedJobRoles, uploadedResumeFiles, toast, isFirestoreAvailable]);

  const handleResumesUpload = useCallback(async (files: File[]) => {
     const newResumeFilesPromises = files.map(async (file) => {
      const dataUri = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
      });
      return { id: crypto.randomUUID(), file, dataUri, name: file.name };
    });
    try {
        const newResumeFiles = await Promise.all(newResumeFilesPromises);
        setUploadedResumeFiles(newResumeFiles); 
    } catch (error) {
         const message = error instanceof Error ? error.message : String(error);
         toast({ title: "Error processing resumes", description: message.substring(0,100), variant: "destructive"});
    }
  }, [toast]); 

  const handleJobRoleChange = useCallback((roleId: string | null) => {
    setSelectedJobRoleId(roleId);
    setSelectedHistoryId(null);
    setFilters(initialFilters);
  }, []);

  const handleHistoryChange = useCallback((historyId: string | null) => {
    setSelectedHistoryId(historyId);
    setFilters(initialFilters);
  }, []);
  
  const handleViewFeedback = (candidate: RankedCandidate) => {
    if (currentScreeningResult) { 
      setSelectedCandidateForFeedback(candidate);
      setIsFeedbackModalOpen(true);
    }
  };

  const handleFilterChange = (newFilters: Partial<Filters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };
  
  const resetFilters = () => {
    setFilters(initialFilters);
  };

  const filterCandidates = useCallback((candidates: RankedCandidate[] = [], currentFilters: Filters): RankedCandidate[] => {
    return candidates.filter(candidate => {
      const scoreMatch = candidate.score >= currentFilters.scoreRange[0] && candidate.score <= currentFilters.scoreRange[1];
      const keywordMatch = currentFilters.skillKeyword.trim() === "" || 
                           candidate.keySkills.toLowerCase().includes(currentFilters.skillKeyword.toLowerCase()) ||
                           candidate.name.toLowerCase().includes(currentFilters.skillKeyword.toLowerCase()) ||
                           candidate.originalResumeName.toLowerCase().includes(currentFilters.skillKeyword.toLowerCase());
      return scoreMatch && keywordMatch;
    });
  }, []);
  
  const displayedCandidates = useMemo(() => {
    return filterCandidates(currentScreeningResult?.candidates, filters);
  }, [currentScreeningResult, filters, filterCandidates]);

  const getLoadingStage = (): "roles" | "screening" | "general" => {
    if (isLoadingJDExtraction) return "roles";
    if (isLoadingScreening) return "screening";
    return "general";
  }
  
  const isProcessing = isLoadingJDExtraction || isLoadingScreening || isLoadingFromDB;

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-8">
       <Card className="mb-8 bg-gradient-to-r from-primary/5 via-background to-background border-primary/20 shadow-md">
        <CardHeader>
          <CardTitle className="text-2xl font-headline text-primary flex items-center">
           <BrainCircuit className="w-7 h-7 mr-3" /> AI-Powered Resume Ranker
          </CardTitle>
          <CardDescription>
            Upload job descriptions to create saved roles. Upload resumes, then screen them against a role. Your roles and screening history are saved.
          </CardDescription>
        </CardHeader>
      </Card>

      {!isFirestoreAvailable && (
        <Card className="shadow-lg border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center"><ServerOff className="w-5 h-5 mr-2" /> Database Not Connected</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-destructive-foreground">The application could not connect to the database. Data saving and loading features are disabled.</p>
          </CardContent>
        </Card>
      )}

      {!currentUser && isFirestoreAvailable && (
        <Card className="shadow-lg">
            <CardContent className="pt-6 text-center">
                <p className="text-lg text-muted-foreground">Please <a href="/login" className="text-primary underline">log in</a> to use the Resume Ranker and save your work.</p>
            </CardContent>
        </Card>
      )}

      {currentUser && isFirestoreAvailable && (
        <>
          <div className="flex flex-col md:flex-row gap-8">
            <div className="flex-1">
              <Card className="shadow-lg transition-shadow duration-300 hover:shadow-xl h-full">
                <CardHeader>
                  <CardTitle className="flex items-center text-2xl font-headline">
                    <Briefcase className="w-7 h-7 mr-3 text-primary" />
                    1. Upload Job Descriptions
                  </CardTitle>
                  <CardDescription>
                    Upload one or more JD files. Roles will be extracted for this session.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FileUploadArea
                    onFilesUpload={(files) => handleJobDescriptionUploadAndExtraction(files.map(f => ({ id: crypto.randomUUID(), file: f, dataUri: '', name: f.name })))}
                    acceptedFileTypes={{ 
                      "application/pdf": [".pdf"], "text/plain": [".txt"], "text/markdown": [".md"],
                      "application/msword": [".doc"], "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"]
                    }}
                    multiple={true}
                    label="PDF, TXT, DOC, DOCX, MD files up to 5MB each"
                    id="job-description-upload"
                    maxSizeInBytes={MAX_FILE_SIZE_BYTES}
                  />
                </CardContent>
              </Card>
            </div>
            <div className="flex-1">
              <Card className="shadow-lg transition-shadow duration-300 hover:shadow-xl h-full">
                <CardHeader>
                  <CardTitle className="flex items-center text-2xl font-headline">
                    <Users className="w-7 h-7 mr-3 text-primary" />
                    2. Upload Resumes
                  </CardTitle>
                  <CardDescription>
                    Upload candidate resumes to be processed against the selected job role.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FileUploadArea
                    onFilesUpload={handleResumesUpload}
                    acceptedFileTypes={{ 
                        "application/pdf": [".pdf"], "text/plain": [".txt"],
                        "application/msword": [".doc"], "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"]
                    }}
                    multiple
                    label="PDF, TXT, DOC, DOCX files up to 5MB each"
                    id="resume-upload"
                    maxSizeInBytes={MAX_FILE_SIZE_BYTES}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
          
          <div className="flex justify-center pt-4">
            <Button
              ref={processButtonRef}
              onClick={() => startOrRefreshBulkScreening(selectedJobRoleId || undefined)}
              disabled={isProcessing || !selectedJobRoleId || uploadedResumeFiles.length === 0}
              size="lg"
              className="bg-accent hover:bg-accent/90 text-accent-foreground text-base px-8 py-6 shadow-md hover:shadow-lg transition-all duration-150 hover:scale-105 active:scale-95"
            >
              {(isLoadingScreening) ? ( 
                <BrainCircuit className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <ScanSearch className="w-5 h-5 mr-2" />
              )}
              3. Screen Candidates & Save Session
            </Button>
          </div>
          
          <div ref={resultsSectionRef} className="space-y-8">
            {(isProcessing && !currentScreeningResult) && (
               <Card className="shadow-lg">
                   <CardContent className="pt-6">
                      <LoadingIndicator stage={getLoadingStage()} />
                   </CardContent>
               </Card>
            )}

            {(!isProcessing || extractedJobRoles.length > 0) && (
              <>
                <Separator className="my-8" />
                <FilterControls 
                  filters={filters} 
                  onFilterChange={handleFilterChange} 
                  onResetFilters={resetFilters}
                  extractedJobRoles={extractedJobRoles}
                  selectedJobRoleId={selectedJobRoleId}
                  onJobRoleChange={handleJobRoleChange}
                  isLoading={isProcessing}
                  screeningHistory={screeningHistoryForSelectedRole}
                  selectedHistoryId={selectedHistoryId}
                  onHistoryChange={handleHistoryChange}
                  onRefreshScreeningForRole={startOrRefreshBulkScreening}
                />
              </>
            )}
            
            {!isLoadingScreening && currentScreeningResult && (
                <>
                  <Card className="shadow-lg transition-shadow duration-300 hover:shadow-xl mb-8">
                    <CardHeader>
                      <CardTitle className="text-2xl font-headline text-primary">
                        Screening Results for: {currentScreeningResult.jobDescriptionName}
                      </CardTitle>
                      <CardDescription>
                         Showing results from screening session on {currentScreeningResult.createdAt.toDate().toLocaleString()}. Total candidates processed: {currentScreeningResult.candidates.length}. Showing {displayedCandidates.length} after filters.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <CandidateTable 
                        candidates={displayedCandidates} 
                        onViewFeedback={handleViewFeedback} 
                      />
                      {currentScreeningResult.candidates && currentScreeningResult.candidates.length > 0 && displayedCandidates.length === 0 && (
                          <p className="text-center text-muted-foreground py-4">No candidates match the current filter criteria.</p>
                      )}
                       {currentScreeningResult.candidates.length === 0 && (
                        <p className="text-center text-muted-foreground py-4">
                          No candidates were processed in this screening session.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </>
            )}

            {!isProcessing && !selectedHistoryId && (
              <>
                {extractedJobRoles.length === 0 && !isLoadingFromDB && (
                  <p className="text-center text-muted-foreground py-8">Upload job descriptions to begin.</p>
                )}
                {extractedJobRoles.length > 0 && !selectedJobRoleId && (
                   <p className="text-center text-muted-foreground py-8">Select a job role from the dropdown above.</p>
                )}
                {selectedJobRoleId && screeningHistoryForSelectedRole.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">Upload resumes and click "Screen Candidates" to create your first screening session for this role.</p>
                )}
                 {selectedJobRoleId && screeningHistoryForSelectedRole.length > 0 && !selectedHistoryId && (
                    <p className="text-center text-muted-foreground py-8">Select a screening session from the history dropdown to view results.</p>
                )}
              </>
            )}
          </div>

          <FeedbackModal
            isOpen={isFeedbackModalOpen}
            onClose={() => setIsFeedbackModalOpen(false)}
            candidate={selectedCandidateForFeedback}
            jobDescriptionDataUri={currentScreeningResult?.jobDescriptionDataUri ?? null} 
          />
        </>
      )}
    </div>
  );
}
