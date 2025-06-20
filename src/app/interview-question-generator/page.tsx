
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
import { HelpCircle, Loader2, Lightbulb, FileText, ScrollText, Users, Brain, SearchCheck } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { motion } from "framer-motion";
import { useLoading } from "@/contexts/loading-context";
import { useAuth } from "@/contexts/auth-context";
// Firestore service imports removed
// import type { Timestamp } from "firebase/firestore"; // No longer needed

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
  
  const [generatedQuestions, setGeneratedQuestions] = useState<InterviewQuestionsSet | null>(null); // Managed in-memory
  const [isLoading, setIsLoading] = useState<boolean>(false); // For AI processing
  const [isExtractingTitle, setIsExtractingTitle] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const { toast } = useToast();
  const resultsSectionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setAppIsLoading(false);
    if (!currentUser) {
        setGeneratedQuestions(null); // Clear if user logs out
        setJobDescriptionFile(null);
        setRoleTitle("");
        setFocusAreas("");
    }
  }, [setAppIsLoading, currentUser]);

  useEffect(() => {
    if ((isLoading || generatedQuestions) && resultsSectionRef.current) {
        const timer = setTimeout(() => {
            resultsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start'});
        }, 100);
        return () => clearTimeout(timer);
    }
  }, [isLoading, generatedQuestions]);

  // Removed fetchSavedQuestions and related useEffect

  const handleJobDescriptionUpload = useCallback(async (files: File[]) => {
     if (!currentUser?.uid) {
      toast({ title: "Not Authenticated", description: "Please log in to upload job descriptions.", variant: "destructive" });
      return;
    }
    if (files.length === 0) {
      setJobDescriptionFile(null);
      setRoleTitle("");
      setGeneratedQuestions(null);
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
    setGeneratedQuestions(null); // Clear previous questions on new JD
    setError(null);
    
    setIsExtractingTitle(true);
    setRoleTitle("");
    try {
      const extractionInput: ExtractJobRolesAIInput = {
        jobDescriptionDocuments: [{ name: newJdFile.name, dataUri: newJdFile.dataUri }],
      };
      const extractionOutput: ExtractJobRolesAIOutput = await extractJobRolesAI(extractionInput);
      if (extractionOutput.length > 0 && extractionOutput[0].name && 
          extractionOutput[0].name !== "Untitled Job Role" && 
          !extractionOutput[0].name.startsWith("Job Role")) {
        const extractedTitle = extractionOutput[0].name;
        setRoleTitle(extractedTitle);
        toast({ title: "Role Title Suggested", description: `Extracted "${extractedTitle}" from the document. You can edit if needed.`});
      } else {
         toast({ title: "Role Title Not Found", description: "Could not automatically extract a specific role title. Please enter manually.", variant: "default"});
      }
    } catch (extractError) {
      console.error("Failed to extract role title:", extractError);
      toast({ title: "Title Extraction Failed", description: "Could not automatically extract role title. Please enter manually.", variant: "destructive" });
    } finally {
      setIsExtractingTitle(false);
    }
  }, [toast, currentUser?.uid]);

  const handleGenerateQuestions = useCallback(async () => {
    if (!currentUser?.uid) {
      toast({ title: "Not Authenticated", description: "Please log in to generate questions.", variant: "destructive" });
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
    // setGeneratedQuestions(null); // Clear previous, or allow re-generation to overwrite

    try {
      const input: GenerateJDInterviewQuestionsInput = {
        jobDescriptionDataUri: jobDescriptionFile.dataUri,
        roleTitle: roleTitle.trim(),
        focusAreas: focusAreas.trim() || undefined,
      };
      const aiOutput = await generateJDInterviewQuestions(input);
      
      const questionsSet: InterviewQuestionsSet = {
        roleTitle: roleTitle.trim(),
        jobDescriptionDataUri: jobDescriptionFile.dataUri,
        focusAreas: focusAreas.trim() || undefined,
        ...aiOutput,
      };

      setGeneratedQuestions(questionsSet);
      toast({ title: "Questions Generated", description: "Interview questions are ready below for this session." });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
      setError(`Failed to generate questions: ${errorMessage}`);
      toast({ title: "Generation Failed", description: errorMessage, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [jobDescriptionFile, roleTitle, focusAreas, toast, currentUser?.uid]);

  const questionCategories: Array<{key: keyof InterviewQuestionsSet, title: string, icon: React.ElementType}> = [
    { key: "technicalQuestions", title: "Technical Questions", icon: Brain },
    { key: "behavioralQuestions", title: "Behavioral Questions", icon: Users },
    { key: "situationalQuestions", title: "Situational Questions", icon: HelpCircle },
    { key: "roleSpecificQuestions", title: "Role-Specific Questions", icon: ScrollText },
  ];

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-8">
      <Card className="mb-8 bg-gradient-to-r from-primary/5 via-background to-background border-primary/20 shadow-md">
        <CardHeader>
          <CardTitle className="text-2xl font-headline text-primary flex items-center">
            <SearchCheck className="w-7 h-7 mr-3" /> AI Interview Question Generator
          </CardTitle>
          <CardDescription>
            Upload a job description, confirm role title, and generate tailored interview questions for your current session.
          </CardDescription>
        </CardHeader>
      </Card>
       {!currentUser && (
        <Card className="shadow-lg">
            <CardContent className="pt-6 text-center">
                <p className="text-lg text-muted-foreground">Please <a href="/login" className="text-primary underline">log in</a> to use the Interview Question Generator.</p>
            </CardContent>
        </Card>
      )}
      {currentUser && (
        <>
          <Card className="shadow-lg transition-shadow duration-300 hover:shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center text-xl font-headline">
                <FileText className="w-6 h-6 mr-2 text-primary" />
                Job Description & Context
              </CardTitle>
              <CardDescription>Provide job details. We'll try to auto-fill the title.</CardDescription>
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
                  {isExtractingTitle && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                </div>
                <Input 
                  id="roleTitle" 
                  value={roleTitle} 
                  onChange={(e) => setRoleTitle(e.target.value)} 
                  placeholder="e.g., Senior Software Engineer"
                  disabled={isLoading || isExtractingTitle}
                  className={isExtractingTitle ? "bg-muted/50" : ""}
                />
                <p className="text-xs text-muted-foreground">Confirm or enter the job title. We&apos;ll try to extract it.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="focusAreas" className="font-medium text-foreground">Key Focus Areas/Skills (Optional)</Label>
                <Input 
                  id="focusAreas" 
                  value={focusAreas} 
                  onChange={(e) => setFocusAreas(e.target.value)} 
                  placeholder="e.g., JavaScript, Team Leadership"
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground">Comma-separated list of areas to emphasize.</p>
              </div>
              
              <Button 
                onClick={handleGenerateQuestions} 
                disabled={isLoading || isExtractingTitle || !jobDescriptionFile || !roleTitle.trim()}
                size="lg"
                className="w-full md:w-auto bg-accent hover:bg-accent/90 text-accent-foreground shadow-md hover:shadow-lg transition-all"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <Lightbulb className="w-5 h-5 mr-2" />
                )}
                {generatedQuestions ? "Re-generate Questions" : "Generate Questions"}
              </Button>
            </CardContent>
          </Card>

          <div ref={resultsSectionRef}>
            {isLoading && (
              <Card className="shadow-lg bg-card">
                <CardContent className="pt-6 flex flex-col items-center justify-center space-y-4 min-h-[200px]">
                  <Loader2 className="w-12 h-12 animate-spin text-primary" />
                  <p className="text-lg text-muted-foreground">AI is crafting insightful questions...</p>
                  <p className="text-sm text-muted-foreground">This may take a moment.</p>
                </CardContent>
              </Card>
            )}

            {error && (
              <Alert variant="destructive" className="shadow-md">
                <AlertTitle className="font-semibold">Error Generating Questions</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {generatedQuestions && !isLoading && (
              <div className="space-y-6 mt-8">
                <Separator />
                <h2 className="text-xl font-semibold text-foreground font-headline text-center md:text-left">
                  Interview Questions for <span className="text-primary">{generatedQuestions.roleTitle}</span>
                </h2>
                 <p className="text-sm text-muted-foreground text-center md:text-left">
                    Generated questions for this session.
                    {generatedQuestions.focusAreas && ` Focusing on: ${generatedQuestions.focusAreas}.`}
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
            {!isLoading && !generatedQuestions && roleTitle && jobDescriptionFile && (
                 <Card className="shadow-lg transition-shadow duration-300 hover:shadow-xl">
                    <CardContent className="pt-6">
                        <p className="text-center text-muted-foreground py-8">
                           Click "Generate Questions" for "{roleTitle}".
                        </p>
                    </CardContent>
                </Card>
            )}
             {!isLoading && !generatedQuestions && !roleTitle && (
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
