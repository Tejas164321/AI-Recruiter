
"use client";

import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileUploadArea } from "@/components/file-upload-area";
import { CandidateTable } from "@/components/candidate-table";
import { FeedbackModal } from "@/components/feedback-modal";
import { FilterControls } from "@/components/filter-controls";
import { useToast } from "@/hooks/use-toast";
import { rankCandidates, type RankCandidatesOutput } from "@/ai/flows/rank-candidates";
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
  
  const [extractedJobRoles, setExtractedJobRoles]   = useState<ExtractedJobRole[]>([]);
  const [selectedJobRoleId, setSelectedJobRoleId] = useState<string | null>(null);
  
  const [currentScreeningResult, setCurrentScreeningResult] = useState<JobScreeningResult | null>(null);
  
  const [isLoadingRoles, setIsLoadingRoles] = useState<boolean>(false);
  const [isLoadingCandidates, setIsLoadingCandidates] = useState<boolean>(false);
  
  const [selectedCandidateForFeedback, setSelectedCandidateForFeedback] = useState<RankedCandidate | null>(null);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState<boolean>(false);
  const [filters, setFilters] = useState<Filters>(initialFilters);

  const { toast } = useToast();
  const resultsSectionRef = useRef<HTMLDivElement | null>(null);

  const scrollToResults = useCallback(() => {
    if (!isLoadingCandidates && currentScreeningResult) {
      const timer = setTimeout(() => {
        resultsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isLoadingCandidates, currentScreeningResult]);

  useEffect(scrollToResults, [scrollToResults]);


  const triggerCandidateRanking = useCallback(async (roleIdToRank?: string | null) => {
    const targetRoleId = roleIdToRank ?? selectedJobRoleId;

    if (!targetRoleId || uploadedResumeFiles.length === 0) {
      if (uploadedResumeFiles.length === 0 && targetRoleId) {
        setCurrentScreeningResult(null);
      }
      return;
    }

    const roleToRank = extractedJobRoles.find(role => role.id === targetRoleId);
    if (!roleToRank) {
      toast({ title: "Error", description: "Selected job role not found for ranking.", variant: "destructive" });
      setCurrentScreeningResult(null); 
      return;
    }

    setIsLoadingCandidates(true);
    setCurrentScreeningResult(null); 

    try {
      const input = { // RankCandidatesInput type is inferred
        targetJobDescription: { name: roleToRank.name, dataUri: roleToRank.contentDataUri },
        resumes: uploadedResumeFiles.map(rf => ({ name: rf.name, dataUri: rf.dataUri })),
      };
      
      const output: RankCandidatesOutput = await rankCandidates(input);
      if (output) {
        setCurrentScreeningResult(output);
        toast({ title: "Success", description: `Resumes ranked for "${output.jobDescriptionName}".` });
      } else {
        // This case should ideally not be hit if rankCandidates flow always returns valid output or throws
        throw new Error("Ranking process returned no output.");
      }
    } catch (error) {
      console.error("Error screening resumes:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred during ranking.";
      toast({ title: "Ranking Failed", description: `Error ranking for "${roleToRank.name}": ${errorMessage}.`, variant: "destructive" });
      setCurrentScreeningResult(null);
    } finally {
      setIsLoadingCandidates(false);
    }
  }, [selectedJobRoleId, uploadedResumeFiles, extractedJobRoles, toast]);


  const fetchExtractedJobRoles = useCallback(async (jdFiles: JobDescriptionFile[]) => {
    if (jdFiles.length === 0) {
      setExtractedJobRoles([]);
      setSelectedJobRoleId(null);
      setCurrentScreeningResult(null); 
      return;
    }
    setIsLoadingRoles(true);
    setCurrentScreeningResult(null); 

    try {
      const input: ExtractJobRolesInput = {
        jobDescriptionDocuments: jdFiles.map(jd => ({ name: jd.name, dataUri: jd.dataUri })),
      };
      const output: ExtractJobRolesOutput = await extractJobRoles(input);
      setExtractedJobRoles(output);

      if (output.length > 0) {
        const firstRoleId = output[0].id;
        setSelectedJobRoleId(firstRoleId);
        if (uploadedResumeFiles.length > 0) {
          await triggerCandidateRanking(firstRoleId); // Ensure ranking is awaited here
        } else {
          setCurrentScreeningResult(null);
        }
      } else {
        setSelectedJobRoleId(null);
        toast({ title: "No Job Roles Found", description: "Could not extract specific job roles from the uploaded documents. Ensure they are valid job descriptions.", variant: "default" });
      }
    } catch (error) {
      console.error("Error extracting job roles:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred during role extraction.";
      toast({ title: "Job Role Extraction Failed", description: errorMessage, variant: "destructive" });
      setExtractedJobRoles([]);
      setSelectedJobRoleId(null);
    } finally {
      setIsLoadingRoles(false);
    }
  }, [toast, uploadedResumeFiles, triggerCandidateRanking]);

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
        setUploadedJobDescriptionFiles(newJdFiles); // Directly set the new list
        await fetchExtractedJobRoles(newJdFiles); // Ensure this is awaited
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
        setUploadedResumeFiles(newResumeFiles); // Directly set the new list
        if (selectedJobRoleId) {
            await triggerCandidateRanking(selectedJobRoleId); // Ensure this is awaited
        }
    } catch (error) {
         toast({ title: "Error processing resumes", description: String(error), variant: "destructive"});
    }
  }, [selectedJobRoleId, triggerCandidateRanking, toast]);


  const handleJobRoleChange = useCallback(async (roleId: string | null) => {
    setSelectedJobRoleId(roleId);
    if (roleId) {
      await triggerCandidateRanking(roleId); // Ensure ranking is awaited
    } else {
      setCurrentScreeningResult(null); 
    }
  }, [triggerCandidateRanking]);

  const handleScreenResumesButtonClick = async () => {
    if (selectedJobRoleId) {
      await triggerCandidateRanking(selectedJobRoleId); // Ensure ranking is awaited
    } else {
      toast({ title: "No Job Role Selected", description: "Please select a job role to rank candidates against.", variant: "destructive" });
    }
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
      
      {/* Rank Button Section */}
      <div className="flex justify-center pt-4">
        <Button
          onClick={handleScreenResumesButtonClick}
          disabled={isLoadingCandidates || isLoadingRoles || !selectedJobRoleId || uploadedResumeFiles.length === 0}
          size="lg"
          className="bg-accent hover:bg-accent/90 text-accent-foreground text-base px-8 py-6 shadow-md hover:shadow-lg transition-all duration-150 hover:scale-105 active:scale-95"
        >
          {(isLoadingCandidates) ? (
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          ) : (
            <ScanSearch className="w-5 h-5 mr-2" />
          )}
          Rank for Selected Job Role
        </Button>
      </div>
      
      {/* Filters, Loading, and Results Section Wrapper */}
      <div ref={resultsSectionRef} className="space-y-8">
        {(isLoadingRoles || isLoadingCandidates) && (
           <Card className="shadow-lg">
               <CardContent className="pt-6">
               <div className="text-center py-8 space-y-6">
                   <Loader2 className="w-16 h-16 mx-auto text-primary animate-spin" />
                   <p className="text-xl font-semibold text-primary">
                   {isLoadingRoles ? "Extracting job roles..." : "AI is analyzing resumes..."}
                   </p>
                   <p className="text-sm text-muted-foreground">
                   This may take a few moments. Please be patient.
                   </p>
               </div>
               </CardContent>
           </Card>
        )}

        {/* Filters are shown if not loading roles and JDs are uploaded */}
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
              isLoadingRoles={isLoadingRoles} // Pass this to disable filters while roles load
            />
          </>
        )}

        {/* Results Table Section: Show if not loading candidates, not loading roles, AND currentScreeningResult is populated */}
        {!isLoadingCandidates && !isLoadingRoles && currentScreeningResult && (
            <>
              <Separator className="my-8" /> {/* This separator might appear twice if filters are also shown, consider placement */}
              <Card className="shadow-lg transition-shadow duration-300 hover:shadow-xl mb-8">
                <CardHeader>
                  <CardTitle className="text-2xl font-headline text-primary flex items-center">
                    <Briefcase className="w-6 h-6 mr-2" />
                    Results for: {currentScreeningResult.jobDescriptionName}
                  </CardTitle>
                  <CardDescription>
                    Candidates ranked for the job role "{currentScreeningResult.jobDescriptionName}".
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <CandidateTable 
                    candidates={displayedCandidates} 
                    onViewFeedback={handleViewFeedback} 
                  />
                  {displayedCandidates.length === 0 && currentScreeningResult.candidates && currentScreeningResult.candidates.length > 0 && (
                      <p className="text-center text-muted-foreground py-4">No candidates match the current filter criteria for this job role.</p>
                  )}
                   {(!currentScreeningResult.candidates || currentScreeningResult.candidates.length === 0) && (
                      <p className="text-center text-muted-foreground py-4">No candidates were found or processed for this job role. Try uploading resumes.</p>
                  )}
                </CardContent>
              </Card>
            </>
          )}

        {/* Informational messages for various states when no results/table is shown */}
        {!isLoadingCandidates && !isLoadingRoles && !currentScreeningResult && uploadedJobDescriptionFiles.length > 0 && uploadedResumeFiles.length > 0 && selectedJobRoleId && (
          <p className="text-center text-muted-foreground py-8">Click "Rank for Selected Job Role" or change the job role to see results.</p>
        )}
        {!isLoadingCandidates && !isLoadingRoles && !currentScreeningResult && extractedJobRoles.length > 0 && uploadedResumeFiles.length === 0 && (
            <p className="text-center text-muted-foreground py-8">Upload resumes to see candidates ranked for the selected job role.</p>
        )}
        {!isLoadingCandidates && !isLoadingRoles && extractedJobRoles.length === 0 && uploadedJobDescriptionFiles.length > 0 && (
             <p className="text-center text-muted-foreground py-8">No specific job roles could be extracted. Check your JD files or try re-uploading.</p>
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
