
"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileUploadArea } from "@/components/file-upload-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { generateJDInterviewQuestions, type GenerateJDInterviewQuestionsInput, type GenerateJDInterviewQuestionsOutput } from "@/ai/flows/generate-jd-interview-questions";
import { extractJobRoles as extractJobRolesAI, type ExtractJobRolesInput as ExtractJobRolesAIInput, type ExtractJobRolesOutput as ExtractJobRolesAIOutput } from "@/ai/flows/extract-job-roles";
import type { JobDescriptionFile, InterviewQuestionsSet } from "@/lib/types";
import { HelpCircle, Loader2, Lightbulb, FileText, ScrollText, Users, Brain, SearchCheck, ServerOff } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { motion } from "framer-motion";
import { useLoading } from "@/contexts/loading-context";
import { useAuth } from "@/contexts/auth-context";
import { saveInterviewQuestionsSet, getInterviewQuestionsSetByTitle } from "@/services/firestoreService";
import { db as firestoreDb } from "@/lib/firebase/config"; // Import db to check availability
import type { Timestamp } from "firebase/firestore";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

const cardHoverVariants = {
  hover: { scale: 1.02, y: -5, boxShadow: "0px 12px 28px hsla(var(--primary), 0.25)", transition: { type: "spring", stiffness: 280, damping: 18 } },
  initial: { scale: 1, y: 0, boxShadow: "0px 6px 18px hsla(var(--primary), 0.1)" }
};

