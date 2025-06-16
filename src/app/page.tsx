
"use client";

import React, { useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileUploadArea } from "@/components/file-upload-area";
import { CandidateTable } from "@/components/candidate-table";
import { FeedbackModal } from "@/components/feedback-modal";
import { FilterControls } from "@/components/filter-controls";
import { useToast } from "@/hooks/use-toast";
import { rankCandidates, type RankCandidatesInput, type RankCandidatesOutput } from "@/ai/flows/rank-candidates";
import type { ResumeFile, RankedCandidate, Filters } from "@/lib/types";
import { FileText, Users, ScanSearch, Loader2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";

const initialFilters: Filters = {
  scoreRange: [0, 100],
  skillKeyword: "",
};

export default function HomePage() {
  const [jobDescriptionDataUri, setJobDescriptionDataUri] = useState<string | null>(null);
  const [resumeFiles, setResumeFiles] = useState<ResumeFile[]>([]);
  const [rankedCandidates, setRankedCandidates] = useState<RankedCandidate[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedCandidateForFeedback, setSelectedCandidateForFeedback] = useState<RankedCandidate | null>(null);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState<boolean>(false);
  const [filters, setFilters] = useState<Filters>(initialFilters);

  const { toast } = useToast();

  const handleJobDescriptionUpload = useCallback(async (files: File[]) => {
    if (files.length === 0) {
      setJobDescriptionDataUri(null);
      return;
    }
    const file = files[0];
    const dataUri = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
    setJobDescriptionDataUri(dataUri);
  }, []);

  const handleResumesUpload = useCallback(async (files: File[]) => {
    const newResumeFilesPromises = files.map(async (file) => {
      const dataUri = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
      });
      return { id: crypto.randomUUID(), file, dataUri };
    });
    const newResumeFiles = await Promise.all(newResumeFilesPromises);
    setResumeFiles(newResumeFiles);
  }, []);

  const handleScreenResumes = async () => {
    if (!jobDescriptionDataUri) {
      toast({ title: "Error", description: "Job description file cannot be empty.", variant: "destructive" });
      return;
    }
    if (resumeFiles.length === 0) {
      toast({ title: "Error", description: "Please upload at least one resume.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    setRankedCandidates([]); 

    try {
      const input: RankCandidatesInput = {
        jobDescriptionDataUri,
        resumes: resumeFiles.map((rf) => rf.dataUri),
      };
      const output: RankCandidatesOutput = await rankCandidates(input);
      
      const newRankedCandidates = output.map((rc, index) => ({
        ...rc,
        id: crypto.randomUUID(),
        originalResumeName: resumeFiles[index]?.file.name || 'N/A',
        resumeDataUri: resumeFiles[index]?.dataUri || '',
      }));

      setRankedCandidates(newRankedCandidates);
      toast({ title: "Success", description: "Resumes screened and ranked successfully." });
    } catch (error) {
      console.error("Error screening resumes:", error);
      toast({ title: "Screening Failed", description: "An error occurred while screening resumes. Please try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewFeedback = (candidate: RankedCandidate) => {
    setSelectedCandidateForFeedback(candidate);
    setIsFeedbackModalOpen(true);
  };

  const handleFilterChange = (newFilters: Partial<Filters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };
  
  const resetFilters = () => {
    setFilters(initialFilters);
  };

  const filteredCandidates = useMemo(() => {
    return rankedCandidates.filter(candidate => {
      const scoreMatch = candidate.score >= filters.scoreRange[0] && candidate.score <= filters.scoreRange[1];
      const keywordMatch = filters.skillKeyword.trim() === "" || 
                           candidate.keySkills.toLowerCase().includes(filters.skillKeyword.toLowerCase()) ||
                           candidate.name.toLowerCase().includes(filters.skillKeyword.toLowerCase());
      return scoreMatch && keywordMatch;
    });
  }, [rankedCandidates, filters]);

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-8">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-2xl font-headline">
            <FileText className="w-7 h-7 mr-3 text-primary" />
            Job Description
          </CardTitle>
          <CardDescription>
            Upload the job description file (PDF, TXT, or MD). The AI will use this to rank candidate resumes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FileUploadArea
            onFilesUpload={handleJobDescriptionUpload}
            acceptedFileTypes={{ 
              "application/pdf": [".pdf"],
              "text/plain": [".txt"],
              "text/markdown": [".md"]
            }}
            multiple={false}
            label="PDF, TXT, or MD file up to 10MB"
            id="job-description-upload"
          />
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-2xl font-headline">
            <Users className="w-7 h-7 mr-3 text-primary" />
            Upload Resumes
          </CardTitle>
          <CardDescription>
            Upload candidate resumes in PDF format. You can drag and drop multiple files.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FileUploadArea
            onFilesUpload={handleResumesUpload}
            acceptedFileTypes={{ "application/pdf": [".pdf"] }}
            multiple
            label="PDF files up to 10MB each"
            id="resume-upload"
          />
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
            <CardTitle className="flex items-center text-2xl font-headline">
                <ScanSearch className="w-7 h-7 mr-3 text-primary" />
                Start Screening
            </CardTitle>
            <CardDescription>
                Once you've uploaded the job description and resumes, click below to screen and rank them using AI.
            </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
            <Button
            onClick={handleScreenResumes}
            disabled={isLoading || !jobDescriptionDataUri || resumeFiles.length === 0}
            size="lg"
            className="bg-accent hover:bg-accent/90 text-accent-foreground text-base px-8 py-6 shadow-md hover:shadow-lg transition-shadow"
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
        </CardContent>
      </Card>

      {(isLoading || rankedCandidates.length > 0) && <Separator className="my-8" />}
      
      {isLoading && (
        <div className="text-center py-8">
          <Loader2 className="w-12 h-12 mx-auto animate-spin text-primary" />
          <p className="mt-4 text-lg text-muted-foreground">Screening resumes... This may take a moment.</p>
        </div>
      )}

      {!isLoading && rankedCandidates.length > 0 && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-headline">Screening Results</CardTitle>
            <CardDescription>Ranked candidates based on the provided job description.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <FilterControls filters={filters} onFilterChange={handleFilterChange} onResetFilters={resetFilters} />
            <CandidateTable candidates={filteredCandidates} onViewFeedback={handleViewFeedback} />
          </CardContent>
        </Card>
      )}

      <FeedbackModal
        isOpen={isFeedbackModalOpen}
        onClose={() => setIsFeedbackModalOpen(false)}
        candidate={selectedCandidateForFeedback}
        jobDescriptionDataUri={jobDescriptionDataUri}
      />
    </div>
  );
}
