
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
import { Users, ScanSearch, Briefcase, BrainCircuit, Trash2, RotateCw } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { LoadingIndicator } from "@/components/loading-indicator";
import { useLoading } from "@/contexts/loading-context";
import { useAuth } from "@/contexts/auth-context";
// Firestore service imports removed

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
  
  const [extractedJobRoles, setExtractedJobRoles] = useState<ExtractedJobRole[]>([]); // Managed in-memory
  const [selectedJobRoleId, setSelectedJobRoleId] = useState<string | null>(null);
  
  const [allScreeningResults, setAllScreeningResults] = useState<JobScreeningResult[]>([]); // All results, in-memory
  
  const [isLoadingJDs, setIsLoadingJDs] = useState<boolean>(false); // For AI extraction
  const [isLoadingScreening, setIsLoadingScreening] = useState<boolean>(false); // For AI Screening
  
  const [selectedCandidateForFeedback, setSelectedCandidateForFeedback] = useState<RankedCandidate | null>(null);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState<boolean>(false);
  const [filters, setFilters] = useState<Filters>(initialFilters);

  const { toast } = useToast();
  const resultsSectionRef = useRef<HTMLDivElement | null>(null);
  const processButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    setAppIsLoading(false);
    // No initial data loading from Firestore
    if (!currentUser) {
        setExtractedJobRoles([]);
        setAllScreeningResults([]);
        setSelectedJobRoleId(null);
    }
  }, [currentUser, setAppIsLoading]);

  useEffect(() => {
    if (
      extractedJobRoles.length > 0 &&
      uploadedResumeFiles.length > 0 &&
      !isLoadingJDs &&
      !isLoadingScreening &&
      processButtonRef.current
    ) {
      const timer = setTimeout(() => {
        processButtonRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [extractedJobRoles, uploadedResumeFiles, isLoadingJDs, isLoadingScreening]);

  useEffect(() => {
    const shouldScroll = isLoadingJDs || isLoadingScreening || (!isLoadingScreening && !isLoadingJDs && allScreeningResults.length > 0 && selectedJobRoleId);
    if (shouldScroll && resultsSectionRef.current) {
      const timer = setTimeout(() => {
        resultsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100); 
      return () => clearTimeout(timer);
    }
  }, [isLoadingJDs, isLoadingScreening, allScreeningResults, selectedJobRoleId]);

  const currentScreeningResult = useMemo(() => {
    if (!selectedJobRoleId || allScreeningResults.length === 0) {
      return null;
    }
    const foundResult = allScreeningResults.find(result => result.jobDescriptionId === String(selectedJobRoleId));
    return foundResult || null;
  }, [selectedJobRoleId, allScreeningResults]);

  // Effect to auto-select first job role if not already selected and roles are loaded
  useEffect(() => {
    if (!selectedJobRoleId && extractedJobRoles.length > 0) {
      setSelectedJobRoleId(extractedJobRoles[0].id);
    }
  }, [selectedJobRoleId, extractedJobRoles]);

  const handleJobDescriptionUploadAndExtraction = useCallback(async (jdUploads: JobDescriptionFile[]) => {
    if (!currentUser?.uid) {
      toast({ title: "Not Authenticated", description: "Please log in to upload job descriptions.", variant: "destructive" });
      return;
    }
    if (jdUploads.length === 0) return;
    
    setIsLoadingJDs(true);
    try {
      const aiInput: ExtractJobRolesAIInput = {
        jobDescriptionDocuments: jdUploads.map(jd => ({ name: jd.name, dataUri: jd.dataUri })),
      };
      const aiOutput: ExtractedJobRole[] = await extractJobRolesAI(aiInput); // Type is now ExtractedJobRole[]
      
      if (aiOutput.length > 0) {
        // Add to existing roles or replace, depending on desired behavior. Here, we append.
        // Filter out potential duplicates by id if re-uploading same files for extraction
        const newRoles = aiOutput.filter(newRole => !extractedJobRoles.some(existing => existing.id === newRole.id));
        setExtractedJobRoles(prevRoles => [...prevRoles, ...newRoles]);
        toast({ title: "Job Roles Extracted", description: `${aiOutput.length} role(s) processed from files.` });
        if (!selectedJobRoleId && newRoles.length > 0) {
            setSelectedJobRoleId(newRoles[0].id);
        }
      } else {
         toast({ title: "No New Job Roles Extracted", description: "AI could not extract new job roles from the provided files.", variant: "default" });
      }
      setUploadedJobDescriptionFiles([]);

    } catch (error) {
      toast({ title: "Job Role Extraction Failed", description: String(error), variant: "destructive" });
    } finally {
      setIsLoadingJDs(false);
    }
  }, [currentUser?.uid, toast, selectedJobRoleId, extractedJobRoles]);

  const handleDeleteJobRole = async (roleIdToDelete: string) => {
    if (!currentUser?.uid) return;
    
    setExtractedJobRoles(prevRoles => prevRoles.filter(role => role.id !== roleIdToDelete));
    setAllScreeningResults(prevResults => prevResults.filter(r => r.jobDescriptionId !== roleIdToDelete));
    
    if (selectedJobRoleId === roleIdToDelete) {
      const newRoles = extractedJobRoles.filter(role => role.id !== roleIdToDelete);
      setSelectedJobRoleId(newRoles.length > 0 ? newRoles[0].id : null);
    }
    toast({ title: "Job Role Removed", description: "The job role and its screening data have been removed from this session." });
  };

  const startOrRefreshBulkScreening = useCallback(async (targetJobRoleId?: string) => {
    if (!currentUser?.uid) {
        toast({ title: "Not Authenticated", description: "Please log in to screen candidates.", variant: "destructive" });
        return;
    }
    const rolesToScreen = targetJobRoleId 
      ? extractedJobRoles.filter(jr => jr.id === targetJobRoleId) 
      : extractedJobRoles;

    if (rolesToScreen.length === 0 || uploadedResumeFiles.length === 0) {
      if(rolesToScreen.length === 0) toast({ title: "No Job Roles Available/Selected", description: "Cannot start screening without job roles.", variant: "destructive" });
      if(uploadedResumeFiles.length === 0) toast({ title: "No Resumes Uploaded", description: "Please upload resumes to screen.", variant: "destructive" });
      return;
    }

    setIsLoadingScreening(true);

    try {
      const input: PerformBulkScreeningInput = {
        jobRolesToScreen: rolesToScreen, // Uses the client-side ExtractedJobRole type
        resumesToRank: uploadedResumeFiles,
      };
      
      const outputFromAI: PerformBulkScreeningOutput = await performBulkScreening(input);
      
      // Update or add results in allScreeningResults state
      setAllScreeningResults(prevResults => {
        const updatedResults = [...prevResults];
        outputFromAI.forEach(newResult => {
          const existingIndex = updatedResults.findIndex(r => r.jobDescriptionId === newResult.jobDescriptionId);
          if (existingIndex !== -1) {
            updatedResults[existingIndex] = newResult; // Replace
          } else {
            updatedResults.push(newResult); // Add
          }
        });
        return updatedResults;
      });
      
      if (outputFromAI.length > 0) {
        toast({ title: "Screening Complete", description: `${outputFromAI.length} job role(s) processed.` });
        if (targetJobRoleId) setSelectedJobRoleId(targetJobRoleId);
        else if (outputFromAI.length > 0 && !selectedJobRoleId) setSelectedJobRoleId(outputFromAI[0].jobDescriptionId);
      } else {
        toast({ title: "Screening Processed", description: "No new screening results were generated.", variant: "default"});
      }
    } catch (error) {
      toast({ title: "Bulk Screening Failed", description: String(error), variant: "destructive" });
    } finally {
      setIsLoadingScreening(false);
    }
  }, [currentUser?.uid, extractedJobRoles, uploadedResumeFiles, toast, selectedJobRoleId]);

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
         toast({ title: "Error processing resumes", description: String(error), variant: "destructive"});
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
    if (isLoadingJDs) return "roles";
    if (isLoadingScreening) return "screening";
    return "general";
  }

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-8">
       <Card className="mb-8 bg-gradient-to-r from-primary/5 via-background to-background border-primary/20 shadow-md">
        <CardHeader>
          <CardTitle className="text-2xl font-headline text-primary flex items-center">
           <BrainCircuit className="w-7 h-7 mr-3" /> AI-Powered Resume Ranker
          </CardTitle>
          <CardDescription>
            Upload job descriptions (JDs) to create roles, then upload resumes. Process candidates to rank them against your selected job role. Data is not saved beyond this session.
          </CardDescription>
        </CardHeader>
      </Card>
      {!currentUser && (
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
                    Job Descriptions
                  </CardTitle>
                  <CardDescription>
                    Upload JD files. Roles will be extracted and listed in the filter section for this session.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FileUploadArea
                    onFilesUpload={(files) => handleJobDescriptionUploadAndExtraction(files.map(f => ({ id: crypto.randomUUID(), file: f, dataUri: '', name: f.name })))} // map to JobDescriptionFile structure for handler
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
                    Upload Resumes
                  </CardTitle>
                  <CardDescription>
                    Upload candidate resumes. These will be processed against the selected job role.
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
              disabled={isLoadingScreening || isLoadingJDs || !selectedJobRoleId || uploadedResumeFiles.length === 0}
              size="lg"
              className="bg-accent hover:bg-accent/90 text-accent-foreground text-base px-8 py-6 shadow-md hover:shadow-lg transition-all duration-150 hover:scale-105 active:scale-95"
            >
              {(isLoadingScreening) ? ( 
                <BrainCircuit className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <ScanSearch className="w-5 h-5 mr-2" />
              )}
              Process Candidates for Selected Role
            </Button>
          </div>
          
          <div ref={resultsSectionRef} className="space-y-8">
            {(isLoadingJDs || isLoadingScreening) && (
               <Card className="shadow-lg">
                   <CardContent className="pt-6">
                      <LoadingIndicator stage={getLoadingStage()} />
                   </CardContent>
               </Card>
            )}

            {!isLoadingJDs && extractedJobRoles.length > 0 && (
              <>
                <Separator className="my-8" />
                <FilterControls 
                  filters={filters} 
                  onFilterChange={handleFilterChange} 
                  onResetFilters={resetFilters}
                  extractedJobRoles={extractedJobRoles}
                  selectedJobRoleId={selectedJobRoleId}
                  onJobRoleChange={handleJobRoleChange}
                  isLoadingRoles={isLoadingJDs || isLoadingScreening}
                  onDeleteJobRole={handleDeleteJobRole}
                  onRefreshScreeningForRole={startOrRefreshBulkScreening}
                />
              </>
            )}
            
            {!isLoadingScreening && !isLoadingJDs && currentScreeningResult && (
                <>
                  <Card className="shadow-lg transition-shadow duration-300 hover:shadow-xl mb-8">
                    <CardHeader>
                      <CardTitle className="text-2xl font-headline text-primary flex items-center">
                        <Briefcase className="w-6 h-6 mr-2" />
                        Results for: {currentScreeningResult.jobDescriptionName}
                      </CardTitle>
                      <CardDescription>
                        Candidates ranked for job role: "{currentScreeningResult.jobDescriptionName}".
                        Total resumes provided for this screening: {currentScreeningResult.candidates.length}.
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
                       {currentScreeningResult.candidates.length === 0 && uploadedResumeFiles.length > 0 && (
                        <p className="text-center text-muted-foreground py-4">
                          No candidates were processed successfully for "{currentScreeningResult.jobDescriptionName}". Or no resumes were uploaded for this processing run.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </>
            )}

            {!isLoadingScreening && !isLoadingJDs && !currentScreeningResult && currentUser && (
              <>
                {extractedJobRoles.length === 0 && !isLoadingJDs && (
                  <p className="text-center text-muted-foreground py-8">Upload job descriptions to get started. Roles will appear in the filter section.</p>
                )}
                {extractedJobRoles.length > 0 && !selectedJobRoleId && (
                   <p className="text-center text-muted-foreground py-8">Select a job role from the filters above to view or process candidates.</p>
                )}
                {selectedJobRoleId && uploadedResumeFiles.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">Upload resumes and click "Process Candidates" to see rankings for the selected role.</p>
                )}
                 {selectedJobRoleId && uploadedResumeFiles.length > 0 && !allScreeningResults.find(r => r.jobDescriptionId === selectedJobRoleId) && (
                  <p className="text-center text-muted-foreground py-8">Click "Process Candidates" to start screening for "{extractedJobRoles.find(r => r.id === selectedJobRoleId)?.name}".</p>
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
