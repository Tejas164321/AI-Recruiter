
"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileUploadArea } from "@/components/file-upload-area";
import { CandidateTable } from "@/components/candidate-table";
import { FeedbackModal } from "@/components/feedback-modal";
import { FilterControls } from "@/components/filter-controls";
import { useToast } from "@/hooks/use-toast";
import { rankCandidates, type RankCandidatesInput, type RankCandidatesOutput } from "@/ai/flows/rank-candidates";
import type { ResumeFile, RankedCandidate, Filters, JobDescriptionFile, JobScreeningResult } from "@/lib/types";
import { Users, ScanSearch, Loader2, Briefcase } from "lucide-react";
import { Separator } from "@/components/ui/separator";

const initialFilters: Filters = {
  scoreRange: [0, 100],
  skillKeyword: "",
  selectedJobDescriptionName: null,
};

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export default function HomePage() {
  const [jobDescriptionFiles, setJobDescriptionFiles] = useState<JobDescriptionFile[]>([]);
  const [resumeFiles, setResumeFiles] = useState<ResumeFile[]>([]);
  const [screeningResults, setScreeningResults] = useState<JobScreeningResult[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedCandidateForFeedback, setSelectedCandidateForFeedback] = useState<RankedCandidate | null>(null);
  const [jobDescriptionDataUriForFeedback, setJobDescriptionDataUriForFeedback] = useState<string | null>(null);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState<boolean>(false);
  const [filters, setFilters] = useState<Filters>(initialFilters);

  const { toast } = useToast();

  const loadingSectionRef = useRef<HTMLDivElement | null>(null);
  const resultsSectionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => {
        loadingSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  useEffect(() => {
    if (!isLoading && screeningResults.length > 0) {
      const timer = setTimeout(() => {
        resultsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [screeningResults, isLoading]);

  const handleJobDescriptionUpload = useCallback(async (files: File[]) => { // `files` is the complete current list from FileUploadArea
    try {
      const processedJobDescriptionFilesPromises = files.map(async (file) => {
        const dataUri = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = (error) => reject(error);
          reader.readAsDataURL(file);
        });
        return { id: crypto.randomUUID(), file, dataUri, name: file.name };
      });
      const processedJobDescriptionFiles = await Promise.all(processedJobDescriptionFilesPromises);
      setJobDescriptionFiles(processedJobDescriptionFiles); // Set the new list directly
    } catch (error) {
      console.error("Error processing job description files:", error);
      toast({
        title: "File Upload Error",
        description: `Could not process one or more job description files. ${error instanceof Error ? error.message : "Please check the file type and try again."}`,
        variant: "destructive",
      });
    }
  }, [toast]);

  const handleResumesUpload = useCallback(async (files: File[]) => { // `files` is the complete current list from FileUploadArea
    try {
      const processedResumeFilesPromises = files.map(async (file) => {
        const dataUri = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = (error) => reject(error);
          reader.readAsDataURL(file);
        });
        return { id: crypto.randomUUID(), file, dataUri, name: file.name };
      });
      const processedResumeFiles = await Promise.all(processedResumeFilesPromises);
      setResumeFiles(processedResumeFiles); // Set the new list directly
    } catch (error) {
      console.error("Error processing resume files:", error);
      toast({
        title: "File Upload Error",
        description: `Could not process one or more resume files. ${error instanceof Error ? error.message : "Please check the file type and try again."}`,
        variant: "destructive",
      });
    }
  }, [toast]);

  const handleScreenResumes = async () => {
    if (jobDescriptionFiles.length === 0) {
      toast({ title: "Error", description: "At least one job description file is required.", variant: "destructive" });
      return;
    }
    if (resumeFiles.length === 0) {
      toast({ title: "Error", description: "Please upload at least one resume.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    setScreeningResults([]); 

    try {
      const input: RankCandidatesInput = {
        jobDescriptions: jobDescriptionFiles.map(jd => ({ name: jd.name, dataUri: jd.dataUri })),
        resumes: resumeFiles.map(rf => ({ name: rf.name, dataUri: rf.dataUri })),
      };
      
      const output: RankCandidatesOutput = await rankCandidates(input);
      
      setScreeningResults(output); 
      toast({ title: "Success", description: "Resumes screened and ranked successfully." });
    } catch (error) {
      console.error("Error screening resumes:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      toast({ title: "Screening Failed", description: `An error occurred while screening resumes: ${errorMessage}. Please try again.`, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewFeedback = (candidate: RankedCandidate, jdDataUri: string) => {
    setSelectedCandidateForFeedback(candidate);
    setJobDescriptionDataUriForFeedback(jdDataUri);
    setIsFeedbackModalOpen(true);
  };

  const handleFilterChange = (newFilters: Partial<Filters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };
  
  const resetFilters = () => {
    setFilters(initialFilters);
  };

  const filterCandidatesForJob = useCallback((candidates: RankedCandidate[], currentFilters: Filters): RankedCandidate[] => {
    return candidates.filter(candidate => {
      const scoreMatch = candidate.score >= currentFilters.scoreRange[0] && candidate.score <= currentFilters.scoreRange[1];
      const keywordMatch = currentFilters.skillKeyword.trim() === "" || 
                           candidate.keySkills.toLowerCase().includes(currentFilters.skillKeyword.toLowerCase()) ||
                           candidate.name.toLowerCase().includes(currentFilters.skillKeyword.toLowerCase());
      return scoreMatch && keywordMatch;
    });
  }, []);

  const displayedScreeningResults = React.useMemo(() => {
    if (!filters.selectedJobDescriptionName) {
      return screeningResults;
    }
    return screeningResults.filter(
      (result) => result.jobDescriptionName === filters.selectedJobDescriptionName
    );
  }, [screeningResults, filters.selectedJobDescriptionName]);


  return (
    <div className="container mx-auto p-4 md:p-8 space-y-8">
      <div className="flex flex-col md:flex-row gap-8">
        <div className="flex-1">
          <Card className="shadow-lg transition-shadow duration-300 hover:shadow-xl h-full">
            <CardHeader>
              <CardTitle className="flex items-center text-2xl font-headline">
                <Briefcase className="w-7 h-7 mr-3 text-primary" />
                Job Descriptions
              </CardTitle>
              <CardDescription>
                Upload job description files (PDF, TXT, MD, CSV, XLS, XLSX). Max 5MB each.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FileUploadArea
                onFilesUpload={handleJobDescriptionUpload}
                acceptedFileTypes={{ 
                  "application/pdf": [".pdf"],
                  "text/plain": [".txt"],
                  "text/markdown": [".md"],
                  "text/csv": [".csv"],
                  "application/vnd.ms-excel": [".xls"],
                  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
                }}
                multiple={true}
                label="PDF, TXT, MD, CSV, XLS, XLSX files up to 5MB each"
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
                Upload candidate resumes in PDF format. Max 5MB each.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FileUploadArea
                onFilesUpload={handleResumesUpload}
                acceptedFileTypes={{ "application/pdf": [".pdf"] }}
                multiple
                label="PDF files up to 5MB each"
                id="resume-upload"
                maxSizeInBytes={MAX_FILE_SIZE_BYTES}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex justify-center pt-4">
        <Button
          onClick={handleScreenResumes}
          disabled={isLoading || jobDescriptionFiles.length === 0 || resumeFiles.length === 0}
          size="lg"
          className="bg-accent hover:bg-accent/90 text-accent-foreground text-base px-8 py-6 shadow-md hover:shadow-lg transition-all duration-150 hover:scale-105 active:scale-95"
          aria-live="polite"
          aria-busy={isLoading}
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          ) : (
            <ScanSearch className="w-5 h-5 mr-2" />
          )}
          Screen & Rank Resumes
        </Button>
      </div>
      
      {isLoading && (
        <div ref={loadingSectionRef}>
          <Card className="shadow-lg transition-shadow duration-300 hover:shadow-xl">
            <CardContent className="pt-6">
              <div className="text-center py-8 space-y-6">
                <Loader2 className="w-16 h-16 mx-auto text-primary animate-spin" />
                <p className="text-xl font-semibold text-primary">
                  AI is analyzing your files...
                </p>
                <p className="text-sm text-muted-foreground">
                  This may take a few moments, especially with many or large files. Please be patient.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {!isLoading && (screeningResults.length > 0 || jobDescriptionFiles.length > 0) && (
        <div ref={resultsSectionRef}>
          <Separator className="my-8" />
          <FilterControls 
            filters={filters} 
            onFilterChange={handleFilterChange} 
            onResetFilters={resetFilters}
            availableJobDescriptions={jobDescriptionFiles.map(jd => jd.name)} 
          />
           {screeningResults.length > 0 && <Separator className="my-8" />}
        </div>
      )}

      {!isLoading && displayedScreeningResults.length > 0 && (
          <>
            {displayedScreeningResults.map((result, index) => (
              <Card key={result.jobDescriptionName + index} className="shadow-lg transition-shadow duration-300 hover:shadow-xl mb-8">
                <CardHeader>
                  <CardTitle className="text-2xl font-headline text-primary flex items-center">
                    <Briefcase className="w-6 h-6 mr-2" />
                    Results for: {result.jobDescriptionName}
                  </CardTitle>
                  <CardDescription>
                    Candidates ranked based on the job description "{result.jobDescriptionName}".
                    {filters.selectedJobDescriptionName && filters.selectedJobDescriptionName !== result.jobDescriptionName && 
                      ` Currently filtered to: ${filters.selectedJobDescriptionName}.`}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <CandidateTable 
                    candidates={filterCandidatesForJob(result.candidates, filters)} 
                    onViewFeedback={(candidate) => handleViewFeedback(candidate, result.jobDescriptionDataUri)} 
                  />
                  {filterCandidatesForJob(result.candidates, filters).length === 0 && (
                      <p className="text-center text-muted-foreground py-4">No candidates match the current filter criteria for this job description.</p>
                    )}
                </CardContent>
              </Card>
            ))}
          </>
        )}

       {!isLoading && screeningResults.length === 0 && resumeFiles.length > 0 && jobDescriptionFiles.length > 0 && (
         <p className="text-center text-muted-foreground py-8">Click "Screen & Rank Resumes" to see results.</p>
       )}

       {!isLoading && displayedScreeningResults.length === 0 && screeningResults.length > 0 && filters.selectedJobDescriptionName && (
         <p className="text-center text-muted-foreground py-8">No results found for the selected job description: "{filters.selectedJobDescriptionName}". Try selecting "All Job Descriptions".</p>
       )}


      <FeedbackModal
        isOpen={isFeedbackModalOpen}
        onClose={() => setIsFeedbackModalOpen(false)}
        candidate={selectedCandidateForFeedback}
        jobDescriptionDataUri={jobDescriptionDataUriForFeedback} 
      />
    </div>
  );
}

