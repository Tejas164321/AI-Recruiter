
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
import { BarChartBig, Loader2, ScanSearch, BrainCircuit, ServerOff } from "lucide-react";
import { LoadingIndicator } from "@/components/loading-indicator";
import { useLoading } from "@/contexts/loading-context";
import { useAuth } from "@/contexts/auth-context";
import { saveMultipleAtsScoreResults, getAtsScoreResults } from "@/services/firestoreService";
import { db as firestoreDb } from "@/lib/firebase/config"; // Import db to check availability

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const MAX_FILES_ATS = 10;

export default function AtsScoreFinderPage() {
  const { setIsPageLoading: setAppIsLoading } = useLoading();
  const { currentUser } = useAuth();

  const [uploadedResumeFiles, setUploadedResumeFiles] = useState<ResumeFile[]>([]);
  const [atsResults, setAtsResults] = useState<AtsScoreResult[]>([]);
  const [isProcessingAts, setIsProcessingAts] = useState<boolean>(false);
  const [isLoadingResultsFromDB, setIsLoadingResultsFromDB] = useState<boolean>(true);
  const [selectedResultForModal, setSelectedResultForModal] = useState<AtsScoreResult | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const { toast } = useToast();
  const resultsSectionRef = useRef<HTMLDivElement | null>(null);
  const analyzeButtonRef = useRef<HTMLButtonElement | null>(null);

  const isFirestoreAvailable = !!firestoreDb;

  useEffect(() => {
    setAppIsLoading(false);
    if (currentUser && isFirestoreAvailable) {
      setIsLoadingResultsFromDB(true);
      getAtsScoreResults()
        .then(results => setAtsResults(results.sort((a,b) => b.atsScore - a.atsScore)))
        .catch(err => {
          console.error("Error fetching ATS results:", err);
          toast({ title: "Error Loading ATS Results", description: String(err).substring(0,100), variant: "destructive" });
        })
        .finally(() => setIsLoadingResultsFromDB(false));
    } else if (!currentUser || !isFirestoreAvailable) {
        setIsLoadingResultsFromDB(false);
        setAtsResults([]);
    }
  }, [currentUser, toast, setAppIsLoading, isFirestoreAvailable]);

  useEffect(() => {
    if (uploadedResumeFiles.length > 0 && !isProcessingAts && analyzeButtonRef.current) {
      const timer = setTimeout(() => {
        analyzeButtonRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [uploadedResumeFiles, isProcessingAts]);

  useEffect(() => {
    const shouldScroll = isProcessingAts || isLoadingResultsFromDB || (!isProcessingAts && !isLoadingResultsFromDB && atsResults.length > 0);
    if (shouldScroll && resultsSectionRef.current) {
      const timer = setTimeout(() => {
        resultsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isProcessingAts, isLoadingResultsFromDB, atsResults]);

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
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast({ title: "Error processing resume files", description: message.substring(0,100), variant: "destructive" });
    }
  }, [toast, currentUser?.uid]);

  const handleAnalyzeResumes = useCallback(async () => {
    if (!currentUser?.uid || !isFirestoreAvailable) {
      toast({ title: "Operation Unavailable", description: "Cannot analyze resumes. Please log in and ensure database is connected.", variant: "destructive" });
      return;
    }
    if (uploadedResumeFiles.length === 0) {
      toast({ title: "No Resumes Uploaded", description: "Please upload resume files to analyze.", variant: "destructive" });
      return;
    }

    setIsProcessingAts(true);
    const aiResultsToSave: Array<Omit<AtsScoreResult, 'id' | 'userId' | 'createdAt'>> = [];
    let filesProcessedSuccessfully = 0;

    const processingPromises = uploadedResumeFiles.map(async (resumeFile) => {
      try {
        const input: CalculateAtsScoreInput = {
          resumeDataUri: resumeFile.dataUri,
          originalResumeName: resumeFile.name,
        };
        const output: CalculateAtsScoreOutput = await calculateAtsScore(input);
        
        aiResultsToSave.push({
          resumeId: resumeFile.id, // keep original client-side ID for reference
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
      }
    });

    await Promise.all(processingPromises);
    
    if (aiResultsToSave.length > 0) {
        try {
            const savedDbResults = await saveMultipleAtsScoreResults(aiResultsToSave);
            setAtsResults(prevResults => [...prevResults, ...savedDbResults].sort((a,b) => b.atsScore - a.atsScore));
            toast({
                title: "ATS Analysis Complete & Saved",
                description: `${savedDbResults.length} of ${uploadedResumeFiles.length} resumes processed and saved.`,
            });
        } catch (dbError) {
            const message = dbError instanceof Error ? dbError.message : String(dbError);
            toast({ title: "Failed to Save ATS Results", description: `AI analysis complete, but could not save to database: ${message.substring(0,100)}`, variant: "destructive"});
            // Optionally, show results in memory even if save fails
            // const inMemoryResults = aiResultsToSave.map(r => ({...r, id: crypto.randomUUID(), userId: currentUser.uid, createdAt: new Date()}) as AtsScoreResult);
            // setAtsResults(prev => [...prev, ...inMemoryResults].sort((a,b) => b.atsScore - a.atsScore));
        }
    } else if (uploadedResumeFiles.length > 0 && filesProcessedSuccessfully === 0) {
         toast({
            title: "ATS Analysis Failed",
            description: "No resumes could be processed successfully.",
            variant: "destructive"
        });
    }
    
    setIsProcessingAts(false);
    setUploadedResumeFiles([]);

  }, [uploadedResumeFiles, toast, currentUser?.uid, isFirestoreAvailable]);

  const handleViewInsights = (result: AtsScoreResult) => {
    setSelectedResultForModal(result);
    setIsModalOpen(true);
  };
  
  const isProcessing = isProcessingAts || isLoadingResultsFromDB;

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-8">
      <Card className="mb-8 bg-gradient-to-r from-primary/5 via-background to-background border-primary/20 shadow-md">
        <CardHeader>
          <CardTitle className="text-2xl font-headline text-primary flex items-center">
            <BarChartBig className="w-7 h-7 mr-3" /> ATS Score Analyzer
          </CardTitle>
          <CardDescription>
            Upload resumes to analyze their compatibility with Applicant Tracking Systems. Results are saved to your account.
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
          </CardContent>
        </Card>
      )}

      {!currentUser && isFirestoreAvailable && (
        <Card className="shadow-lg">
            <CardContent className="pt-6 text-center">
                <p className="text-lg text-muted-foreground">Please <a href="/login" className="text-primary underline">log in</a> to use the ATS Score Analyzer and save your results.</p>
            </CardContent>
        </Card>
      )}

      {currentUser && isFirestoreAvailable && (
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
                disabled={isProcessingAts || uploadedResumeFiles.length === 0 || isLoadingResultsFromDB}
                size="lg"
                className="w-full md:w-auto bg-accent hover:bg-accent/90 text-accent-foreground shadow-md hover:shadow-lg transition-all"
              >
                {isProcessingAts ? (
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <ScanSearch className="w-5 h-5 mr-2" />
                )}
                Analyze & Save ATS Scores
              </Button>
            </CardContent>
          </Card>

          <div ref={resultsSectionRef}>
            {isProcessing && (
              <Card className="shadow-lg">
                <CardContent className="pt-6">
                    <LoadingIndicator stage={"screening"} />
                </CardContent>
              </Card>
            )}

            {!isProcessing && atsResults.length > 0 && (
              <Card className="shadow-lg transition-shadow duration-300 hover:shadow-xl">
                <CardHeader>
                  <CardTitle className="text-xl font-headline text-primary flex items-center">
                    <BrainCircuit className="w-6 h-6 mr-2" /> Saved ATS Score Results
                  </CardTitle>
                  <CardDescription>
                    Previously analyzed and saved resumes, ranked by ATS score.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <AtsScoreTable results={atsResults} onViewInsights={handleViewInsights} />
                </CardContent>
              </Card>
            )}
            {!isProcessing && atsResults.length === 0 && (
                <Card className="shadow-lg transition-shadow duration-300 hover:shadow-xl">
                    <CardContent className="pt-6">
                        <p className="text-center text-muted-foreground py-8">
                            {uploadedResumeFiles.length > 0 ? 'Click "Analyze & Save ATS Scores" to begin.' : 'Upload resumes to get started. Your saved results will appear here.'}
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
