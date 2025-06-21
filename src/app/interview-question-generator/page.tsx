
"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileUploadArea } from "@/components/file-upload-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { generateJDInterviewQuestions, type GenerateJDInterviewQuestionsInput } from "@/ai/flows/generate-jd-interview-questions";
import { extractJobRoles as extractJobRolesAI, type ExtractJobRolesInput as ExtractJobRolesAIInput, type ExtractJobRolesOutput as ExtractJobRolesAIOutput } from "@/ai/flows/extract-job-roles";
import type { InterviewQuestionsSet } from "@/lib/types";
import { HelpCircle, Loader2, Lightbulb, FileText, ScrollText, Users, Brain, SearchCheck } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { motion } from "framer-motion";
import { useLoading } from "@/contexts/loading-context";
import { useAuth } from "@/contexts/auth-context";
import { Textarea } from "@/components/ui/textarea";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

const cardHoverVariants = {
  hover: { scale: 1.02, y: -5, boxShadow: "0px 12px 28px hsla(var(--primary), 0.25)", transition: { type: "spring", stiffness: 280, damping: 18 } },
  initial: { scale: 1, y: 0, boxShadow: "0px 6px 18px hsla(var(--primary), 0.1)" }
};

export default function InterviewQuestionGeneratorPage() {
  const { setIsPageLoading: setAppIsLoading } = useLoading();
  const { currentUser } = useAuth();

  const [jdContent, setJdContent] = useState<string>("");
  const [roleTitle, setRoleTitle] = useState<string>("");
  const [focusAreas, setFocusAreas] = useState<string>("");
  
  const [generatedQuestions, setGeneratedQuestions] = useState<Omit<InterviewQuestionsSet, 'id'|'userId'|'createdAt'> | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const { toast } = useToast();
  const resultsSectionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setAppIsLoading(false);
  }, [setAppIsLoading]);

  useEffect(() => {
    if ((isLoading || generatedQuestions) && resultsSectionRef.current) {
        const timer = setTimeout(() => {
            resultsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start'});
        }, 100);
        return () => clearTimeout(timer);
    }
  }, [isLoading, generatedQuestions]);
  

  const handleJobDescriptionUpload = useCallback(async (files: File[]) => {
     if (!currentUser?.uid) {
      toast({ title: "Not Authenticated", description: "Please log in to upload files.", variant: "destructive" });
      return;
    }
    if (files.length === 0) return;

    const file = files[0];
    const dataUri = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
    
    setIsLoading(true);
    setGeneratedQuestions(null);
    setError(null);

    try {
      const extractionInput: ExtractJobRolesAIInput = {
        jobDescriptionDocuments: [{ name: file.name, dataUri }],
      };
      const extractionOutput: ExtractJobRolesAIOutput = await extractJobRolesAI(extractionInput);
      
      if (extractionOutput.length > 0 && extractionOutput[0].contentDataUri) {
        const firstRole = extractionOutput[0];
        
        const base64 = firstRole.contentDataUri.split(',')[1];
        if (base64) {
            // Using Buffer to handle potential UTF-8 characters, common in Node.js/Next.js envs
            const decodedText = Buffer.from(base64, 'base64').toString('utf-8');
            setJdContent(decodedText);
        }
        
        if (firstRole.name && firstRole.name !== "Untitled Job Role" && !firstRole.name.startsWith("Job Role")) {
          setRoleTitle(firstRole.name);
          toast({ title: "Content & Title Extracted", description: `Extracted JD content and suggested role title: "${firstRole.name}".`});
        } else {
          setRoleTitle("");
          toast({ title: "Content Extracted", description: "JD content has been extracted. Please provide a role title." });
        }
      } else {
         setJdContent("");
         toast({ title: "Extraction Failed", description: "Could not extract content from the document.", variant: "destructive"});
      }
    } catch (extractError) {
      const message = extractError instanceof Error ? extractError.message : String(extractError);
      console.error("Failed to extract content:", extractError);
      setJdContent("");
      toast({ title: "File Processing Failed", description: message.substring(0,100), variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast, currentUser?.uid]);

  const handleGenerateQuestions = useCallback(async () => {
    if (!currentUser?.uid) {
      toast({ title: "Not Authenticated", description: "Please log in to generate questions.", variant: "destructive" });
      return;
    }
    if (!jdContent.trim()) {
      toast({ title: "Missing Job Description", description: "Please enter or upload a job description.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const trimmedFocusAreas = focusAreas.trim();
      const contentDataUri = `data:text/plain;charset=utf-8;base64,${Buffer.from(jdContent).toString('base64')}`;

      const input: GenerateJDInterviewQuestionsInput = {
        jobDescriptionDataUri: contentDataUri,
        roleTitle: roleTitle.trim() || undefined,
        focusAreas: trimmedFocusAreas || undefined,
      };
      const aiOutput = await generateJDInterviewQuestions(input);
      
      const questionsSet = {
        roleTitle: roleTitle.trim(),
        jobDescriptionDataUri: contentDataUri,
        ...aiOutput,
        ...(trimmedFocusAreas && { focusAreas: trimmedFocusAreas }),
      };
      
      setGeneratedQuestions(questionsSet);
      toast({ title: "Questions Generated", description: "Your interview questions are ready." });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
      setError(`Failed to generate questions: ${errorMessage.substring(0,100)}`);
      toast({ title: "Generation Failed", description: errorMessage.substring(0,100), variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [jdContent, roleTitle, focusAreas, toast, currentUser?.uid]);

  const questionCategories: Array<{key: keyof Omit<InterviewQuestionsSet, 'id'|'userId'|'createdAt'|'roleTitle'>, title: string, icon: React.ElementType}> = [
    { key: "technicalQuestions", title: "Technical Questions", icon: Brain },
    { key: "behavioralQuestions", title: "Behavioral Questions", icon: Users },
    { key: "situationalQuestions", title: "Situational Questions", icon: HelpCircle },
    { key: "roleSpecificQuestions", title: "Role-Specific Questions", icon: ScrollText },
  ];
  
  const isProcessing = isLoading;

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-8">
      <Card className="mb-8 bg-gradient-to-r from-primary/5 via-background to-background border-primary/20 shadow-md">
        <CardHeader>
          <CardTitle className="text-2xl font-headline text-primary flex items-center">
            <SearchCheck className="w-7 h-7 mr-3" /> AI Interview Question Generator
          </CardTitle>
          <CardDescription>
            Type or paste a job description below, or upload a file to auto-populate the fields. Then, generate tailored interview questions.
          </CardDescription>
        </CardHeader>
      </Card>

       {!currentUser && (
        <Card className="shadow-lg">
            <CardContent className="pt-6 text-center">
                <p className="text-lg text-muted-foreground">Please <a href="/login" className="text-primary underline">log in</a> to use the generator.</p>
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
            </CardHeader>
            <CardContent className="space-y-6">
               <div className="space-y-2">
                <Label htmlFor="job-description-content" className="font-medium text-foreground">Job Description Content</Label>
                <Textarea
                  id="job-description-content"
                  value={jdContent}
                  onChange={(e) => setJdContent(e.target.value)}
                  placeholder="Paste the full job description here..."
                  className="min-h-[200px]"
                  disabled={isProcessing}
                />
              </div>

              <div className="space-y-2">
                 <Label htmlFor="job-description-upload" className="text-sm text-muted-foreground">Or upload a file to fill automatically</Label>
                <FileUploadArea
                  onFilesUpload={handleJobDescriptionUpload}
                  acceptedFileTypes={{ 
                    "application/pdf": [".pdf"], "text/plain": [".txt"], "text/markdown": [".md"],
                    "application/msword": [".doc"], "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"]
                  }}
                  multiple={false}
                  label="PDF, TXT, DOC, DOCX, MD (Max 5MB)"
                  id="job-description-upload"
                  maxSizeInBytes={MAX_FILE_SIZE_BYTES}
                />
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="roleTitle" className="font-medium text-foreground">Role Title (Optional)</Label>
                  <Input 
                    id="roleTitle" 
                    value={roleTitle} 
                    onChange={(e) => setRoleTitle(e.target.value)} 
                    placeholder="e.g., Senior Software Engineer"
                    disabled={isProcessing}
                  />
                  <p className="text-xs text-muted-foreground">Confirm or edit the job title. Helps generate specific questions.</p>
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
              </div>
              
              <Button 
                onClick={handleGenerateQuestions} 
                disabled={isProcessing || !jdContent.trim()}
                size="lg"
                className="w-full md:w-auto bg-accent hover:bg-accent/90 text-accent-foreground shadow-md hover:shadow-lg transition-all"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <Lightbulb className="w-5 h-5 mr-2" />
                )}
                Generate Questions
              </Button>
            </CardContent>
          </Card>

          <div ref={resultsSectionRef}>
            {isProcessing && !generatedQuestions && (
              <Card className="shadow-lg bg-card">
                <CardContent className="pt-6 flex flex-col items-center justify-center space-y-4 min-h-[200px]">
                  <Loader2 className="w-12 h-12 animate-spin text-primary" />
                  <p className="text-lg text-muted-foreground">
                    AI is processing and crafting questions...
                  </p>
                  <p className="text-sm text-muted-foreground">This may take a moment.</p>
                </CardContent>
              </Card>
            )}

            {error && !isLoading && (
              <Alert variant="destructive" className="shadow-md">
                <AlertTitle className="font-semibold">Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {generatedQuestions && !isLoading && (
              <div className="space-y-6 mt-8">
                <Separator />
                <h2 className="text-xl font-semibold text-foreground font-headline text-center md:text-left">
                  Interview Questions for {generatedQuestions.roleTitle ? <span className="text-primary">{generatedQuestions.roleTitle}</span> : 'the Provided Job Description'}
                </h2>
                 <p className="text-sm text-muted-foreground text-center md:text-left">
                    {generatedQuestions.focusAreas && `Focusing on: ${generatedQuestions.focusAreas}.`}
                 </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {questionCategories.map(({key, title, icon: Icon}) => {
                    const questions = generatedQuestions[key as keyof typeof generatedQuestions];
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
             {!isProcessing && !generatedQuestions && !error && (
                 <Card className="shadow-lg transition-shadow duration-300 hover:shadow-xl">
                    <CardContent className="pt-6">
                        <p className="text-center text-muted-foreground py-8">
                           Enter a job description or upload a file to get started.
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
