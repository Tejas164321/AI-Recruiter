
"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileUploadArea } from "@/components/file-upload-area";
import { useToast } from "@/hooks/use-toast";
import { calculateAtsScore, type CalculateAtsScoreInput, type CalculateAtsScoreOutput } from "@/ai/flows/calculate-ats-score";
import type { ResumeFile, AtsScoreResult } from "@/lib/types";
import { AtsScoreTable } from "@/components/ats-score-table";
import { AtsFeedbackModal } from "@/components/ats-feedback-modal";
import { BarChartBig, Loader2, ScanSearch, BrainCircuit } from "lucide-react";
import { LoadingIndicator } from "@/components/loading-indicator";
import { useLoading } from "@/contexts/loading-context"; // Import useLoading

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const MAX_FILES_ATS = 10; // Limit concurrent processing for stability

export default function AtsScoreFinderPage() {
  const { setIsPageLoading } = useLoading(); // Consume useLoading
  useEffect(() => {
    setIsPageLoading(false); // Signal page has loaded
  }, [setIsPageLoading]);

  const [uploadedResumeFiles, setUploadedResumeFiles] = useState<ResumeFile[]>([]);
  const [atsResults, setAtsResults] = useState<AtsScoreResult[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedResultForModal, setSelectedResultForModal] = useState<AtsScoreResult | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const { toast } = useToast();
  const resultsSectionRef = useRef<HTMLDivElement | null>(null);
  const analyzeButtonRef = useRef<HTMLButtonElement | null>(null);

  // Scroll to "Analyze Resumes" button when resumes are uploaded and not currently loading
  useEffect(() => {
    if (uploadedResumeFiles.length > 0 && !isLoading && analyzeButtonRef.current) {
      const timer = setTimeout(() => {
        analyzeButtonRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [uploadedResumeFiles, isLoading]);

  // Scroll to results/loading section when loading starts
  useEffect(() => {
    if (isLoading && resultsSectionRef.current) {
      const timer = setTimeout(() => {
        resultsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  // Scroll to results when analysis is complete and results are available
  useEffect(() => {
    if (!isLoading && atsResults.length > 0 && resultsSectionRef.current) {
        const timer = setTimeout(() => {
            resultsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 100);
        return () => clearTimeout(timer);
    }
  }, [isLoading, atsResults]);


  const handleResumesUpload = useCallback(async (files: File[]) => {
    if (files.length > MAX_FILES_ATS) {
        toast({
            title: "Too many files",
            description: `Please upload a maximum of ${MAX_FILES_ATS} resumes at a time for ATS scoring.`,
            variant: "destructive",
        });
        return;
    }
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
      setAtsResults([]); // Clear previous results when new files are selected
    } catch (error) {
      toast({ title: "Error processing resume files", description: String(error), variant: "destructive" });
    }
  }, [toast]);

  const handleAnalyzeResumes = useCallback(async () => {
    if (uploadedResumeFiles.length === 0) {
      toast({ title: "No Resumes Uploaded", description: "Please upload resume files to analyze.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    setAtsResults([]); // Clear previous results before new analysis
    const results: AtsScoreResult[] = [];
    let filesProcessedSuccessfully = 0;

    const processingPromises = uploadedResumeFiles.map(async (resumeFile) => {
      try {
        const input: CalculateAtsScoreInput = {
          resumeDataUri: resumeFile.dataUri,
          originalResumeName: resumeFile.name,
        };
        const output: CalculateAtsScoreOutput = await calculateAtsScore(input);
        results.push({
          id: resumeFile.id,
          resumeName: resumeFile.name,
          candidateName: output.candidateName,
          atsScore: output.atsScore,
          atsFeedback: output.atsFeedback,
          resumeDataUri: resumeFile.dataUri,
        });
        filesProcessedSuccessfully++;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error during ATS analysis.";
        console.error(`Failed to process ${resumeFile.name}: ${errorMessage}`);
        toast({
          title: `Analysis Failed for ${resumeFile.name}`,
          description: `Could not get ATS score. ${errorMessage.substring(0,100)}`,
          variant: "destructive",
        });
         results.push({ // Add a placeholder for failed items
          id: resumeFile.id,
          resumeName: resumeFile.name,
          atsScore: 0,
          atsFeedback: `Failed to process this resume. Error: ${errorMessage}`,
          resumeDataUri: resumeFile.dataUri,
        });
      }
    });

    await Promise.all(processingPromises);

    results.sort((a, b) => b.atsScore - a.atsScore);
    setAtsResults(results);
    setIsLoading(false);

    if (filesProcessedSuccessfully > 0) {
        toast({
            title: "ATS Analysis Complete",
            description: `${filesProcessedSuccessfully} of ${uploadedResumeFiles.length} resumes processed. Results are below.`,
        });
        // Scrolling to results is now handled by useEffect
    } else if (uploadedResumeFiles.length > 0) {
         toast({
            title: "ATS Analysis Failed",
            description: "No resumes could be processed successfully. Check logs for details.",
            variant: "destructive"
        });
    }
  }, [uploadedResumeFiles, toast]);

  const handleViewInsights = (result: AtsScoreResult) => {
    setSelectedResultForModal(result);
    setIsModalOpen(true);
  };

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-8">
      <Card className="mb-8 bg-gradient-to-r from-primary/5 via-background to-background border-primary/20 shadow-md">
        <CardHeader>
          <CardTitle className="text-2xl font-headline text-primary flex items-center">
            <BarChartBig className="w-7 h-7 mr-3" /> ATS Score Analyzer
          </CardTitle>
          <CardDescription>
            Upload resumes to analyze their compatibility with Applicant Tracking Systems. Get scores and actionable insights to help optimize them for automated screening.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card className="shadow-lg transition-shadow duration-300 hover:shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center text-xl font-headline">
            Upload Resumes
          </CardTitle>
          <CardDescription>
            Upload one or more resume files (PDF, DOCX, TXT). Max 5MB each. Up to {MAX_FILES_ATS} files at a time.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <FileUploadArea
            onFilesUpload={handleResumesUpload}
            acceptedFileTypes={{
              "application/pdf": [".pdf"],
              "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
              "text/plain": [".txt"],
              "application/msword": [".doc"],
            }}
            multiple
            label={`PDF, DOCX, DOC, TXT files up to 5MB each (max ${MAX_FILES_ATS} files)`}
            id="ats-resume-upload"
            maxSizeInBytes={MAX_FILE_SIZE_BYTES}
          />
          <Button
            ref={analyzeButtonRef}
            onClick={handleAnalyzeResumes}
            disabled={isLoading || uploadedResumeFiles.length === 0}
            size="lg"
            className="w-full md:w-auto bg-accent hover:bg-accent/90 text-accent-foreground shadow-md hover:shadow-lg transition-all"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            ) : (
              <ScanSearch className="w-5 h-5 mr-2" />
            )}
            Analyze Resumes for ATS Score
          </Button>
        </CardContent>
      </Card>

      <div ref={resultsSectionRef}>
        {isLoading && (
          <Card className="shadow-lg">
            <CardContent className="pt-6">
                <LoadingIndicator stage="screening" />
            </CardContent>
          </Card>
        )}

        {!isLoading && atsResults.length > 0 && (
          <Card className="shadow-lg transition-shadow duration-300 hover:shadow-xl">
            <CardHeader>
              <CardTitle className="text-xl font-headline text-primary flex items-center">
                <BrainCircuit className="w-6 h-6 mr-2" /> ATS Score Results
              </CardTitle>
              <CardDescription>
                Resumes ranked by their ATS compatibility score. Click "View Insights" for detailed feedback.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AtsScoreTable results={atsResults} onViewInsights={handleViewInsights} />
            </CardContent>
          </Card>
        )}
         {!isLoading && atsResults.length === 0 && uploadedResumeFiles.length > 0 && (
            <Card className="shadow-lg transition-shadow duration-300 hover:shadow-xl">
                <CardContent className="pt-6">
                     <p className="text-center text-muted-foreground py-8">Click "Analyze Resumes for ATS Score" to begin.</p>
                </CardContent>
            </Card>
        )}
      </div>

      <AtsFeedbackModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        result={selectedResultForModal}
      />
    </div>
  );
}