export default function InterviewQuestionGeneratorPage() {
  const { setIsPageLoading: setAppIsLoading } = useLoading();
  const { currentUser } = useAuth();

  const [jobDescriptionFile, setJobDescriptionFile] = useState<JobDescriptionFile | null>(null);
  const [roleTitle, setRoleTitle] = useState<string>("");
  const [focusAreas, setFocusAreas] = useState<string>("");
  
  const [generatedQuestions, setGeneratedQuestions] = useState<InterviewQuestionsSet | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isExtractingTitle, setIsExtractingTitle] = useState<boolean>(false);
  const [isLoadingFromDB, setIsLoadingFromDB] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const { toast } = useToast();
  const resultsSectionRef = useRef<HTMLDivElement | null>(null);
  const isFirestoreAvailable = !!firestoreDb;

  useEffect(() => {
    setAppIsLoading(false);
    if (!currentUser || !isFirestoreAvailable) {
        setGeneratedQuestions(null);
        setJobDescriptionFile(null);
        setRoleTitle("");
        setFocusAreas("");
    }
  }, [setAppIsLoading, currentUser, isFirestoreAvailable]);

  useEffect(() => {
    if ((isLoading || isLoadingFromDB || generatedQuestions) && resultsSectionRef.current) {
        const timer = setTimeout(() => {
            resultsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start'});
        }, 100);
        return () => clearTimeout(timer);
    }
  }, [isLoading, isLoadingFromDB, generatedQuestions]);
  
  // Debounced function to fetch saved questions
  const fetchSavedQuestions = useCallback(async (title: string) => {
    if (!title.trim() || !currentUser?.uid || !isFirestoreAvailable) {
        setGeneratedQuestions(null); // Clear if title is empty
        return;
    }
    setIsLoadingFromDB(true);
    setError(null);
    try {
        const savedSet = await getInterviewQuestionsSetByTitle(title.trim());
        if (savedSet) {
            setGeneratedQuestions(savedSet);
            if(jobDescriptionFile?.dataUri !== savedSet.jobDescriptionDataUri && savedSet.jobDescriptionDataUri){
                 toast({ title: "Loaded Saved Questions", description: `Found questions for "${title}". JD content may differ.` });
            } else {
                 toast({ title: "Loaded Saved Questions", description: `Found questions for "${title}".` });
            }
           
        } else {
            setGeneratedQuestions(null); // Clear if no questions found for this title yet
        }
    } catch (fetchError: any) {
        let description = `Error loading saved questions for "${title}".`;
        if (fetchError.code === 'failed-precondition') {
            description = "Error loading questions. This may be a temporary problem. Please try again later.";
            console.error(
              "Firestore Error (getInterviewQuestionsSetByTitle): The query for interview questions requires an index. " +
              "Please create the required composite index in your Firebase Firestore console. " +
              "The original error message may contain a direct link to create it: ", fetchError.message
            );
        } else {
            console.error("Error fetching interview questions:", fetchError);
            description = String(fetchError.message || fetchError).substring(0,100);
        }
        setError(description); // Set error state for potential display
        toast({ title: "Error Loading Questions", description, variant: "destructive" });
    } finally {
        setIsLoadingFromDB(false);
    }
  }, [currentUser?.uid, toast, isFirestoreAvailable, jobDescriptionFile?.dataUri]);

  // Effect to fetch questions when roleTitle changes (debounced)
  useEffect(() => {
    if (roleTitle.trim()) {
        const handler = setTimeout(() => {
            fetchSavedQuestions(roleTitle);
        }, 700); // Adjust delay as needed (e.g., 500-1000ms)
        return () => clearTimeout(handler);
    } else {
        setGeneratedQuestions(null); // Clear if role title is cleared
    }
  }, [roleTitle, fetchSavedQuestions]);


  const handleJobDescriptionUpload = useCallback(async (files: File[]) => {
     if (!currentUser?.uid) {
      toast({ title: "Not Authenticated", description: "Please log in to upload job descriptions.", variant: "destructive" });
      return;
    }
    if (files.length === 0) {
      setJobDescriptionFile(null);
      // Role title is not cleared here to allow manual entry even without a file
      // setGeneratedQuestions(null); // Let roleTitle change effect handle this
      setError(null);
      return;
    }
    const file = files[0];
    const dataUri = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
    
    const newJdFile = { id: crypto.randomUUID(), file, dataUri, name: file.name };
    setJobDescriptionFile(newJdFile);
    // setGeneratedQuestions(null); // Let roleTitle change effect handle this
    setError(null);
    
    setIsExtractingTitle(true);
    // Do not clear roleTitle here if user might have typed it
    // setRoleTitle(""); 
    try {
      const extractionInput: ExtractJobRolesAIInput = {
        jobDescriptionDocuments: [{ name: newJdFile.name, dataUri: newJdFile.dataUri }],
      };
      const extractionOutput: ExtractJobRolesAIOutput = await extractJobRolesAI(extractionInput);
      if (extractionOutput.length > 0 && extractionOutput[0].name && 
          extractionOutput[0].name !== "Untitled Job Role" && 
          !extractionOutput[0].name.startsWith("Job Role")) {
        const extractedTitle = extractionOutput[0].name;
        setRoleTitle(extractedTitle); // This will trigger useEffect to fetch questions
        toast({ title: "Role Title Suggested", description: `Extracted "${extractedTitle}" from the document. You can edit if needed.`});
      } else {
         toast({ title: "Role Title Not Found", description: "Could not automatically extract a specific role title. Please enter manually.", variant: "default"});
      }
    } catch (extractError) {
      const message = extractError instanceof Error ? extractError.message : String(extractError);
      console.error("Failed to extract role title:", extractError);
      toast({ title: "Title Extraction Failed", description: `Could not automatically extract role title. ${message.substring(0,100)}`, variant: "destructive" });
    } finally {
      setIsExtractingTitle(false);
    }
  }, [toast, currentUser?.uid]);

  const handleGenerateQuestions = useCallback(async () => {
    if (!currentUser?.uid || !isFirestoreAvailable) {
      toast({ title: "Operation Unavailable", description: "Cannot generate questions. Please log in and ensure database is connected.", variant: "destructive" });
      return;
    }
    if (!jobDescriptionFile) {
      toast({ title: "Missing Job Description", description: "Please upload a job description file.", variant: "destructive" });
      return;
    }
    if (!roleTitle.trim()) {
      toast({ title: "Missing Role Title", description: "Please enter a role title.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const trimmedFocusAreas = focusAreas.trim();
      const input: GenerateJDInterviewQuestionsInput = {
        jobDescriptionDataUri: jobDescriptionFile.dataUri,
        roleTitle: roleTitle.trim(),
        focusAreas: trimmedFocusAreas || undefined,
      };
      const aiOutput = await generateJDInterviewQuestions(input);
      
      const questionsSetToSave: Omit<InterviewQuestionsSet, 'id' | 'userId' | 'createdAt'> = {
        roleTitle: roleTitle.trim(),
        jobDescriptionDataUri: jobDescriptionFile.dataUri,
        ...aiOutput,
        // Conditionally add focusAreas to avoid sending `undefined` to Firestore
        ...(trimmedFocusAreas && { focusAreas: trimmedFocusAreas }),
      };
      
      const savedSet = await saveInterviewQuestionsSet(questionsSetToSave);
      setGeneratedQuestions(savedSet); // Update state with the full object from DB
      toast({ title: "Questions Generated & Saved", description: "Interview questions are ready and saved to your account." });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
      setError(`Failed to generate questions: ${errorMessage.substring(0,100)}`);
      toast({ title: "Generation Failed", description: errorMessage.substring(0,100), variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [jobDescriptionFile, roleTitle, focusAreas, toast, currentUser?.uid, isFirestoreAvailable]);

  const questionCategories: Array<{key: keyof InterviewQuestionsSet, title: string, icon: React.ElementType}> = [
    { key: "technicalQuestions", title: "Technical Questions", icon: Brain },
    { key: "behavioralQuestions", title: "Behavioral Questions", icon: Users },
    { key: "situationalQuestions", title: "Situational Questions", icon: HelpCircle },
    { key: "roleSpecificQuestions", title: "Role-Specific Questions", icon: ScrollText },
  ];
  
  const isProcessing = isLoading || isExtractingTitle || isLoadingFromDB;

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-8">
      <Card className="mb-8 bg-gradient-to-r from-primary/5 via-background to-background border-primary/20 shadow-md">
        <CardHeader>
          <CardTitle className="text-2xl font-headline text-primary flex items-center">
            <SearchCheck className="w-7 h-7 mr-3" /> AI Interview Question Generator
          </CardTitle>
          <CardDescription>
            Upload a job description, confirm role title, and generate tailored interview questions. Your questions are saved to your account.
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
                <p className="text-lg text-muted-foreground">Please <a href="/login" className="text-primary underline">log in</a> to use the Interview Question Generator and save your questions.</p>
            </CardContent>
        </Card>
      )}

      {currentUser && isFirestoreAvailable && (
        <>
          <Card className="shadow-lg transition-shadow duration-300 hover:shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center text-xl font-headline">
                <FileText className="w-6 h-6 mr-2 text-primary" />
                Job Description & Context
              </CardTitle>
              <CardDescription>Provide job details. We'll try to auto-fill the title and load saved questions.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="job-description-upload" className="font-medium text-foreground">Upload Job Description</Label>
                <FileUploadArea
                  onFilesUpload={handleJobDescriptionUpload}
                  acceptedFileTypes={{ 
                    "application/pdf": [".pdf"], "text/plain": [".txt"], "text/markdown": [".md"],
                    "application/msword": [".doc"], "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"]
                  }}
                  multiple={false}
                  label="Single PDF, TXT, DOC, DOCX, MD file up to 5MB"
                  id="job-description-upload"
                  maxSizeInBytes={MAX_FILE_SIZE_BYTES}
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="roleTitle" className="font-medium text-foreground">Role Title</Label>
                  {(isExtractingTitle || isLoadingFromDB) && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                </div>
                <Input 
                  id="roleTitle" 
                  value={roleTitle} 
                  onChange={(e) => setRoleTitle(e.target.value)} 
                  placeholder="e.g., Senior Software Engineer"
                  disabled={isProcessing}
                  className={(isExtractingTitle || isLoadingFromDB) ? "bg-muted/50" : ""}
                />
                <p className="text-xs text-muted-foreground">Confirm or enter job title. We'll try to extract it & load saved questions.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="focusAreas" className="font-medium text-foreground">Key Focus Areas/Skills (Optional)</Label>
                <Input 
                  id="focusAreas" 
                  value={focusAreas} 
                  onChange={(e) => setFocusAreas(e.target.value)} 
                  placeholder="e.g., JavaScript, Team Leadership"
                  disabled={isProcessing}
                />
                <p className="text-xs text-muted-foreground">Comma-separated list of areas to emphasize.</p>
              </div>
              
              <Button 
                onClick={handleGenerateQuestions} 
                disabled={isProcessing || !jobDescriptionFile || !roleTitle.trim()}
                size="lg"
                className="w-full md:w-auto bg-accent hover:bg-accent/90 text-accent-foreground shadow-md hover:shadow-lg transition-all"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <Lightbulb className="w-5 h-5 mr-2" />
                )}
                {generatedQuestions ? "Re-generate & Save" : "Generate & Save Questions"}
              </Button>
            </CardContent>
          </Card>

          <div ref={resultsSectionRef}>
            {isProcessing && !generatedQuestions && ( // Show main loading if no questions yet
              <Card className="shadow-lg bg-card">
                <CardContent className="pt-6 flex flex-col items-center justify-center space-y-4 min-h-[200px]">
                  <Loader2 className="w-12 h-12 animate-spin text-primary" />
                  <p className="text-lg text-muted-foreground">
                    {isLoading && "AI is crafting insightful questions..."}
                    {isLoadingFromDB && "Loading saved questions..."}
                    {isExtractingTitle && "Extracting title..."}
                  </p>
                  <p className="text-sm text-muted-foreground">This may take a moment.</p>
                </CardContent>
              </Card>
            )}

            {error && !isLoading && ( // Only show error if not in a loading state for questions
              <Alert variant="destructive" className="shadow-md">
                <AlertTitle className="font-semibold">Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {generatedQuestions && !isLoading && ( // Show questions if available and not actively generating new ones
              <div className="space-y-6 mt-8">
                <Separator />
                <h2 className="text-xl font-semibold text-foreground font-headline text-center md:text-left">
                  Interview Questions for <span className="text-primary">{generatedQuestions.roleTitle}</span>
                </h2>
                 <p className="text-sm text-muted-foreground text-center md:text-left">
                    {generatedQuestions.id ? "Loaded saved questions." : "Generated questions."}
                    {generatedQuestions.focusAreas && ` Focusing on: ${generatedQuestions.focusAreas}.`}
                    {generatedQuestions.createdAt && <span className="block text-xs">Last updated: {(generatedQuestions.createdAt as Timestamp).toDate().toLocaleDateString()}</span>}
                 </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {questionCategories.map(({key, title, icon: Icon}) => {
                    const questions = generatedQuestions[key as keyof GenerateJDInterviewQuestionsOutput];
                    if (questions && Array.isArray(questions) && questions.length > 0) {
                      return (
                        <motion.div
                          key={key}
                          initial="initial"
                          whileHover="hover"
                          variants={cardHoverVariants}
                          className="h-full" 
                        >
                          <Card className="bg-card flex flex-col h-full">
                            <CardHeader className="pb-3">
                              <CardTitle className="flex items-center text-lg text-primary font-medium">
                                <Icon className="w-5 h-5 mr-2.5 shrink-0" />
                                {title}
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="flex-grow pt-0">
                              <ul className="list-disc pl-5 space-y-2.5 text-sm text-foreground">
                                {questions.map((q, index) => (
                                  <li key={index} className="leading-relaxed">{q}</li>
                                ))}
                              </ul>
                            </CardContent>
                          </Card>
                        </motion.div>
                      );
                    }
                    return null; 
                  })}
                </div>
              </div>
            )}
            {!isProcessing && !generatedQuestions && roleTitle.trim() && jobDescriptionFile && !error && (
                 <Card className="shadow-lg transition-shadow duration-300 hover:shadow-xl">
                    <CardContent className="pt-6">
                        <p className="text-center text-muted-foreground py-8">
                           Click "Generate & Save Questions" for "{roleTitle}".
                        </p>
                    </CardContent>
                </Card>
            )}
             {!isProcessing && !generatedQuestions && !roleTitle.trim() && !error &&(
                 <Card className="shadow-lg transition-shadow duration-300 hover:shadow-xl">
                    <CardContent className="pt-6">
                        <p className="text-center text-muted-foreground py-8">
                           Upload a Job Description and provide a Role Title to generate questions.
                        </p>
                    </CardContent>
                </Card>
            )}
          </div>
        </>
      )}
    </div>
  );
}
