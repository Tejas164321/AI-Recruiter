
"use client";

import React, { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileUploadArea } from "@/components/file-upload-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { generateJDInterviewQuestions, type GenerateJDInterviewQuestionsInput, type GenerateJDInterviewQuestionsOutput } from "@/ai/flows/generate-jd-interview-questions";
import { extractJobRoles, type ExtractJobRolesInput, type ExtractJobRolesOutput } from "@/ai/flows/extract-job-roles";
import type { JobDescriptionFile } from "@/lib/types";
import { HelpCircle, Loader2, Lightbulb, FileText, ScrollText, Users, Brain, SearchCheck } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { motion } from "framer-motion";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

interface CategorizedQuestions extends GenerateJDInterviewQuestionsOutput {}

const cardHoverVariants = {
  hover: {
    scale: 1.02,
    y: -5,
    boxShadow: "0px 12px 28px hsla(var(--primary), 0.25)",
    transition: { type: "spring", stiffness: 280, damping: 18 }
  },
  initial: {
    scale: 1,
    y: 0,
    boxShadow: "0px 6px 18px hsla(var(--primary), 0.1)"
  }
};

export default function InterviewQuestionGeneratorPage() {
  const [jobDescriptionFile, setJobDescriptionFile] = useState<JobDescriptionFile | null>(null);
  const [roleTitle, setRoleTitle] = useState<string>("");
  const [focusAreas, setFocusAreas] = useState<string>("");
  
  const [generatedQuestions, setGeneratedQuestions] = useState<CategorizedQuestions | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isExtractingTitle, setIsExtractingTitle] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const { toast } = useToast();

  const handleJobDescriptionUpload = useCallback(async (files: File[]) => {
    if (files.length === 0) {
      setJobDescriptionFile(null);
      setRoleTitle(""); // Clear role title if file is removed
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
    setGeneratedQuestions(null); // Reset questions when new JD is uploaded
    setError(null);
    setRoleTitle(""); // Clear previous role title

    // Attempt to extract role title
    setIsExtractingTitle(true);
    try {
      const extractionInput: ExtractJobRolesInput = {
        jobDescriptionDocuments: [{ name: newJdFile.name, dataUri: newJdFile.dataUri }],
      };
      const extractionOutput: ExtractJobRolesOutput = await extractJobRoles(extractionInput);
      if (extractionOutput.length > 0 && extractionOutput[0].name && 
          extractionOutput[0].name !== "Untitled Job Role" && 
          !extractionOutput[0].name.startsWith("Job Role")) {
        setRoleTitle(extractionOutput[0].name);
        toast({ title: "Role Title Suggested", description: `Extracted "${extractionOutput[0].name}" from the document. You can edit if needed.`, variant: "default"});
      } else {
         toast({ title: "Role Title Not Found", description: "Could not automatically extract a specific role title. Please enter manually.", variant: "default"});
      }
    } catch (extractError) {
      console.error("Failed to extract role title:", extractError);
      toast({ title: "Title Extraction Failed", description: "Could not automatically extract role title. Please enter manually.", variant: "destructive" });
    } finally {
      setIsExtractingTitle(false);
    }
  }, [toast]);

  const handleGenerateQuestions = useCallback(async () => {
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
    setGeneratedQuestions(null);

    try {
      const input: GenerateJDInterviewQuestionsInput = {
        jobDescriptionDataUri: jobDescriptionFile.dataUri,
        roleTitle: roleTitle.trim(),
        focusAreas: focusAreas.trim() || undefined,
      };
      const output = await generateJDInterviewQuestions(input);
      setGeneratedQuestions(output);
      toast({ title: "Questions Generated", description: "Interview questions are ready below." });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
      setError(`Failed to generate questions: ${errorMessage}`);
      toast({ title: "Generation Failed", description: errorMessage, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [jobDescriptionFile, roleTitle, focusAreas, toast]);

  const questionCategories: Array<{key: keyof CategorizedQuestions, title: string, icon: React.ElementType}> = [
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
            Upload a job description, confirm or enter the role title, and optionally specify focus areas to generate tailored interview questions, neatly categorized for your convenience.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card className="shadow-lg transition-shadow duration-300 hover:shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center text-xl font-headline">
            <FileText className="w-6 h-6 mr-2 text-primary" />
            Job Description & Context
          </CardTitle>
          <CardDescription>Provide the job details to tailor the interview questions.</CardDescription>
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
              placeholder="e.g., Senior Software Engineer (auto-fills from JD)"
              disabled={isLoading || isExtractingTitle}
              className={isExtractingTitle ? "bg-muted/50" : ""}
            />
            <p className="text-xs text-muted-foreground">Confirm or enter the job title. We&apos;ll try to extract it from the JD.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="focusAreas" className="font-medium text-foreground">Key Focus Areas/Skills (Optional)</Label>
            <Input 
              id="focusAreas" 
              value={focusAreas} 
              onChange={(e) => setFocusAreas(e.target.value)} 
              placeholder="e.g., JavaScript, Team Leadership, Project Management"
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">Comma-separated list of areas to emphasize for question generation.</p>
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
            Generate Questions
          </Button>
        </CardContent>
      </Card>

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
            Generated Interview Questions for <span className="text-primary">{roleTitle}</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {questionCategories.map(({key, title, icon: Icon}) => {
              const questions = generatedQuestions[key];
              if (questions && questions.length > 0) {
                return (
                  <motion.div
                    key={key}
                    initial="initial"
                    whileHover="hover"
                    variants={cardHoverVariants}
                  >
                    <Card className="shadow-md bg-card flex flex-col h-full"> {/* Removed hover:shadow-lg transition-shadow duration-300 */}
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
    </div>
  );
}
    
