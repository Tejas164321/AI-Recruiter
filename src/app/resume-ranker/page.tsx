
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
import { Users, ScanSearch, Briefcase, BrainCircuit, RotateCw, Database, ServerOff } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { LoadingIndicator } from "@/components/loading-indicator";
import { useLoading } from "@/contexts/loading-context";
import { useAuth } from "@/contexts/auth-context";
import { db as firestoreDb } from "@/lib/firebase/config"; // Import db to check availability

const initialFilters: Filters = {
  scoreRange: [0, 100],
  skillKeyword: "",
};

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export default function ResumeRankerPage() {
  const { setIsPageLoading: setAppIsLoading } = useLoading();
  const { currentUser } = useAuth();

  const [uploadedJobDescriptionFiles, setUploadedJobDescriptionFiles] = useState<JobDescriptionFile[]>([]);
  const [uploadedResumeFiles, setUploadedResumeFiles] = useState<ResumeFile[]>([]);
  
  const [extractedJobRoles, setExtractedJobRoles] = useState<ExtractedJobRole[]>([]);
  const [selectedJobRoleId, setSelectedJobRoleId] = useState<string | null>(null);
  
  const [sessionScreeningResults, setSessionScreeningResults] = useState<JobScreeningResult[]>([]);
  
  const [isLoadingJDExtraction, setIsLoadingJDExtraction] = useState<boolean>(false);
  const [isLoadingScreening, setIsLoadingScreening] = useState<boolean>(false);
  
  const [selectedCandidateForFeedback, setSelectedCandidateForFeedback] = useState<RankedCandidate | null>(null);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState<boolean>(false);
  const [filters, setFilters] = useState<Filters>(initialFilters);

  const { toast } = useToast();
  const resultsSectionRef = useRef<HTMLDivElement | null>(null);
  const processButtonRef = useRef<HTMLButtonElement | null>(null);

  const isFirestoreAvailable = !!firestoreDb;

  useEffect(() => {
    setAppIsLoading(false); // General page loader off once component mounts
    // On user change, reset the entire state to ensure a clean slate
    if (currentUser) {
      setUploadedJobDescriptionFiles([]);
      setUploadedResumeFiles([]);
      setExtractedJobRoles([]);
      setSelectedJobRoleId(null);
      setSessionScreeningResults([]);
    }
  }, [currentUser, setAppIsLoading]);


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
  }, [extractedJobRoles, uploadedResumeFiles, isLoadingJDExtraction, isLoadingScreening]);

  useEffect(() => {
    const shouldScroll = isLoadingScreening;
    if (shouldScroll && resultsSectionRef.current) {
      const timer = setTimeout(() => {
        resultsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100); 
      return () => clearTimeout(timer);
    }
  }, [isLoadingScreening]);

  const currentScreeningResult = useMemo(() => {
    if (!selectedJobRoleId) {
      return null;
    }
    return sessionScreeningResults.find(result => result.jobDescriptionId === selectedJobRoleId) || null;
  }, [selectedJobRoleId, sessionScreeningResults]);

  const handleJobDescriptionUploadAndExtraction = useCallback(async (initialJdUploads: JobDescriptionFile[]) => {
    if (!currentUser?.uid) {
      toast({ title: "Not Authenticated", description: "Please log in to process job descriptions.", variant: "destructive" });
      return;
    }
    if (initialJdUploads.length === 0) return;
    
    setIsLoadingJDExtraction(true);
    setSessionScreeningResults([]); // New JDs mean previous results are invalid
    try {
      const jdUploadsWithDataUriPromises = initialJdUploads.map(async (jdFile) => {
        if (!jdFile.file) {
            console.error(`File object is missing for ${jdFile.name} during dataUri generation.`);
            throw new Error(`File object is missing for ${jdFile.name}.`);
        }
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
      
      // We are now just setting the roles in local state, not saving to DB
      if (aiOutput.length > 0) {
        // Here we append to existing session JDs, to allow multiple uploads in one session
        setExtractedJobRoles(prevRoles => {
          const newRoles = [...prevRoles];
          aiOutput.forEach(role => {
            // A simple check to avoid adding the exact same role twice if user re-uploads
            if(!newRoles.some(r => r.name === role.name && r.originalDocumentName === role.originalDocumentName)) {
              newRoles.push(role as ExtractedJobRole);
            }
          });
          return newRoles;
        });

        toast({ title: "Job Roles Extracted", description: `${aiOutput.length} role(s) processed for this session.` });
        
        // Always select the newest uploaded role if none is selected
        if (!selectedJobRoleId && aiOutput.length > 0) {
            setSelectedJobRoleId(aiOutput[0].id);
        }

      } else {
         toast({ title: "No Job Roles Extracted", description: "AI could not extract job roles from the provided files.", variant: "default" });
      }
      setUploadedJobDescriptionFiles([]);

    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("Job Role Extraction Full Error:", error);
      toast({
          title: "Job Role Extraction Failed",
          description: `An unexpected error occurred: ${message.substring(0, 100)}`,
          variant: "destructive",
      });
    } finally {
      setIsLoadingJDExtraction(false);
    }
  }, [currentUser?.uid, toast, selectedJobRoleId]);

  const startOrRefreshBulkScreening = useCallback(async (targetJobRoleId?: string) => {
    if (!currentUser?.uid) {
        toast({ title: "Not Authenticated", description: "Please log in to screen candidates.", variant: "destructive" });
        return;
    }
    const rolesToScreenForAI = targetJobRoleId 
      ? extractedJobRoles.filter(jr => jr.id === targetJobRoleId).map(jr => ({id: jr.id, name: jr.name, contentDataUri: jr.contentDataUri, originalDocumentName: jr.originalDocumentName }))
      : extractedJobRoles.map(jr => ({id: jr.id, name: jr.name, contentDataUri: jr.contentDataUri, originalDocumentName: jr.originalDocumentName }));

    if (rolesToScreenForAI.length === 0 || uploadedResumeFiles.length === 0) {
      if(rolesToScreenForAI.length === 0) toast({ title: "No Job Roles Available/Selected", description: "Cannot start screening without job roles.", variant: "destructive" });
      if(uploadedResumeFiles.length === 0) toast({ title: "No Resumes Uploaded", description: "Please upload resumes to screen.", variant: "destructive" });
      return;
    }

    setIsLoadingScreening(true);

    try {
      const input: PerformBulkScreeningInput = {
        jobRolesToScreen: rolesToScreenForAI,
        resumesToRank: uploadedResumeFiles,
      };
      
      const outputFromAI: PerformBulkScreeningOutput = await performBulkScreening(input);
      
      // Set results in local state instead of saving
      setSessionScreeningResults(prevResults => {
          const newResults = [...prevResults];
          outputFromAI.forEach(newResult => {
              const existingIndex = newResults.findIndex(r => r.jobDescriptionId === newResult.jobDescriptionId);
              if (existingIndex > -1) {
                  newResults[existingIndex] = newResult as JobScreeningResult;
              } else {
                  newResults.push(newResult as JobScreeningResult);
              }
          });
          return newResults;
      });
      
      if (outputFromAI.length > 0) {
        toast({ title: "Screening Complete", description: `${outputFromAI.length} job role(s) processed for this session.` });
        const firstNewResult = outputFromAI[0];
        if (firstNewResult) {
            setSelectedJobRoleId(firstNewResult.jobDescriptionId);
        }

      } else {
        toast({ title: "Screening Processed", description: "No new screening results were generated.", variant: "default"});
      }
      setUploadedResumeFiles([]); // Clear uploaded resumes after processing
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("Bulk Screening Full Error:", error);
      toast({ title: "Bulk Screening Failed", description: message.substring(0,100), variant: "destructive" });
    } finally {
      setIsLoadingScreening(false);
    }
  }, [currentUser?.uid, extractedJobRoles, uploadedResumeFiles, toast]);

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
  
  const isProcessing = isLoadingJDExtraction || isLoadingScreening;

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-8">
       <Card className="mb-8 bg-gradient-to-r from-primary/5 via-background to-background border-primary/20 shadow-md">
        <CardHeader>
          <CardTitle className="text-2xl font-headline text-primary flex items-center">
           <BrainCircuit className="w-7 h-7 mr-3" /> AI-Powered Resume Ranker
          </CardTitle>
          <CardDescription>
            Upload job descriptions (JDs) and resumes for this session. Then click "Screen Candidates" to rank them against your selected job role.
          </CardDescription>
        </CardHeader>
      </Card>

      {!isFirestoreAvailable && (
        <Card className="shadow-lg border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center"><ServerOff className="w-5 h-5 mr-2" /> Database Not Connected</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-destructive-foreground">The application could not connect to the database. Some features might be affected, but session-based ranking should work.</p>
          </CardContent>
        </Card>
      )}

      {!currentUser && isFirestoreAvailable && (
        <Card className="shadow-lg">
            <CardContent className="pt-6 text-center">
                <p className="text-lg text-muted-foreground">Please <a href="/login" className="text-primary underline">log in</a> to use the Resume Ranker.</p>
            </CardContent>
        </Card>
      )}

      {currentUser && (
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
              3. Screen Candidates for Selected Role
            </Button>
          </div>
          
          <div ref={resultsSectionRef} className="space-y-8">
            {isProcessing && (
               <Card className="shadow-lg">
                   <CardContent className="pt-6">
                      <LoadingIndicator stage={getLoadingStage()} />
                   </CardContent>
               </Card>
            )}

            {!isProcessing && extractedJobRoles.length > 0 && (
              <>
                <Separator className="my-8" />
                <FilterControls 
                  filters={filters} 
                  onFilterChange={handleFilterChange} 
                  onResetFilters={resetFilters}
                  extractedJobRoles={extractedJobRoles}
                  selectedJobRoleId={selectedJobRoleId}
                  onJobRoleChange={handleJobRoleChange}
                  isLoadingRoles={isLoadingJDExtraction}
                  onRefreshScreeningForRole={startOrRefreshBulkScreening}
                />
              </>
            )}
            
            {!isLoadingScreening && currentScreeningResult && (
                <>
                  <Card className="shadow-lg transition-shadow duration-300 hover:shadow-xl mb-8">
                    <CardHeader>
                      <CardTitle className="text-2xl font-headline text-primary flex items-center">
                        <Database className="w-6 h-6 mr-2" />
                        Screening Results for: {currentScreeningResult.jobDescriptionName}
                      </CardTitle>
                      <CardDescription>
                        Candidates ranked for job role: "{currentScreeningResult.jobDescriptionName}".
                        Total candidates processed in this screening: {currentScreeningResult.candidates.length}.
                        Showing {displayedCandidates.length} after filters.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <CandidateTable 
                        candidates={displayedCandidates} 
                        onViewFeedback={handleViewFeedback} 
                      />
                      {currentScreeningResult.candidates && currentScreeningResult.candidates.length > 0 && displayedCandidates.length === 0 && (
                          <p className="text-center text-muted-foreground py-4">No candidates match the current filter criteria for "{currentScreeningResult.jobDescriptionName}".</p>
                      )}
                       {currentScreeningResult.candidates.length === 0 && (
                        <p className="text-center text-muted-foreground py-4">
                          No candidates were processed or found for "{currentScreeningResult.jobDescriptionName}" in this screening batch.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </>
            )}

            {!isProcessing && currentUser && (
              <>
                {extractedJobRoles.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">Upload job descriptions to begin.</p>
                )}
                {extractedJobRoles.length > 0 && !selectedJobRoleId && (
                   <p className="text-center text-muted-foreground py-8">Select a job role from the filters above to view or process candidates.</p>
                )}
                {selectedJobRoleId && uploadedResumeFiles.length === 0 && !currentScreeningResult && (
                  <p className="text-center text-muted-foreground py-8">Now, upload resumes and click "Screen Candidates" to see the results.</p>
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

    