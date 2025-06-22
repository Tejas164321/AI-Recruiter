
"use client";

import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
// UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileUploadArea } from "@/components/file-upload-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
// Icons
import { HelpCircle, Loader2, Lightbulb, FileText, ScrollText, Users, Brain, SearchCheck, UploadCloud, PlusCircle, Trash2, Download } from "lucide-react";
// Hooks and Contexts
import { useToast } from "@/hooks/use-toast";
import { useLoading } from "@/contexts/loading-context";
import { useAuth } from "@/contexts/auth-context";
// AI Flows and Types
import { generateJDInterviewQuestions, type GenerateJDInterviewQuestionsInput } from "@/ai/flows/generate-jd-interview-questions";
import { extractJobRoles as extractJobRolesAI, type ExtractJobRolesInput as ExtractJobRolesAIInput, type ExtractJobRolesOutput as ExtractJobRolesAIOutput } from "@/ai/flows/extract-job-roles";
import type { InterviewQuestionsSet } from "@/lib/types";
// Animation and PDF library
import { motion } from "framer-motion";
import jsPDF from 'jspdf';

// Constants
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

// Animation variants for cards
const cardHoverVariants = {
  hover: { scale: 1.02, y: -5, boxShadow: "0px 12px 28px hsla(var(--primary), 0.25)", transition: { type: "spring", stiffness: 280, damping: 18 } },
  initial: { scale: 1, y: 0, boxShadow: "0px 6px 18px hsla(var(--primary), 0.1)" }
};

// Interface for managing a single session entry (one job description and its generated questions)
interface SessionEntry {
  id: string; // client-side UUID
  jdContent: string;
  roleTitle: string;
  focusAreas: string;
  questions: Omit<InterviewQuestionsSet, 'id' | 'userId' | 'createdAt'> | null;
}

/**
 * Interview Question Generator Page Component.
 * This page allows users to upload or paste job descriptions to generate tailored interview questions.
 * It supports managing multiple JDs within a single browser session.
 */
