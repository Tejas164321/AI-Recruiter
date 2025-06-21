
"use client";

import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileUploadArea } from "@/components/file-upload-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { generateJDInterviewQuestions, type GenerateJDInterviewQuestionsInput } from "@/ai/flows/generate-jd-interview-questions";
import { extractJobRoles as extractJobRolesAI, type ExtractJobRolesInput as ExtractJobRolesAIInput, type ExtractJobRolesOutput as ExtractJobRolesAIOutput } from "@/ai/flows/extract-job-roles";
import type { InterviewQuestionsSet } from "@/lib/types";
import { HelpCircle, Loader2, Lightbulb, FileText, ScrollText, Users, Brain, SearchCheck, UploadCloud, PlusCircle, Trash2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { motion } from "framer-motion";
import { useLoading } from "@/contexts/loading-context";
import { useAuth } from "@/contexts/auth-context";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

const cardHoverVariants = {
  hover: { scale: 1.02, y: -5, boxShadow: "0px 12px 28px hsla(var(--primary), 0.25)", transition: { type: "spring", stiffness: 280, damping: 18 } },
  initial: { scale: 1, y: 0, boxShadow: "0px 6px 18px hsla(var(--primary), 0.1)" }
};

interface SessionEntry {
  id: string; // client-side UUID
  jdContent: string;
  roleTitle: string;
  focusAreas: string;
  questions: Omit<InterviewQuestionsSet, 'id' | 'userId' | 'createdAt'> | null;
}

export default function InterviewQuestionGeneratorPage() {
  const { setIsPageLoading } = useLoading();
  const { currentUser } = useAuth();
  const { toast } = useToast();
  
  const [sessionEntries, setSessionEntries] = useState<SessionEntry[]>([]);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const resultsSectionRef = useRef<HTMLDivElement | null>(null);
  
  // Initialize with a single blank entry on first load
  useEffect(() => {
    setIsPageLoading(false);
    if (sessionEntries.length === 0) {
      const newId = crypto.randomUUID();
      setSessionEntries([{ id: newId, jdContent: '', roleTitle: '', focusAreas: '', questions: null }]);
      setSelectedEntryId(newId);
    }
  }, [setIsPageLoading, sessionEntries.length]);

  const currentEntry = useMemo(() => {
    return sessionEntries.find(e => e.id === selectedEntryId);
  }, [sessionEntries, selectedEntryId]);

  useEffect(() => {
    // Only scroll when the AI is actively processing.
    // This prevents the page from jumping when just selecting an existing entry.
    if (isLoading && resultsSectionRef.current) {
        const timer = setTimeout(() => {
            resultsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start'});
        }, 100);
        return () => clearTimeout(timer);
    }
  }, [isLoading]);
  
  const handleInputChange = (field: keyof Omit<SessionEntry, 'id' | 'questions'>, value: string) => {
    setSessionEntries(prev => prev.map(entry => 
      entry.id === selectedEntryId ? { ...entry, [field]: value } : entry
    ));
  };
  
  const handleAddNewEntry = () => {
    const newId = crypto.randomUUID();
    const newEntry: SessionEntry = { id: newId, jdContent: '', roleTitle: '', focusAreas: '', questions: null };
    setSessionEntries(prev => [...prev, newEntry]);
    setSelectedEntryId(newId);
  };
  
  const handleDeleteEntry = () => {
    if (sessionEntries.length <= 1 || !selectedEntryId) return; // Cannot delete the last entry
    const newEntries = sessionEntries.filter(e => e.id !== selectedEntryId);
    setSessionEntries(newEntries);
    setSelectedEntryId(newEntries[0]?.id || null);
  };

  const handleJobDescriptionUpload = useCallback(async (files: File[]) => {
     if (!currentUser?.uid) {
      toast({ title: "Not Authenticated", description: "Please log in to upload files.", variant: "destructive" });
      return;
    }
    if (files.length === 0 || !selectedEntryId) return;

    const file = files[0];
    const dataUri = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
    
    setIsLoading(true);
    setError(null);
    setSessionEntries(prev => prev.map(e => e.id === selectedEntryId ? {...e, questions: null} : e));

    try {
      const extractionInput: ExtractJobRolesAIInput = {
        jobDescriptionDocuments: [{ name: file.name, dataUri }],
      };
      const extractionOutput: ExtractJobRolesAIOutput = await extractJobRolesAI(extractionInput);
      
      let newJdContent = "";
      let newRoleTitle = "";

      if (extractionOutput.length > 0 && extractionOutput[0].contentDataUri) {
        const firstRole = extractionOutput[0];
        
        const base64 = firstRole.contentDataUri.split(',')[1];
        if (base64) {
            const decodedText = Buffer.from(base64, 'base64').toString('utf-8');
            newJdContent = decodedText;
        }
        
        if (firstRole.name && firstRole.name !== "Untitled Job Role" && !firstRole.name.startsWith("Job Role")) {
          newRoleTitle = firstRole.name;
          toast({ title: "Content & Title Extracted", description: `Extracted JD content and suggested role title: "${firstRole.name}".`});
        } else {
          toast({ title: "Content Extracted", description: "JD content has been extracted. Please provide a role title if needed." });
        }
      } else {
         toast({ title: "Extraction Failed", description: "Could not extract content from the document.", variant: "destructive"});
      }
      
      setSessionEntries(prev => prev.map(entry =>
        entry.id === selectedEntryId ? { ...entry, jdContent: newJdContent, roleTitle: newRoleTitle } : entry
      ));

    } catch (extractError) {
      const message = extractError instanceof Error ? extractError.message : String(extractError);
      console.error("Failed to extract content:", extractError);
      toast({ title: "File Processing Failed", description: message.substring(0,100), variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast, currentUser?.uid, selectedEntryId]);

  const handleGenerateQuestions = useCallback(async () => {
    if (!currentUser?.uid) {
      toast({ title: "Not Authenticated", description: "Please log in to generate questions.", variant: "destructive" });
      return;
    }
    if (!currentEntry || !currentEntry.jdContent.trim()) {
      toast({ title: "Missing Job Description", description: "Please enter or upload a job description.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { jdContent, roleTitle, focusAreas } = currentEntry;
      const contentDataUri = `data:text/plain;charset=utf-8;base64,${Buffer.from(jdContent).toString('base64')}`;

      const input: GenerateJDInterviewQuestionsInput = {
        jobDescriptionDataUri: contentDataUri,
        roleTitle: roleTitle.trim() || undefined,
        focusAreas: focusAreas.trim() || undefined,
      };
      const aiOutput = await generateJDInterviewQuestions(input);
      
      const questionsSet = {
        roleTitle: roleTitle.trim(),
        jobDescriptionDataUri: contentDataUri,
        ...aiOutput,
        ...(focusAreas.trim() && { focusAreas: focusAreas.trim() }),
      };
      
      setSessionEntries(prev => prev.map(e => e.id === selectedEntryId ? {...e, questions: questionsSet} : e));
      toast({ title: "Questions Generated", description: "Your interview questions are ready." });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
      setError(`Failed to generate questions: ${errorMessage.substring(0,100)}`);
      toast({ title: "Generation Failed", description: errorMessage.substring(0,100), variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [currentEntry, toast, currentUser?.uid, selectedEntryId]);

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
            Manage multiple job descriptions in a single session. Upload or paste a JD, generate questions, and switch between them. Data is cleared on page refresh.
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
          <Card className="p-4 shadow-lg">
            <div className="flex items-center gap-2">
              <Label htmlFor="session-select" className="text-sm font-medium whitespace-nowrap">Current JD:</Label>
              <Select value={selectedEntryId || ''} onValueChange={setSelectedEntryId} disabled={isProcessing}>
                <SelectTrigger id="session-select" className="flex-grow">
                  <SelectValue placeholder="Select a job description..." />
                </SelectTrigger>
                <SelectContent>
                  {sessionEntries.map((entry, index) => (
                    <SelectItem key={entry.id} value={entry.id}>
                      {entry.roleTitle.trim() || `Untitled JD ${index + 1}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={handleAddNewEntry} disabled={isProcessing} aria-label="Add new job description">
                <PlusCircle className="w-5 h-5"/>
              </Button>
              <Button variant="outline" size="icon" onClick={handleDeleteEntry} disabled={isProcessing || sessionEntries.length <= 1} aria-label="Delete current job description">
                <Trash2 className="w-5 h-5"/>
              </Button>
            </div>
          </Card>

          <div className="flex flex-col md:flex-row gap-8">
            <div className="flex-1">
              <Card className="shadow-lg transition-shadow duration-300 hover:shadow-xl h-full">
                <CardHeader>
                  <CardTitle className="flex items-center text-xl font-headline">
                    <FileText className="w-6 h-6 mr-2 text-primary" />
                    Job Description & Context
                  </CardTitle>
                  <CardDescription>
                    Paste the job description below and optionally add a role title and key focus areas.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="job-description-content" className="font-medium text-foreground">Job Description Content</Label>
                    <Textarea
                      id="job-description-content"
                      value={currentEntry?.jdContent || ''}
                      onChange={(e) => handleInputChange('jdContent', e.target.value)}
                      placeholder="Paste the full job description here..."
                      className="min-h-[200px]"
                      disabled={isProcessing}
                    />
                  </div>
                  <Separator />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="roleTitle" className="font-medium text-foreground">Role Title (Optional)</Label>
                      <Input 
                        id="roleTitle" 
                        value={currentEntry?.roleTitle || ''} 
                        onChange={(e) => handleInputChange('roleTitle', e.target.value)} 
                        placeholder="e.g., Senior Software Engineer"
                        disabled={isProcessing}
                      />
                      <p className="text-xs text-muted-foreground">Helps generate specific questions.</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="focusAreas" className="font-medium text-foreground">Key Focus Areas/Skills (Optional)</Label>
                      <Input 
                        id="focusAreas" 
                        value={currentEntry?.focusAreas || ''} 
                        onChange={(e) => handleInputChange('focusAreas', e.target.value)} 
                        placeholder="e.g., JavaScript, Team Leadership"
                        disabled={isProcessing}
                      />
                      <p className="text-xs text-muted-foreground">Comma-separated list of areas to emphasize.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            <div className="flex-1">
              <Card className="shadow-lg transition-shadow duration-300 hover:shadow-xl h-full">
                <CardHeader>
                  <CardTitle className="flex items-center text-xl font-headline">
                    <UploadCloud className="w-6 h-6 mr-2 text-primary" />
                    Or Upload a File
                  </CardTitle>
                  <CardDescription>
                    Upload a JD file (PDF, DOCX, etc.) to automatically fill the fields on the left.
                  </CardDescription>
                </CardHeader>
                <CardContent>
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
                </CardContent>
              </Card>
            </div>
          </div>
          
          <div className="flex justify-center pt-4">
            <Button 
              onClick={handleGenerateQuestions} 
              disabled={isProcessing || !currentEntry?.jdContent.trim()}
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
          </div>

          <div ref={resultsSectionRef}>
            {isProcessing && !currentEntry?.questions && (
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

            {currentEntry?.questions && !isLoading && (
              <div className="space-y-6 mt-8">
                <Separator />
                <h2 className="text-xl font-semibold text-foreground font-headline text-center md:text-left">
                  Interview Questions for {currentEntry.questions.roleTitle ? <span className="text-primary">{currentEntry.questions.roleTitle}</span> : 'the Provided Job Description'}
                </h2>
                 {currentEntry.questions.focusAreas && (
                  <p className="text-sm text-muted-foreground text-center md:text-left">
                    Focusing on: {currentEntry.questions.focusAreas}
                  </p>
                 )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {questionCategories.map(({key, title, icon: Icon}) => {
                    const questions = currentEntry.questions?.[key as keyof typeof currentEntry.questions];
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
             {!isProcessing && !currentEntry?.questions && !error && (
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

    