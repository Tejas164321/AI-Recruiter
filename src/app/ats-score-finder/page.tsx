
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
import { useLoading } from "@/contexts/loading-context";
import { useAuth } from "@/contexts/auth-context";
// Firestore service imports removed
// import type { Timestamp } from "firebase/firestore"; // No longer needed

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const MAX_FILES_ATS = 10;

export default function AtsScoreFinderPage() {
  const { setIsPageLoading: setAppIsLoading } = useLoading();
  const { currentUser } = useAuth();

  const [uploadedResumeFiles, setUploadedResumeFiles] = useState<ResumeFile[]>([]);
  const [atsResults, setAtsResults] = useState<AtsScoreResult[]>([]); // Managed in-memory
  const [isProcessingAts, setIsProcessingAts] = useState<boolean>(false); // For AI processing
  // const [isLoadingResults, setIsLoadingResults] = useState<boolean>(false); // No longer loading from DB
  const [selectedResultForModal, setSelectedResultForModal] = useState<AtsScoreResult | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const { toast } = useToast();
  const resultsSectionRef = useRef<HTMLDivElement | null>(null);
  const analyzeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    setAppIsLoading(false);
    if (!currentUser) {
      setAtsResults([]); // Clear results if user logs out
    }
  }, [currentUser, setAppIsLoading]);

  useEffect(() => {
    if (uploadedResumeFiles.length > 0 && !isProcessingAts && analyzeButtonRef.current) {
      const timer = setTimeout(() => {
        analyzeButtonRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [uploadedResumeFiles, isProcessingAts]);

  useEffect(() => {
    const shouldScroll = isProcessingAts || (!isProcessingAts && atsResults.length > 0);
    if (shouldScroll && resultsSectionRef.current) {
      const timer = setTimeout(() => {
        resultsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isProcessingAts, atsResults]);

  const handleResumesUpload = useCallback(async (files: File[]) => {
    if (!currentUser?.uid) {
      toast({ title: "Not Authenticated", description: "Please log in to upload resumes.", variant: "destructive" });
      return;
    }
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
      // setAtsResults([]); // Clear previous session results when new files are uploaded
    } catch (error) {
      toast({ title: "Error processing resume files", description: String(error), variant: "destructive" });
    }
  }, [toast, currentUser?.uid]);

  const handleAnalyzeResumes = useCallback(async () => {
    if (!currentUser?.uid) {
      toast({ title: "Not Authenticated", description: "Please log in to analyze resumes.", variant: "destructive" });
      return;
    }
    if (uploadedResumeFiles.length === 0) {
      toast({ title: "No Resumes Uploaded", description: "Please upload resume files to analyze.", variant: "destructive" });
      return;
    }

    setIsProcessingAts(true);
    const newAtsResults: AtsScoreResult[] = [];
    let filesProcessedSuccessfully = 0;

    const processingPromises = uploadedResumeFiles.map(async (resumeFile) => {
      try {
        const input: CalculateAtsScoreInput = {
          resumeDataUri: resumeFile.dataUri,
          originalResumeName: resumeFile.name,
        };
        const output: CalculateAtsScoreOutput = await calculateAtsScore(input);
        
        const result: AtsScoreResult = {
          resumeId: resumeFile.id,
          resumeName: resumeFile.name,
          candidateName: output.candidateName,
          atsScore: output.atsScore,
          atsFeedback: output.atsFeedback,
          resumeDataUri: resumeFile.dataUri,
        };
        newAtsResults.push(result);
        filesProcessedSuccessfully++;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error during ATS analysis.";
        console.error(`Failed to process ${resumeFile.name}: ${errorMessage}`);
        toast({
          title: `Analysis Failed for ${resumeFile.name}`,
          description: `Could not get ATS score. ${errorMessage.substring(0,100)}`,
          variant: "destructive",
        });
      }
    });

    await Promise.all(processingPromises);
    setIsProcessingAts(false);
    setUploadedResumeFiles([]); // Clear upload area after processing

    if (filesProcessedSuccessfully > 0) {
        setAtsResults(prevResults => [...prevResults, ...newAtsResults].sort((a,b) => b.atsScore - a.atsScore)); // Append and sort
        toast({
            title: "ATS Analysis Complete",
            description: `${filesProcessedSuccessfully} of ${uploadedResumeFiles.length} resumes processed. Results are for this session only.`,
        });
    } else if (uploadedResumeFiles.length > 0) {
         toast({
            title: "ATS Analysis Failed",
            description: "No resumes could be processed successfully.",
            variant: "destructive"
        });
    }
  }, [uploadedResumeFiles, toast, currentUser?.uid]);

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
            Upload resumes to analyze their compatibility with Applicant Tracking Systems. Results are available for this session.
          </CardDescription>
        </CardHeader>
      </Card>
      {!currentUser && (
        <Card className="shadow-lg">
            <CardContent className="pt-6 text-center">
                <p className="text-lg text-muted-foreground">Please <a href="/login" className="text-primary underline">log in</a> to use the ATS Score Analyzer.</p>
            </CardContent>
        </Card>
      )}
      {currentUser && (
        <>
          <Card className="shadow-lg transition-shadow duration-300 hover:shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center text-xl font-headline">
                Upload Resumes
              </CardTitle>
              <CardDescription>
                Upload one or more resume files (PDF, DOCX, TXT). Max 5MB each. Up to {MAX_FILES_ATS} files.
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
                disabled={isProcessingAts || uploadedResumeFiles.length === 0}
                size="lg"
                className="w-full md:w-auto bg-accent hover:bg-accent/90 text-accent-foreground shadow-md hover:shadow-lg transition-all"
              >
                {isProcessingAts ? (
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <ScanSearch className="w-5 h-5 mr-2" />
                )}
                Analyze ATS Scores
              </Button>
            </CardContent>
          </Card>

          <div ref={resultsSectionRef}>
            {isProcessingAts && (
              <Card className="shadow-lg">
                <CardContent className="pt-6">
                    <LoadingIndicator stage={"screening"} />
                </CardContent>
              </Card>
            )}

            {!isProcessingAts && atsResults.length > 0 && (
              <Card className="shadow-lg transition-shadow duration-300 hover:shadow-xl">
                <CardHeader>
                  <CardTitle className="text-xl font-headline text-primary flex items-center">
                    <BrainCircuit className="w-6 h-6 mr-2" /> Session ATS Score Results
                  </CardTitle>
                  <CardDescription>
                    Analyzed resumes for this session, ranked by ATS score.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <AtsScoreTable results={atsResults} onViewInsights={handleViewInsights} />
                </CardContent>
              </Card>
            )}
            {!isProcessingAts && atsResults.length === 0 && (
                <Card className="shadow-lg transition-shadow duration-300 hover:shadow-xl">
                    <CardContent className="pt-6">
                        <p className="text-center text-muted-foreground py-8">
                            {uploadedResumeFiles.length > 0 ? 'Click "Analyze ATS Scores" to begin.' : 'Upload resumes to get started. Results for this session will appear here.'}
                        </p>
                    </CardContent>
                </Card>
            )}
          </div>

          <AtsFeedbackModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            result={selectedResultForModal}
          />
        </>
      )}
    </div>
  );
}