export default function InterviewQuestionGeneratorPage() {
  const { setIsPageLoading } = useLoading();
  const { currentUser } = useAuth();
  const { toast } = useToast();
  
  // State to manage multiple JD sessions. Data is lost on page refresh.
  const [sessionEntries, setSessionEntries] = useState<SessionEntry[]>([]);
  // State to track which session is currently active.
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  
  // State for loading indicators
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  // State for displaying errors
  const [error, setError] = useState<string | null>(null);

  // Ref for scrolling to the results section
  const resultsSectionRef = useRef<HTMLDivElement | null>(null);
  
  // Effect to initialize the page with a single blank session entry on first load
  useEffect(() => {
    setIsPageLoading(false);
    if (sessionEntries.length === 0) {
      const newId = crypto.randomUUID();
      setSessionEntries([{ id: newId, jdContent: '', roleTitle: '', focusAreas: '', questions: null }]);
      setSelectedEntryId(newId);
    }
  }, [setIsPageLoading, sessionEntries.length]);

  // Memoized value to get the currently selected session entry object
  const currentEntry = useMemo(() => {
    return sessionEntries.find(e => e.id === selectedEntryId);
  }, [sessionEntries, selectedEntryId]);

  // Effect to scroll to the results section when AI processing starts
  useEffect(() => {
    if (isLoading && resultsSectionRef.current) {
        const timer = setTimeout(() => {
            resultsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start'});
        }, 100);
        return () => clearTimeout(timer);
    }
  }, [isLoading]);
  
  // Handler for updating input fields of the current session entry
  const handleInputChange = (field: keyof Omit<SessionEntry, 'id' | 'questions'>, value: string) => {
    setSessionEntries(prev => prev.map(entry => 
      entry.id === selectedEntryId ? { ...entry, [field]: value } : entry
    ));
  };
  
  // Handler to add a new, blank session entry
  const handleAddNewEntry = () => {
    const newId = crypto.randomUUID();
    const newEntry: SessionEntry = { id: newId, jdContent: '', roleTitle: '', focusAreas: '', questions: null };
    setSessionEntries(prev => [...prev, newEntry]);
    setSelectedEntryId(newId);
  };
  
  // Handler to delete the currently selected session entry
  const handleDeleteEntry = () => {
    if (sessionEntries.length <= 1 || !selectedEntryId) return; // Prevent deleting the last entry
    const newEntries = sessionEntries.filter(e => e.id !== selectedEntryId);
    setSessionEntries(newEntries);
    setSelectedEntryId(newEntries[0]?.id || null); // Select the first remaining entry
  };

  // Callback to handle file upload and extract job description content and title
  const handleJobDescriptionUpload = useCallback(async (files: File[]) => {
     if (!currentUser?.uid) {
      toast({ title: "Not Authenticated", description: "Please log in to upload files.", variant: "destructive" });
      return;
    }
    if (files.length === 0 || !selectedEntryId) return;

    const file = files[0];
    // Convert file to data URI for the AI flow
    const dataUri = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
    
    setIsLoading(true);
    setError(null);
    // Clear previous questions for the current entry
    setSessionEntries(prev => prev.map(e => e.id === selectedEntryId ? {...e, questions: null} : e));

    try {
      const extractionInput: ExtractJobRolesAIInput = { jobDescriptionDocuments: [{ name: file.name, dataUri }] };
      const extractionOutput: ExtractJobRolesAIOutput = await extractJobRolesAI(extractionInput);
      
      let newJdContent = "";
      let newRoleTitle = "";

      if (extractionOutput.length > 0 && extractionOutput[0].contentDataUri) {
        const firstRole = extractionOutput[0];
        
        // Decode the content from the data URI returned by the AI
        const base64 = firstRole.contentDataUri.split(',')[1];
        if (base64) {
            const decodedText = Buffer.from(base64, 'base64').toString('utf-8');
            newJdContent = decodedText;
        }
        
        // Use the extracted title if it's meaningful
        if (firstRole.name && firstRole.name !== "Untitled Job Role" && !firstRole.name.startsWith("Job Role")) {
          newRoleTitle = firstRole.name;
          toast({ title: "Content & Title Extracted", description: `Extracted JD and title: "${firstRole.name}".`});
        } else {
          toast({ title: "Content Extracted", description: "JD content has been extracted." });
        }
      } else {
         toast({ title: "Extraction Failed", description: "Could not extract content from the document.", variant: "destructive"});
      }
      
      // Update the current session entry with the extracted data
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

  // Callback to generate interview questions using the AI flow
  const handleGenerateQuestions = useCallback(async () => {
    if (!currentUser?.uid) {
      toast({ title: "Not Authenticated", description: "Please log in.", variant: "destructive" });
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
      // Convert the text content to a data URI for the AI flow
      const contentDataUri = `data:text/plain;charset=utf-8;base64,${Buffer.from(jdContent).toString('base64')}`;

      const input: GenerateJDInterviewQuestionsInput = {
        jobDescriptionDataUri: contentDataUri,
        roleTitle: roleTitle.trim() || undefined,
        focusAreas: focusAreas.trim() || undefined,
      };
      const aiOutput = await generateJDInterviewQuestions(input);
      
      // Structure the output to be stored in the session state
      const questionsSet = {
        roleTitle: roleTitle.trim(),
        jobDescriptionDataUri: contentDataUri,
        ...aiOutput,
        ...(focusAreas.trim() && { focusAreas: focusAreas.trim() }),
      };
      
      // Update the current session entry with the generated questions
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

  // Handler to generate and download a PDF of the questions
  const handleDownloadPdf = () => {
    if (!currentEntry?.questions) return;
    setIsDownloading(true);

    try {
        const pdf = new jsPDF('p', 'pt', 'a4');
        const { questions } = currentEntry;
        const pageMargin = 40;
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const contentWidth = pageWidth - (pageMargin * 2);
        let yPos = pageMargin;

        // Function to check if a page break is needed and add one if so
        const checkPageBreak = (neededHeight: number) => {
            if (yPos + neededHeight > pageHeight - pageMargin) {
                pdf.addPage();
                yPos = pageMargin;
            }
        };

        // PDF Title and Subtitle
        pdf.setFontSize(22);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(getComputedStyle(document.documentElement).getPropertyValue('--primary')); // Use theme color
        pdf.text(`Interview Questions`, pageWidth / 2, yPos, { align: 'center' });
        yPos += 30;

        pdf.setFontSize(16);
        pdf.setTextColor('#000000');
        pdf.text(`Role: ${questions.roleTitle || 'General'}`, pageWidth / 2, yPos, { align: 'center' });
        yPos += 20;

        if (questions.focusAreas) {
            pdf.setFontSize(12);
            pdf.setFont('helvetica', 'italic');
            pdf.text(`Focus Areas: ${questions.focusAreas}`, pageWidth / 2, yPos, { align: 'center' });
            yPos += 25;
        }

        pdf.setDrawColor('#cccccc');
        pdf.line(pageMargin, yPos, pageWidth - pageMargin, yPos);
        yPos += 20;

        // Question Categories
        const questionCategoriesToRender: Array<{key: keyof typeof questions, title: string}> = [
            { key: "technicalQuestions", title: "Technical Questions" },
            { key: "behavioralQuestions", title: "Behavioral Questions" },
            { key: "situationalQuestions", title: "Situational Questions" },
            { key: "roleSpecificQuestions", title: "Role-Specific Questions" },
        ];
        
        // Loop through categories and render questions
        questionCategoriesToRender.forEach(({ key, title }) => {
            const questionList = questions[key];
            if (questionList && Array.isArray(questionList) && questionList.length > 0) {
                checkPageBreak(30); 
                pdf.setFontSize(14);
                pdf.setFont('helvetica', 'bold');
                pdf.setTextColor(getComputedStyle(document.documentElement).getPropertyValue('--accent'));
                pdf.text(title, pageMargin, yPos);
                yPos += 20;
                
                pdf.setFontSize(11);
                pdf.setFont('helvetica', 'normal');
                pdf.setTextColor('#000000');

                questionList.forEach(q => {
                    const splitText = pdf.splitTextToSize(`•  ${q}`, contentWidth - 10);
                    checkPageBreak(splitText.length * 12);
                    pdf.text(splitText, pageMargin + 10, yPos);
                    yPos += splitText.length * 12 + 5;
                });
                yPos += 15;
            }
        });

        const fileName = `Interview_Questions_${(questions.roleTitle || 'General').replace(/\s+/g, '_')}.pdf`;
        pdf.save(fileName);

    } catch (err) {
        console.error("PDF Generation Error:", err);
        toast({ title: "PDF Generation Failed", description: "An error occurred while creating the PDF.", variant: "destructive" });
    } finally {
        setIsDownloading(false);
    }
  };

  // Data structure for rendering question categories
  const questionCategories: Array<{key: keyof Omit<InterviewQuestionsSet, 'id'|'userId'|'createdAt'|'roleTitle'>, title: string, icon: React.ElementType}> = [
    { key: "technicalQuestions", title: "Technical Questions", icon: Brain },
    { key: "behavioralQuestions", title: "Behavioral Questions", icon: Users },
    { key: "situationalQuestions", title: "Situational Questions", icon: HelpCircle },
    { key: "roleSpecificQuestions", title: "Role-Specific Questions", icon: ScrollText },
  ];
  
  const isProcessing = isLoading;

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-8">
      {/* Page Header */}
      <Card className="mb-8 shadow-md">
        <CardHeader>
          <CardTitle className="text-2xl font-headline text-primary flex items-center"><SearchCheck className="w-7 h-7 mr-3" /> AI Interview Question Generator</CardTitle>
          <CardDescription>Manage multiple job descriptions in a single session. Upload or paste a JD, generate questions, and switch between them. Data is cleared on page refresh.</CardDescription>
        </CardHeader>
      </Card>
      
       {/* Authentication Gate */}
       {!currentUser && (
        <Card className="shadow-lg"><CardContent className="pt-6 text-center"><p className="text-lg text-muted-foreground">Please <a href="/login" className="text-primary underline">log in</a> to use the generator.</p></CardContent></Card>
      )}

      {/* Main Content */}
      {currentUser && (
        <>
          {/* Input Section (JD Paste and Upload) */}
          <div className="flex flex-col md:flex-row gap-8">
            <div className="flex-1">
              <Card className="shadow-lg h-full">
                <CardHeader>
                  <CardTitle className="flex items-center text-xl font-headline"><FileText className="w-6 h-6 mr-2 text-primary" />Job Description & Context</CardTitle>
                  <CardDescription>Paste the job description below or upload a file.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* JD Content Textarea */}
                  <div className="space-y-2">
                    <Label htmlFor="job-description-content">Job Description Content</Label>
                    <Textarea id="job-description-content" value={currentEntry?.jdContent || ''} onChange={(e) => handleInputChange('jdContent', e.target.value)} placeholder="Paste the full job description here..." className="min-h-[200px]" disabled={isProcessing}/>
                  </div>
                  <Separator />
                  {/* Optional Context Inputs */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="roleTitle">Role Title (Optional)</Label>
                      <Input id="roleTitle" value={currentEntry?.roleTitle || ''} onChange={(e) => handleInputChange('roleTitle', e.target.value)} placeholder="e.g., Senior Software Engineer" disabled={isProcessing}/>
                      <p className="text-xs text-muted-foreground">Helps generate more specific questions.</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="focusAreas">Key Focus Areas (Optional)</Label>
                      <Input id="focusAreas" value={currentEntry?.focusAreas || ''} onChange={(e) => handleInputChange('focusAreas', e.target.value)} placeholder="e.g., JavaScript, Team Leadership" disabled={isProcessing}/>
                      <p className="text-xs text-muted-foreground">Comma-separated skills to emphasize.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            <div className="flex-1">
              <Card className="shadow-lg h-full flex flex-col">
                <CardHeader>
                  <CardTitle className="flex items-center text-xl font-headline"><UploadCloud className="w-6 h-6 mr-2 text-primary" />Or Upload a File</CardTitle>
                  <CardDescription>The AI will extract the content and title for you.</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow flex flex-col">
                  <FileUploadArea onFilesUpload={handleJobDescriptionUpload} acceptedFileTypes={{ "application/pdf": [".pdf"], "text/plain": [".txt"],"application/msword": [".doc"], "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"]}} multiple={false} label="PDF, TXT, DOC, DOCX (Max 5MB)" id="job-description-upload" maxSizeInBytes={MAX_FILE_SIZE_BYTES} dropzoneClassName="h-full" showFileList={false}/>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Session Management and Generation Button */}
          <Card className="p-6 shadow-lg">
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <Label htmlFor="session-select" className="text-sm whitespace-nowrap self-center">Current JD Session:</Label>
                <Select value={selectedEntryId || ''} onValueChange={setSelectedEntryId} disabled={isProcessing}>
                  <SelectTrigger id="session-select" className="flex-grow"><SelectValue placeholder="Select a job description..." /></SelectTrigger>
                  <SelectContent>
                    {sessionEntries.map((entry, index) => (<SelectItem key={entry.id} value={entry.id}>{entry.roleTitle.trim() || `Untitled JD ${index + 1}`}</SelectItem>))}
                  </SelectContent>
                </Select>
                <div className="flex gap-2">
                    <Button variant="outline" size="icon" onClick={handleAddNewEntry} disabled={isProcessing} aria-label="Add new JD session"><PlusCircle className="w-5 h-5"/></Button>
                    <Button variant="outline" size="icon" onClick={handleDeleteEntry} disabled={isProcessing || sessionEntries.length <= 1} aria-label="Delete current JD session"><Trash2 className="w-5 h-5"/></Button>
                </div>
              </div>
              <Separator />
              <div className="flex justify-center pt-2">
                <Button onClick={handleGenerateQuestions} disabled={isProcessing || !currentEntry?.jdContent.trim()} size="lg" className="w-full md:w-auto bg-accent hover:bg-accent/90 text-accent-foreground shadow-md">
                  {isLoading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Lightbulb className="w-5 h-5 mr-2" />}
                  Generate Questions
                </Button>
              </div>
            </div>
          </Card>
          
          {/* Results Section */}
          <div ref={resultsSectionRef}>
            {/* Loading State */}
            {isProcessing && !currentEntry?.questions && (
              <Card className="shadow-lg"><CardContent className="pt-6 flex flex-col items-center justify-center space-y-4 min-h-[200px]"><Loader2 className="w-12 h-12 animate-spin text-primary" /><p className="text-lg text-muted-foreground">AI is crafting questions...</p></CardContent></Card>
            )}
            {/* Error State */}
            {error && !isLoading && (
              <Alert variant="destructive" className="shadow-md"><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>
            )}
            {/* Success State */}
            {currentEntry?.questions && !isLoading && (
              <div className="space-y-6 mt-8">
                <div className="p-4 bg-background">
                  <Separator />
                  <div className="flex flex-col sm:flex-row justify-between items-center py-4 gap-4">
                    <h2 className="text-xl font-semibold text-foreground font-headline text-center md:text-left">
                      Interview Questions for {currentEntry.questions.roleTitle ? <span className="text-primary">{currentEntry.questions.roleTitle}</span> : 'the Role'}
                    </h2>
                     <Button onClick={handleDownloadPdf} disabled={isDownloading} variant="outline" size="sm">
                        {isDownloading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                        Download PDF
                      </Button>
                  </div>
                   {currentEntry.questions.focusAreas && (<p className="text-sm text-muted-foreground text-center md:text-left pb-4">Focusing on: {currentEntry.questions.focusAreas}</p>)}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {questionCategories.map(({key, title, icon: Icon}) => {
                      const questions = currentEntry.questions?.[key as keyof typeof currentEntry.questions];
                      if (questions && Array.isArray(questions) && questions.length > 0) {
                        return (
                          <motion.div key={key} initial="initial" whileHover="hover" variants={cardHoverVariants} className="h-full">
                            <Card className="bg-card flex flex-col h-full">
                              <CardHeader className="pb-3"><CardTitle className="flex items-center text-lg text-primary"><Icon className="w-5 h-5 mr-2.5 shrink-0" />{title}</CardTitle></CardHeader>
                              <CardContent className="flex-grow pt-0">
                                <ul className="list-disc pl-5 space-y-2.5 text-sm text-foreground">
                                  {questions.map((q, index) => (<li key={index} className="leading-relaxed">{q}</li>))}
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
              </div>
            )}
             {/* Initial Placeholder State */}
             {!isProcessing && !currentEntry?.questions && !error && (
                 <Card className="shadow-lg"><CardContent className="pt-6"><p className="text-center text-muted-foreground py-8">Enter a job description to get started.</p></CardContent></Card>
            )}
          </div>
        </>
      )}
    </div>
  );
}
