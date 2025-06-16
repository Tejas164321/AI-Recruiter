
"use client";

import React, { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileUploadArea } from "@/components/file-upload-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { generateJDInterviewQuestions, type GenerateJDInterviewQuestionsInput, type GenerateJDInterviewQuestionsOutput } from "@/ai/flows/generate-jd-interview-questions";
import type { JobDescriptionFile } from "@/lib/types";
import { HelpCircle, Loader2, Lightbulb, FileText, ScrollText, Users, Brain } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

interface CategorizedQuestions extends GenerateJDInterviewQuestionsOutput {}

export default function InterviewQuestionGeneratorPage() {
  const [jobDescriptionFile, setJobDescriptionFile] = useState<JobDescriptionFile | null>(null);
  const [roleTitle, setRoleTitle] = useState<string>("");
  const [focusAreas, setFocusAreas] = useState<string>("");
  
  const [generatedQuestions, setGeneratedQuestions] = useState<CategorizedQuestions | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const { toast } = useToast();

  const handleJobDescriptionUpload = useCallback(async (files: File[]) => {
    if (files.length === 0) {
      setJobDescriptionFile(null);
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
    setJobDescriptionFile({ id: crypto.randomUUID(), file, dataUri, name: file.name });
    setGeneratedQuestions(null); // Reset questions when new JD is uploaded
    setError(null);
  }, []);

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
            <HelpCircle className="w-7 h-7 mr-3" /> AI Interview Question Generator
          </CardTitle>
          <CardDescription>
            Upload a job description, provide a role title, and optionally specify focus areas to generate tailored interview questions.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card className="shadow-lg transition-shadow duration-300 hover:shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center text-xl font-headline">
            <FileText className="w-6 h-6 mr-2 text-primary" />
            Job Description & Context
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="job-description-upload" className="font-medium">Upload Job Description</Label>
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
            <Label htmlFor="roleTitle" className="font-medium">Role Title</Label>
            <Input 
              id="roleTitle" 
              value={roleTitle} 
              onChange={(e) => setRoleTitle(e.target.value)} 
              placeholder="e.g., Senior Software Engineer, Marketing Manager"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="focusAreas" className="font-medium">Key Focus Areas/Skills (Optional)</Label>
            <Input 
              id="focusAreas" 
              value={focusAreas} 
              onChange={(e) => setFocusAreas(e.target.value)} 
              placeholder="e.g., JavaScript, Team Leadership, Project Management"
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">Comma-separated list of areas to emphasize.</p>
          </div>
          
          <Button 
            onClick={handleGenerateQuestions} 
            disabled={isLoading || !jobDescriptionFile || !roleTitle.trim()}
            size="lg"
            className="w-full md:w-auto bg-accent hover:bg-accent/90 text-accent-foreground"
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
        <Card className="shadow-lg">
          <CardContent className="pt-6 flex flex-col items-center justify-center space-y-4">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
            <p className="text-lg text-muted-foreground">AI is crafting questions...</p>
          </CardContent>
        </Card>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error Generating Questions</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {generatedQuestions && !isLoading && (
        <div className="space-y-6 mt-8">
          <Separator />
          <h2 className="text-xl font-semibold text-foreground font-headline text-center md:text-left">Generated Interview Questions for {roleTitle}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {questionCategories.map(({key, title, icon: Icon}) => {
              const questions = generatedQuestions[key];
              if (questions && questions.length > 0) {
                return (
                  <Card key={key} className="shadow-md hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <CardTitle className="flex items-center text-lg text-primary">
                        <Icon className="w-5 h-5 mr-2" />
                        {title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="list-disc pl-5 space-y-2 text-sm text-foreground">
                        {questions.map((q, index) => (
                          <li key={index}>{q}</li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
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
