
"use client";

import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileUploadArea } from "@/components/file-upload-area";
import { CandidateTable } from "@/components/candidate-table";
import { FeedbackModal } from "@/components/feedback-modal";
import { FilterControls } from "@/components/filter-controls";
import { useToast } from "@/hooks/use-toast";
import { performBulkScreening, type PerformBulkScreeningOutput, type PerformBulkScreeningInput } from "@/ai/flows/rank-candidates"; // Updated import
import { extractJobRoles, type ExtractJobRolesInput, type ExtractJobRolesOutput } from "@/ai/flows/extract-job-roles";
import type { ResumeFile, RankedCandidate, Filters, JobDescriptionFile, JobScreeningResult, ExtractedJobRole } from "@/lib/types";
import { Users, ScanSearch, Loader2, Briefcase } from "lucide-react";
import { Separator } from "@/components/ui/separator";

const initialFilters: Filters = {
  scoreRange: [0, 100],
  skillKeyword: "",
};

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export default function HomePage() {
  const [uploadedJobDescriptionFiles, setUploadedJobDescriptionFiles] = useState<JobDescriptionFile[]>([]);
  const [uploadedResumeFiles, setUploadedResumeFiles] = useState<ResumeFile[]>([]);
  
  const [extractedJobRoles, setExtractedJobRoles] = useState<ExtractedJobRole[]>([]);
  const [selectedJobRoleId, setSelectedJobRoleId] = useState<string | null>(null);
  
  // Stores results for ALL job roles after bulk screening
  const [allScreeningResults, setAllScreeningResults] = useState<JobScreeningResult[]>([]); 
  
  const [isLoadingRoles, setIsLoadingRoles] = useState<boolean>(false);
  // New loading state for the entire bulk screening process
  const [isLoadingAllScreenings, setIsLoadingAllScreenings] = useState<boolean>(false); 
  
  const [selectedCandidateForFeedback, setSelectedCandidateForFeedback] = useState<RankedCandidate | null>(null);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState<boolean>(false);
  const [filters, setFilters] = useState<Filters>(initialFilters);

  const { toast } = useToast();
  const resultsSectionRef = useRef<HTMLDivElement | null>(null);

  // Derived state for the currently viewed job role's results
  const currentScreeningResult = useMemo(() => {
    if (!selectedJobRoleId || allScreeningResults.length === 0) {
      return null;
    }
    return allScreeningResults.find(result => result.jobDescriptionId === selectedJobRoleId) || null;
  }, [selectedJobRoleId, allScreeningResults]);


  const scrollToResults = useCallback(() => {
    // Scroll when bulk screening is done and there are results
    if (!isLoadingAllScreenings && !isLoadingRoles && allScreeningResults.length > 0) {
      const timer = setTimeout(() => {
        resultsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isLoadingAllScreenings, isLoadingRoles, allScreeningResults]);

  useEffect(scrollToResults, [scrollToResults]);

  // Main function to trigger bulk screening for all roles and resumes
  const startBulkScreeningProcess = useCallback(async () => {
    if (extractedJobRoles.length === 0 || uploadedResumeFiles.length === 0) {
      if(extractedJobRoles.length === 0) toast({ title: "No Job Roles", description: "Please upload job descriptions first.", variant: "destructive" });
      if(uploadedResumeFiles.length === 0) toast({ title: "No Resumes", description: "Please upload resumes first.", variant: "destructive" });
      setAllScreeningResults([]); // Clear any old results
      return;
    }

    setIsLoadingAllScreenings(true);
    setAllScreeningResults([]); // Clear previous results before starting

    try {
      const input: PerformBulkScreeningInput = {
        jobRolesToScreen: extractedJobRoles,
        resumesToRank: uploadedResumeFiles.map(rf => ({ name: rf.name, dataUri: rf.dataUri })),
      };
      
      const output: PerformBulkScreeningOutput = await performBulkScreening(input);
      setAllScreeningResults(output);
      
      if (output.length > 0) {
        toast({ title: "Screening Complete", description: `All candidates processed for ${output.length} job role(s).` });
        // selectedJobRoleId should already be set to the first role, or user can pick
      } else {
        toast({ title: "Screening Complete", description: "No screening results were generated.", variant: "default"});
      }
    } catch (error) {
      console.error("Error during bulk screening:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred during bulk screening.";
      toast({ title: "Bulk Screening Failed", description: errorMessage, variant: "destructive" });
      setAllScreeningResults([]);
    } finally {
      setIsLoadingAllScreenings(false);
    }
  }, [extractedJobRoles, uploadedResumeFiles, toast]);


  const fetchExtractedJobRoles = useCallback(async (jdFiles: JobDescriptionFile[]) => {
    if (jdFiles.length === 0) {
      setExtractedJobRoles([]);
      setSelectedJobRoleId(null);
      setAllScreeningResults([]); // Clear all results if JDs are removed
      return;
    }
    
    setIsLoadingRoles(true);
    setAllScreeningResults([]); 
    setSelectedJobRoleId(null); 

    try {
      const input: ExtractJobRolesInput = {
        jobDescriptionDocuments: jdFiles.map(jd => ({ name: jd.name, dataUri: jd.dataUri })),
      };
      const output: ExtractJobRolesOutput = await extractJobRoles(input);
      setExtractedJobRoles(output);

      if (output.length > 0) {
        const firstRoleId = output[0].id;
        setSelectedJobRoleId(firstRoleId); 
        // If resumes are already present, trigger bulk screening
        if (uploadedResumeFiles.length > 0) {
          await startBulkScreeningProcess();
        }
      } else {
        toast({ title: "No Job Roles Found", description: "Could not extract specific job roles. Ensure they are valid job descriptions.", variant: "default" });
      }
    } catch (error) {
      console.error("Error extracting job roles:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred during role extraction.";
      toast({ title: "Job Role Extraction Failed", description: errorMessage, variant: "destructive" });
      setExtractedJobRoles([]); 
    } finally {
      setIsLoadingRoles(false);
    }
  }, [toast, uploadedResumeFiles, startBulkScreeningProcess]); // Added startBulkScreeningProcess dependency

  const handleJobDescriptionUpload = useCallback(async (files: File[]) => {
    const newJdFilesPromises = files.map(async (file) => {
      const dataUri = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
      });
      return { id: crypto.randomUUID(), file, dataUri, name: file.name };
    });
    try {
        const newJdFiles = await Promise.all(newJdFilesPromises);
        setUploadedJobDescriptionFiles(newJdFiles); 
        await fetchExtractedJobRoles(newJdFiles); 
    } catch (error) {
        toast({ title: "Error processing JDs", description: String(error), variant: "destructive"});
    }
  }, [fetchExtractedJobRoles, toast]);

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
        // If job roles are already extracted, trigger bulk screening
        if (extractedJobRoles.length > 0) {
            await startBulkScreeningProcess();
        }
    } catch (error) {
         toast({ title: "Error processing resumes", description: String(error), variant: "destructive"});
    }
  }, [extractedJobRoles, startBulkScreeningProcess, toast]); // Added startBulkScreeningProcess dependency


  const handleJobRoleChange = useCallback(async (roleId: string | null) => {
    setSelectedJobRoleId(roleId);
    // No backend call here, currentScreeningResult will update via useMemo
  }, []);

  const handleScreenAllButtonClick = async () => {
    // This button now explicitly triggers the bulk screening
    await startBulkScreeningProcess();
  };

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
                           candidate.name.toLowerCase().includes(currentFilters.skillKeyword.toLowerCase());
      return scoreMatch && keywordMatch;
    });
  }, []);
  
  const displayedCandidates = useMemo(() => {
    return filterCandidates(currentScreeningResult?.candidates, filters);
  }, [currentScreeningResult, filters, filterCandidates]);


  return (
    <div className="container mx-auto p-4 md:p-8 space-y-8">
      {/* File Upload Section */}
      <div className="flex flex-col md:flex-row gap-8">
        <div className="flex-1">
          <Card className="shadow-lg transition-shadow duration-300 hover:shadow-xl h-full">
            <CardHeader>
              <CardTitle className="flex items-center text-2xl font-headline">
                <Briefcase className="w-7 h-7 mr-3 text-primary" />
                Job Descriptions
              </CardTitle>
              <CardDescription>
                Upload job description files (PDF, TXT, MD, etc.). Max 5MB each. Roles will be extracted.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FileUploadArea
                onFilesUpload={handleJobDescriptionUpload}
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
                Upload candidate resumes (PDF, DOC, DOCX, TXT). Max 5MB each.
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
          onClick={handleScreenAllButtonClick}
          disabled={isLoadingAllScreenings || isLoadingRoles || extractedJobRoles.length === 0 || uploadedResumeFiles.length === 0}
          size="lg"
          className="bg-accent hover:bg-accent/90 text-accent-foreground text-base px-8 py-6 shadow-md hover:shadow-lg transition-all duration-150 hover:scale-105 active:scale-95"
        >
          {isLoadingAllScreenings ? ( 
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          ) : (
            <ScanSearch className="w-5 h-5 mr-2" />
          )}
          Process All Candidates 
        </Button>
      </div>
      
      <div ref={resultsSectionRef} className="space-y-8">
        {(isLoadingRoles || isLoadingAllScreenings) && (
           <Card className="shadow-lg">
               <CardContent className="pt-6">
               <div className="text-center py-8 space-y-6">
                   <Loader2 className="w-16 h-16 mx-auto text-primary animate-spin" />
                   <p className="text-xl font-semibold text-primary">
                   {isLoadingRoles ? "Extracting job roles..." : (isLoadingAllScreenings ? "AI is analyzing all resumes and roles..." : "Processing...")}
                   </p>
                   <p className="text-sm text-muted-foreground">
                   This may take a few moments. Please be patient.
                   </p>
               </div>
               </CardContent>
           </Card>
        )}

        {!isLoadingRoles && uploadedJobDescriptionFiles.length > 0 && (
          <>
            <Separator className="my-8" />
            <FilterControls 
              filters={filters} 
              onFilterChange={handleFilterChange} 
              onResetFilters={resetFilters}
              extractedJobRoles={extractedJobRoles}
              selectedJobRoleId={selectedJobRoleId}
              onJobRoleChange={handleJobRoleChange}
              isLoadingRoles={isLoadingRoles || isLoadingAllScreenings} // Disable filters during bulk load too
            />
          </>
        )}
        
        {/* Display results if not loading AND there is a currentScreeningResult (derived from allScreeningResults) */}
        {!isLoadingAllScreenings && !isLoadingRoles && currentScreeningResult && (
            <>
              {uploadedJobDescriptionFiles.length > 0 && <Separator className="my-8" />}
              <Card className="shadow-lg transition-shadow duration-300 hover:shadow-xl mb-8">
                <CardHeader>
                  <CardTitle className="text-2xl font-headline text-primary flex items-center">
                    <Briefcase className="w-6 h-6 mr-2" />
                    Results for: {currentScreeningResult.jobDescriptionName}
                  </CardTitle>
                  <CardDescription>
                    Candidates ranked for the job role "{currentScreeningResult.jobDescriptionName}".
                    Total candidates processed for this role: {currentScreeningResult.candidates.length}.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <CandidateTable 
                    candidates={displayedCandidates} 
                    onViewFeedback={handleViewFeedback} 
                  />
                  {currentScreeningResult.candidates && currentScreeningResult.candidates.length > 0 && displayedCandidates.length === 0 && (
                      <p className="text-center text-muted-foreground py-4">No candidates match the current filter criteria for this job role.</p>
                  )}
                  {/* CandidateTable handles empty currentScreeningResult.candidates internally */}
                </CardContent>
              </Card>
            </>
        )}

        {/* Informational messages when not loading and no specific result is being shown */}
        {!isLoadingAllScreenings && !isLoadingRoles && !currentScreeningResult && (
          <>
            {uploadedJobDescriptionFiles.length > 0 && extractedJobRoles.length === 0 && !isLoadingRoles && (
              <p className="text-center text-muted-foreground py-8">No specific job roles could be extracted. Check your JD files or try re-uploading.</p>
            )}
            {extractedJobRoles.length > 0 && uploadedResumeFiles.length === 0 && (
              <p className="text-center text-muted-foreground py-8">Upload resumes and click "Process All Candidates" to see rankings.</p>
            )}
             {extractedJobRoles.length > 0 && uploadedResumeFiles.length > 0 && allScreeningResults.length === 0 && (
              <p className="text-center text-muted-foreground py-8">Click "Process All Candidates" to start screening.</p>
            )}
             {extractedJobRoles.length > 0 && allScreeningResults.length > 0 && !selectedJobRoleId && (
              <p className="text-center text-muted-foreground py-8">Select a job role from the filters to view results.</p>
            )}
            {uploadedJobDescriptionFiles.length === 0 && (
               <p className="text-center text-muted-foreground py-8">Upload job descriptions and resumes, then click "Process All Candidates".</p>
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
    </div>
  );
}
