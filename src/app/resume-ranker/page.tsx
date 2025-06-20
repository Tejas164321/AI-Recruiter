
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
  saveMultipleExtractedJobRoles, 
  getExtractedJobRoles, 
  deleteExtractedJobRole,
  saveJobScreeningResult,
  getAllJobScreeningResultsForUser
} from "@/services/firestoreService";
import { Users, ScanSearch, Briefcase, BrainCircuit, Trash2, RotateCw, Database, ServerOff } from "lucide-react";
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
  
  const [allScreeningResults, setAllScreeningResults] = useState<JobScreeningResult[]>([]);
  
  const [isLoadingJDsFromDB, setIsLoadingJDsFromDB] = useState<boolean>(true);
  const [isLoadingScreeningResultsFromDB, setIsLoadingScreeningResultsFromDB] = useState<boolean>(true);
  const [isLoadingJDExtraction, setIsLoadingJDExtraction] = useState<boolean>(false);
  const [isLoadingScreening, setIsLoadingScreening] = useState<boolean>(false);
  
  const [selectedCandidateForFeedback, setSelectedCandidateForFeedback] = useState<RankedCandidate | null>(null);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState<boolean>(false);
  const [filters, setFilters] = useState<Filters>(initialFilters);

  const { toast } = useToast();
  const resultsSectionRef = useRef<HTMLDivElement | null>(null);
  const processButtonRef = useRef<HTMLButtonElement | null>(null);

  const isFirestoreAvailable = !!firestoreDb;

  // Load initial data (job roles and screening results) for the user
  useEffect(() => {
    setAppIsLoading(false); // General page loader off once component mounts
    if (currentUser && isFirestoreAvailable) {
      setIsLoadingJDsFromDB(true);
      getExtractedJobRoles()
        .then(roles => {
          setExtractedJobRoles(roles);
          if (roles.length > 0 && !selectedJobRoleId) {
            setSelectedJobRoleId(roles[0].id);
          }
        })
        .catch(err => {
          let description = "Could not load job roles.";
          if (err.code === 'failed-precondition') {
            description = "Error loading job roles. This may be a temporary problem. Please try again later.";
            console.error(
              "Firestore Error (getExtractedJobRoles): The query requires an index. " +
              "Please create the required composite index in your Firebase Firestore console. " +
              "The original error message may contain a direct link to create it: ", err.message
            );
          } else {
            console.error("Error fetching job roles:", err);
            description = String(err.message || err).substring(0,100);
          }
          toast({ title: "Error Loading Job Roles", description, variant: "destructive" });
        })
        .finally(() => setIsLoadingJDsFromDB(false));

      setIsLoadingScreeningResultsFromDB(true);
      getAllJobScreeningResultsForUser()
        .then(results => setAllScreeningResults(results))
        .catch(err => {
          let description = "Could not load previous screening results.";
          if (err.code === 'failed-precondition') {
            description = "Error loading screening results. This may be a temporary problem. Please try again later.";
            console.error(
              "Firestore Error (getAllJobScreeningResultsForUser): The query requires an index. " +
              "Please create the required composite index in your Firebase Firestore console. " +
              "The original error message may contain a direct link to create it: ", err.message
            );
          } else {
            console.error("Error fetching screening results:", err);
            description = String(err.message || err).substring(0,100);
          }
          toast({ title: "Error Loading Screening Results", description, variant: "destructive" });
        })
        .finally(() => setIsLoadingScreeningResultsFromDB(false));
    } else if (!currentUser || !isFirestoreAvailable) {
      setIsLoadingJDsFromDB(false);
      setIsLoadingScreeningResultsFromDB(false);
      setExtractedJobRoles([]);
      setAllScreeningResults([]);
    }
  }, [currentUser, toast, selectedJobRoleId, setAppIsLoading, isFirestoreAvailable]);


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
    const shouldScroll = isLoadingJDExtraction || isLoadingScreening || (!isLoadingScreening && !isLoadingJDExtraction && allScreeningResults.length > 0 && selectedJobRoleId);
    if (shouldScroll && resultsSectionRef.current) {
      const timer = setTimeout(() => {
        resultsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100); 
      return () => clearTimeout(timer);
    }
  }, [isLoadingJDExtraction, isLoadingScreening, allScreeningResults, selectedJobRoleId]);

  const currentScreeningResult = useMemo(() => {
    if (!selectedJobRoleId || allScreeningResults.length === 0) {
      return null;
    }
    return allScreeningResults.find(result => result.jobDescriptionId === String(selectedJobRoleId)) || null;
  }, [selectedJobRoleId, allScreeningResults]);

  const handleJobDescriptionUploadAndExtraction = useCallback(async (initialJdUploads: JobDescriptionFile[]) => {
    if (!currentUser?.uid || !isFirestoreAvailable) {
      toast({ title: "Operation Unavailable", description: "Cannot process JDs. Please log in and ensure database is connected.", variant: "destructive" });
      return;
    }
    if (initialJdUploads.length === 0) return;
    
    setIsLoadingJDExtraction(true);
    try {
      const jdUploadsWithDataUriPromises = initialJdUploads.map(async (jdFile) => {
        if (!jdFile.file) {
            // This case should ideally not happen if the mapping from FileUploadArea is correct
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
      
      if (aiOutput.length > 0) {
        const rolesToSave = aiOutput.map(role => ({
            name: role.name,
            contentDataUri: role.contentDataUri,
            originalDocumentName: role.originalDocumentName,
        }));
        const savedRoles = await saveMultipleExtractedJobRoles(rolesToSave);
        
        setExtractedJobRoles(prevRoles => {
            const updatedRoles = [...prevRoles];
            savedRoles.forEach(newRole => {
                if (!updatedRoles.some(existing => existing.id === newRole.id)) {
                    updatedRoles.push(newRole);
                }
            });
            // Sort by creation time, newest first. Ensure createdAt is a valid Timestamp.
            updatedRoles.sort((a,b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
            return updatedRoles;
        });
        toast({ title: "Job Roles Extracted & Saved", description: `${savedRoles.length} role(s) processed and saved.` });
        if (!selectedJobRoleId && savedRoles.length > 0) {
            setSelectedJobRoleId(savedRoles[0].id);
        }
      } else {
         toast({ title: "No New Job Roles Extracted", description: "AI could not extract new job roles from the provided files.", variant: "default" });
      }
      setUploadedJobDescriptionFiles([]); // Clear the local state for JD uploads

    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("Job Role Extraction Full Error:", error);
      toast({ title: "Job Role Extraction Failed", description: message.substring(0,100), variant: "destructive" });
    } finally {
      setIsLoadingJDExtraction(false);
    }
  }, [currentUser?.uid, toast, selectedJobRoleId, isFirestoreAvailable]);

  const handleDeleteJobRole = async (roleIdToDelete: string) => {
    if (!currentUser?.uid || !isFirestoreAvailable) return;
    
    try {
      await deleteExtractedJobRole(roleIdToDelete);
      setExtractedJobRoles(prevRoles => prevRoles.filter(role => role.id !== roleIdToDelete));
      setAllScreeningResults(prevResults => prevResults.filter(r => r.jobDescriptionId !== roleIdToDelete));
      
      if (selectedJobRoleId === roleIdToDelete) {
        const newRoles = extractedJobRoles.filter(role => role.id !== roleIdToDelete);
        setSelectedJobRoleId(newRoles.length > 0 ? newRoles[0].id : null);
      }
      toast({ title: "Job Role Deleted", description: "The job role and its screening data have been deleted." });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast({ title: "Deletion Failed", description: message.substring(0,100), variant: "destructive" });
    }
  };

  const startOrRefreshBulkScreening = useCallback(async (targetJobRoleId?: string) => {
    if (!currentUser?.uid || !isFirestoreAvailable) {
        toast({ title: "Operation Unavailable", description: "Cannot screen candidates. Please log in and ensure database is connected.", variant: "destructive" });
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
      
      const savedScreeningResults: JobScreeningResult[] = [];
      for (const aiResult of outputFromAI) {
          const savedResult = await saveJobScreeningResult(aiResult);
          savedScreeningResults.push(savedResult);
      }
      
      setAllScreeningResults(prevResults => {
        const updatedResults = [...prevResults];
        savedScreeningResults.forEach(newResult => {
          const existingIndex = updatedResults.findIndex(r => r.id === newResult.id);
          if (existingIndex !== -1) {
            updatedResults[existingIndex] = newResult; // Replace
          } else {
            updatedResults.push(newResult); // Add
          }
        });
        updatedResults.sort((a,b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
        return updatedResults;
      });
      
      if (savedScreeningResults.length > 0) {
        toast({ title: "Screening Complete & Saved", description: `${savedScreeningResults.length} job role(s) processed and results saved.` });
        if (targetJobRoleId) setSelectedJobRoleId(targetJobRoleId);
        else if (savedScreeningResults.length > 0 && !selectedJobRoleId) setSelectedJobRoleId(savedScreeningResults[0].jobDescriptionId);
      } else {
        toast({ title: "Screening Processed", description: "No new screening results were generated/saved.", variant: "default"});
      }
      setUploadedResumeFiles([]); // Clear uploaded resumes after processing
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("Bulk Screening Full Error:", error);
      toast({ title: "Bulk Screening Failed", description: message.substring(0,100), variant: "destructive" });
    } finally {
      setIsLoadingScreening(false);
    }
  }, [currentUser?.uid, extractedJobRoles, uploadedResumeFiles, toast, selectedJobRoleId, isFirestoreAvailable]);

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
    if (isLoadingJDExtraction || isLoadingJDsFromDB) return "roles";
    if (isLoadingScreening || isLoadingScreeningResultsFromDB) return "screening";
    return "general";
  }
  
  const isProcessing = isLoadingJDExtraction || isLoadingJDsFromDB || isLoadingScreening || isLoadingScreeningResultsFromDB;

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-8">
       <Card className="mb-8 bg-gradient-to-r from-primary/5 via-background to-background border-primary/20 shadow-md">
        <CardHeader>
          <CardTitle className="text-2xl font-headline text-primary flex items-center">
           <BrainCircuit className="w-7 h-7 mr-3" /> AI-Powered Resume Ranker
          </CardTitle>
          <CardDescription>
            Upload job descriptions (JDs) to create roles, then upload resumes. Screen candidates to rank them against your selected job role. Data is saved to your account.
          </CardDescription>
        </CardHeader>
      </Card>

      {!isFirestoreAvailable && (
        <Card className="shadow-lg border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center"><ServerOff className="w-5 h-5 mr-2" /> Database Not Connected</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-destructive-foreground">The application could not connect to the database. Data saving and loading features are disabled. Please ensure Firebase is configured correctly.</p>
            <p className="text-sm text-muted-foreground mt-2">This might be due to missing Firebase configuration in your environment variables or a network issue.</p>
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
                    Job Descriptions
                  </CardTitle>
                  <CardDescription>
                    Upload JD files. Roles will be extracted, saved, and listed below.
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
                    Upload Resumes for Screening
                  </CardTitle>
                  <CardDescription>
                    Upload candidate resumes. These will be processed against the selected job role. These are not saved permanently after screening.
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
              disabled={isLoadingScreening || isLoadingJDExtraction || !selectedJobRoleId || uploadedResumeFiles.length === 0 || isLoadingJDsFromDB || isLoadingScreeningResultsFromDB}
              size="lg"
              className="bg-accent hover:bg-accent/90 text-accent-foreground text-base px-8 py-6 shadow-md hover:shadow-lg transition-all duration-150 hover:scale-105 active:scale-95"
            >
              {(isLoadingScreening) ? ( 
                <BrainCircuit className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <ScanSearch className="w-5 h-5 mr-2" />
              )}
              Screen Candidates for Selected Role
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
                  isLoadingRoles={isLoadingJDExtraction || isLoadingJDsFromDB || isLoadingScreening}
                  onDeleteJobRole={handleDeleteJobRole}
                  onRefreshScreeningForRole={startOrRefreshBulkScreening}
                />
              </>
            )}
            
            {!isLoadingScreening && !isLoadingScreeningResultsFromDB && currentScreeningResult && (
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

            {!isProcessing && currentUser && isFirestoreAvailable && (
              <>
                {extractedJobRoles.length === 0 && !isLoadingJDsFromDB && (
                  <p className="text-center text-muted-foreground py-8">Upload job descriptions to create roles. Your roles will be saved and shown here.</p>
                )}
                {extractedJobRoles.length > 0 && !selectedJobRoleId && (
                   <p className="text-center text-muted-foreground py-8">Select a job role from the filters above to view or process candidates.</p>
                )}
                {selectedJobRoleId && uploadedResumeFiles.length === 0 && !currentScreeningResult && (
                  <p className="text-center text-muted-foreground py-8">Upload resumes and click "Screen Candidates" to see rankings for the selected role.</p>
                )}
                 {selectedJobRoleId && uploadedResumeFiles.length > 0 && !allScreeningResults.find(r => r.jobDescriptionId === selectedJobRoleId) && !currentScreeningResult && (
                  <p className="text-center text-muted-foreground py-8">Click "Screen Candidates" to start screening for "{extractedJobRoles.find(r => r.id === selectedJobRoleId)?.name}".</p>
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

    