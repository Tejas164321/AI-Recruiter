
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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
// Icons
import { HelpCircle, Loader2, Lightbulb, FileText, ScrollText, Users, Brain, SearchCheck, UploadCloud, PlusCircle, Trash2, Download, ServerOff } from "lucide-react";
// Hooks and Contexts
import { useToast } from "@/hooks/use-toast";
import { useLoading } from "@/contexts/loading-context";
import { useAuth } from "@/contexts/auth-context";
// AI Flows and Types
import { generateJDInterviewQuestions, type GenerateJDInterviewQuestionsInput } from "@/ai/flows/generate-jd-interview-questions";
import { extractJobRoles as extractJobRolesAI, type ExtractJobRolesInput as ExtractJobRolesAIInput, type ExtractJobRolesOutput as ExtractJobRolesAIOutput } from "@/ai/flows/extract-job-roles";
import type { InterviewQuestionsSet } from "@/lib/types";
// Firebase Services
import { saveInterviewQuestionSet, getInterviewQuestionSets, deleteInterviewQuestionSet } from "@/services/firestoreService";
import { db as firestoreDb } from "@/lib/firebase/config";
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

/**
 * Interface for the local state of the form, representing either a saved set or a new draft.
 */
interface FormState {
  id: string | null; // null for a new draft, otherwise the ID of the saved set
  jdContent: string;
  roleTitle: string;
  focusAreas: string;
  questions: Omit<InterviewQuestionsSet, 'id' | 'userId' | 'createdAt'> | null;
}

/**
 * The initial state for a new, blank form.
 */
const getInitialFormState = (): FormState => ({
  id: null,
  jdContent: '',
  roleTitle: '',
  focusAreas: '',
  questions: null,
});

/**
 * Interview Question Generator Page Component.
 * This page allows users to upload or paste job descriptions to generate tailored interview questions.
 * It now saves generated question sets to Firestore for persistence.
 */
export default function InterviewQuestionGeneratorPage() {
  const { setIsPageLoading } = useLoading();
  const { currentUser } = useAuth();
  const { toast } = useToast();
  
  // State for saved question sets fetched from Firestore
  const [savedSets, setSavedSets] = useState<InterviewQuestionsSet[]>([]);
  // State for the currently active form (either a draft or a selected saved set)
  const [activeForm, setActiveForm] = useState<FormState>(getInitialFormState());
  
  // State for loading indicators
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLoadingFromDB, setIsLoadingFromDB] = useState<boolean>(true);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  
  // State for modals and errors
  const [error, setError] = useState<string | null>(null);
  const [setToDelete, setSetToDelete] = useState<InterviewQuestionsSet | null>(null);

  // Ref for scrolling to the results section
  const resultsSectionRef = useRef<HTMLDivElement | null>(null);
  const isFirestoreAvailable = !!firestoreDb;

  // Effect to fetch saved question sets from Firestore on component mount or user change
  useEffect(() => {
    setIsPageLoading(false);
    if (currentUser && isFirestoreAvailable) {
      setIsLoadingFromDB(true);
      getInterviewQuestionSets()
        .then(sets => {
          setSavedSets(sets);
          // If there are saved sets, select the most recent one. Otherwise, start with a new draft.
          if (sets.length > 0) handleSelectSet(sets[0].id); else handleAddNewEntry();
        })
        .catch(err => {
          console.error("Error fetching question sets:", err);
          toast({ title: "Error Loading Data", description: "Could not load saved question sets.", variant: "destructive" });
        })
        .finally(() => setIsLoadingFromDB(false));
    } else {
        setIsLoadingFromDB(false);
        setSavedSets([]);
        handleAddNewEntry();
    }
  }, [currentUser, isFirestoreAvailable, setIsPageLoading, toast]);


  // Effect to scroll to the results section when AI processing starts
  useEffect(() => {
    if (isLoading && resultsSectionRef.current) {
        const timer = setTimeout(() => {
            resultsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start'});
        }, 100);
        return () => clearTimeout(timer);
    }
  }, [isLoading]);
  
  /**
   * Handler for updating input fields of the active form.
   * @param {keyof Omit<FormState, 'id' | 'questions'>} field - The field to update.
   * @param {string} value - The new value for the field.
   */
  const handleInputChange = (field: keyof Omit<FormState, 'id' | 'questions'>, value: string) => {
    setActiveForm(prev => ({ ...prev, [field]: value }));
  };
  
  /**
   * Handler to start a new, blank draft.
   */
  const handleAddNewEntry = () => {
    setActiveForm(getInitialFormState());
  };

  /**
   * Handler to select a saved question set from the dropdown, populating the form.
   * @param {string | null} setId - The ID of the set to select, or null to start a new entry.
   */
  const handleSelectSet = async (setId: string | null) => {
    if (!setId) {
      handleAddNewEntry();
      return;
    }
    const selected = savedSets.find(s => s.id === setId);
    if (selected) {
      let jdContent = "";
      if (selected.jobDescriptionDataUri) {
        try {
          const base64 = selected.jobDescriptionDataUri.split(',')[1];
          jdContent = Buffer.from(base64, 'base64').toString('utf-8');
        } catch (e) {
            console.error("Failed to decode JD content from data URI:", e);
            jdContent = "Could not load job description content.";
        }
      }
      setActiveForm({
        id: selected.id,
        jdContent: jdContent,
        roleTitle: selected.roleTitle,
        focusAreas: selected.focusAreas || '',
        questions: {
            technicalQuestions: selected.technicalQuestions,
            behavioralQuestions: selected.behavioralQuestions,
            situationalQuestions: selected.situationalQuestions,
            roleSpecificQuestions: selected.roleSpecificQuestions,
        },
      });
    }
  };
  
  /**
   * Handler to open the delete confirmation dialog.
   */
  const handleOpenDeleteDialog = () => {
    if (!activeForm.id) return;
    const setToDelete = savedSets.find(s => s.id === activeForm.id);
    if (setToDelete) setSetToDelete(setToDelete);
  };

  /**
   * Handler to confirm and execute the deletion of a saved question set.
   */
  const handleConfirmDelete = async () => {
    if (!setToDelete) return;
    try {
      await deleteInterviewQuestionSet(setToDelete.id);
      toast({ title: "Set Deleted", description: `The question set for "${setToDelete.roleTitle}" has been deleted.` });
      const newSets = savedSets.filter(s => s.id !== setToDelete.id);
      setSavedSets(newSets);
      // Select the newest remaining set or start a new draft.
      if (newSets.length > 0) {
        handleSelectSet(newSets[0].id);
      } else {
        handleAddNewEntry();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast({ title: "Deletion Failed", description: message.substring(0, 100), variant: "destructive" });
    } finally {
      setSetToDelete(null);
    }
  };


  /**
   * Callback to handle file upload and extract job description content and title.
   * This populates the fields for a *new draft*.
   */
  const handleJobDescriptionUpload = useCallback(async (files: File[]) => {
     if (!currentUser?.uid) {
      toast({ title: "Not Authenticated", description: "Please log in to upload files.", variant: "destructive" });
      return;
    }
    if (files.length === 0) return;
    
    // Start a new draft for the uploaded file
    handleAddNewEntry();
    
    const file = files[0];
    const dataUri = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
    
    setIsLoading(true);
    setError(null);
    
    try {
      const extractionInput: ExtractJobRolesAIInput = { jobDescriptionDocuments: [{ name: file.name, dataUri }] };
      const extractionOutput: ExtractJobRolesAIOutput = await extractJobRolesAI(extractionInput);
      
      let newJdContent = "";
      let newRoleTitle = "";

      if (extractionOutput.length > 0 && extractionOutput[0].contentDataUri) {
        const firstRole = extractionOutput[0];
        const base64 = firstRole.contentDataUri.split(',')[1];
        if (base64) newJdContent = Buffer.from(base64, 'base64').toString('utf-8');
        if (firstRole.name && firstRole.name !== "Untitled Job Role" && !firstRole.name.startsWith("Job Role")) newRoleTitle = firstRole.name;
        toast({ title: "Content Extracted", description: `Extracted content for "${newRoleTitle || 'new role'}"`});
      } else {
         toast({ title: "Extraction Failed", description: "Could not extract content.", variant: "destructive"});
      }
      
      setActiveForm({ ...getInitialFormState(), jdContent: newJdContent, roleTitle: newRoleTitle });

    } catch (extractError) {
      const message = extractError instanceof Error ? extractError.message : String(extractError);
      console.error("Failed to extract content:", extractError);
      toast({ title: "File Processing Failed", description: message.substring(0,100), variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast, currentUser?.uid]);

  /**
   * Callback to generate interview questions using the AI flow and save the result.
   */
  const handleGenerateQuestions = useCallback(async () => {
    if (!currentUser?.uid || !isFirestoreAvailable) {
      toast({ title: "Not Authenticated", description: "Please log in.", variant: "destructive" });
      return;
    }
    if (!activeForm.jdContent.trim()) {
      toast({ title: "Missing Job Description", description: "Please enter or upload a job description.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { jdContent, roleTitle, focusAreas } = activeForm;
      const contentDataUri = `data:text/plain;charset=utf-8;base64,${Buffer.from(jdContent).toString('base64')}`;

      const input: GenerateJDInterviewQuestionsInput = {
        jobDescriptionDataUri: contentDataUri,
        roleTitle: roleTitle.trim() || undefined,
        focusAreas: focusAreas.trim() || undefined,
      };
      const aiOutput = await generateJDInterviewQuestions(input);
      
      const questionSetToSave: Omit<InterviewQuestionsSet, 'id' | 'userId' | 'createdAt'> = {
        roleTitle: roleTitle.trim() || "Untitled Role",
        jobDescriptionDataUri: contentDataUri,
        ...aiOutput,
        ...(focusAreas.trim() && { focusAreas: focusAreas.trim() }),
      };
      
      const savedSet = await saveInterviewQuestionSet(questionSetToSave);
      
      setSavedSets(prev => [savedSet, ...prev]);
      handleSelectSet(savedSet.id); // Select the newly created set
      
      toast({ title: "Questions Generated & Saved", description: "Your new interview question set is ready and saved." });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
      setError(`Failed to generate questions: ${errorMessage.substring(0,100)}`);
      toast({ title: "Generation Failed", description: errorMessage.substring(0,100), variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [activeForm, toast, currentUser?.uid, isFirestoreAvailable]);

  /**
   * Handler to generate and download a PDF of the currently active questions.
   */
  const handleDownloadPdf = () => {
    if (!activeForm.questions) return;
    setIsDownloading(true);

    try {
        const pdf = new jsPDF('p', 'pt', 'a4');
        const { questions, roleTitle, focusAreas } = activeForm;
        const pageMargin = 40;
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const contentWidth = pageWidth - (pageMargin * 2);
        let yPos = pageMargin;

        const checkPageBreak = (neededHeight: number) => { if (yPos + neededHeight > pageHeight - pageMargin) { pdf.addPage(); yPos = pageMargin; } };

        pdf.setFontSize(22);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`Interview Questions`, pageWidth / 2, yPos, { align: 'center' });
        yPos += 30;

        pdf.setFontSize(16);
        pdf.setTextColor('#333333');
        pdf.text(`Role: ${roleTitle || 'General'}`, pageWidth / 2, yPos, { align: 'center' });
        yPos += 20;

        if (focusAreas) {
            pdf.setFontSize(12);
            pdf.setFont('helvetica', 'italic');
            pdf.text(`Focus Areas: ${focusAreas}`, pageWidth / 2, yPos, { align: 'center' });
            yPos += 25;
        }

        pdf.setDrawColor('#cccccc');
        pdf.line(pageMargin, yPos, pageWidth - pageMargin, yPos);
        yPos += 20;

        const questionCategoriesToRender: Array<{key: keyof typeof questions, title: string}> = [
            { key: "technicalQuestions", title: "Technical Questions" },
            { key: "behavioralQuestions", title: "Behavioral Questions" },
            { key: "situationalQuestions", title: "Situational Questions" },
            { key: "roleSpecificQuestions", title: "Role-Specific Questions" },
        ];
        
        questionCategoriesToRender.forEach(({ key, title }) => {
            const questionList = questions[key];
            if (questionList && Array.isArray(questionList) && questionList.length > 0) {
                checkPageBreak(30); 
                pdf.setFontSize(14);
                pdf.setFont('helvetica', 'bold');
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
        
        const fileName = `Interview_Questions_${(roleTitle || 'General').replace(/\s+/g, '_')}.pdf`;
        pdf.save(fileName);

    } catch (err) {
        console.error("PDF Generation Error:", err);
        toast({ title: "PDF Generation Failed", description: "An error occurred while creating the PDF.", variant: "destructive" });
    } finally {
        setIsDownloading(false);
    }
  };

  /**
   * Data structure for rendering question categories.
   */
  const questionCategories: Array<{key: keyof Omit<InterviewQuestionsSet, 'id'|'userId'|'createdAt'|'roleTitle'|'jobDescriptionDataUri'|'focusAreas'>, title: string, icon: React.ElementType}> = [
    { key: "technicalQuestions", title: "Technical Questions", icon: Brain },
    { key: "behavioralQuestions", title: "Behavioral Questions", icon: Users },
    { key: "situationalQuestions", title: "Situational Questions", icon: HelpCircle },
    { key: "roleSpecificQuestions", title: "Role-Specific Questions", icon: ScrollText },
  ];
  
  const isProcessing = isLoading || isLoadingFromDB;

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-8">
      {/* Page Header */}
      <Card className="mb-8 shadow-md">
        <CardHeader>
          <CardTitle className="text-2xl font-headline text-primary flex items-center"><SearchCheck className="w-7 h-7 mr-3" /> AI Interview Question Generator</CardTitle>
          <CardDescription>Generate and save interview question sets for different roles. Your saved sets are automatically loaded.</CardDescription>
        </CardHeader>
      </Card>

      {!isFirestoreAvailable && (<Card className="shadow-lg border-destructive"><CardHeader><CardTitle className="text-destructive flex items-center"><ServerOff className="w-5 h-5 mr-2" /> Database Not Connected</CardTitle></CardHeader><CardContent><p>Database features are disabled.</p></CardContent></Card>)}
      {!currentUser && isFirestoreAvailable && (<Card className="shadow-lg"><CardContent className="pt-6 text-center"><p className="text-lg text-muted-foreground">Please <a href="/login" className="text-primary underline">log in</a> to use the generator.</p></CardContent></Card>)}

      {currentUser && isFirestoreAvailable && (
        <>
          {/* Input Section */}
          <div className="flex flex-col md:flex-row gap-8">
            <div className="flex-1">
              <Card className="shadow-lg h-full">
                <CardHeader>
                  <CardTitle className="flex items-center text-xl font-headline"><FileText className="w-6 h-6 mr-2 text-primary" />Job Description & Context</CardTitle>
                  <CardDescription>Paste the job description below or upload a file for a new entry.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="job-description-content">Job Description Content</Label>
                    <Textarea id="job-description-content" value={activeForm.jdContent} onChange={(e) => handleInputChange('jdContent', e.target.value)} placeholder="Paste the full job description here..." className="min-h-[200px]" disabled={isProcessing}/>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="roleTitle">Role Title (Optional)</Label>
                      <Input id="roleTitle" value={activeForm.roleTitle} onChange={(e) => handleInputChange('roleTitle', e.target.value)} placeholder="e.g., Senior Software Engineer" disabled={isProcessing}/>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="focusAreas">Key Focus Areas (Optional)</Label>
                      <Input id="focusAreas" value={activeForm.focusAreas} onChange={(e) => handleInputChange('focusAreas', e.target.value)} placeholder="e.g., JavaScript, Team Leadership" disabled={isProcessing}/>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            <div className="flex-1">
              <Card className="shadow-lg h-full flex flex-col">
                <CardHeader>
                  <CardTitle className="flex items-center text-xl font-headline"><UploadCloud className="w-6 h-6 mr-2 text-primary" />Or Upload for New Entry</CardTitle>
                  <CardDescription>The AI will extract content and create a new draft.</CardDescription>
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
                <Label htmlFor="session-select" className="text-sm whitespace-nowrap self-center">Saved Question Sets:</Label>
                <Select value={activeForm.id || "new-entry"} onValueChange={(val) => val === "new-entry" ? handleAddNewEntry() : handleSelectSet(val)} disabled={isProcessing}>
                  <SelectTrigger id="session-select" className="flex-grow"><SelectValue placeholder="Select a saved set..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new-entry">-- New Draft --</SelectItem>
                    {savedSets.map((entry) => (<SelectItem key={entry.id} value={entry.id}>{entry.roleTitle} ({entry.createdAt.toDate().toLocaleDateString()})</SelectItem>))}
                  </SelectContent>
                </Select>
                <div className="flex gap-2">
                    <TooltipProvider><Tooltip><TooltipTrigger asChild>
                    <Button variant="outline" size="icon" onClick={handleAddNewEntry} disabled={isProcessing} aria-label="Add new JD session"><PlusCircle className="w-5 h-5"/></Button>
                    </TooltipTrigger><TooltipContent>New Draft</TooltipContent></Tooltip></TooltipProvider>
                    
                    <TooltipProvider><Tooltip><TooltipTrigger asChild>
                    <Button variant="outline" size="icon" onClick={handleOpenDeleteDialog} disabled={isProcessing || !activeForm.id} aria-label="Delete current JD session"><Trash2 className="w-5 h-5"/></Button>
                    </TooltipTrigger><TooltipContent>Delete Selected Set</TooltipContent></Tooltip></TooltipProvider>
                </div>
              </div>
              <Separator />
              <div className="flex justify-center pt-2">
                <Button onClick={handleGenerateQuestions} disabled={isProcessing || !activeForm.jdContent.trim()} size="lg" className="w-full md:w-auto bg-accent hover:bg-accent/90 text-accent-foreground shadow-md">
                  {isLoading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Lightbulb className="w-5 h-5 mr-2" />}
                  {activeForm.id ? "Regenerate & Save as New" : "Generate & Save Questions"}
                </Button>
              </div>
            </div>
          </Card>
          
          {/* Results Section */}
          <div ref={resultsSectionRef}>
            {isProcessing && !activeForm.questions && (<Card className="shadow-lg"><CardContent className="pt-6 flex flex-col items-center justify-center space-y-4 min-h-[200px]"><Loader2 className="w-12 h-12 animate-spin text-primary" /><p className="text-lg text-muted-foreground">AI is crafting questions...</p></CardContent></Card>)}
            {error && !isLoading && (<Alert variant="destructive" className="shadow-md"><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>)}
            
            {activeForm.questions && !isLoading && (
              <div className="space-y-6 mt-8">
                <div className="p-4 bg-background">
                  <Separator />
                  <div className="flex flex-col sm:flex-row justify-between items-center py-4 gap-4">
                    <h2 className="text-xl font-semibold text-foreground font-headline text-center md:text-left">
                      Interview Questions for {activeForm.roleTitle ? <span className="text-primary">{activeForm.roleTitle}</span> : 'the Role'}
                    </h2>
                     <Button onClick={handleDownloadPdf} disabled={isDownloading} variant="outline" size="sm">
                        {isDownloading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                        Download PDF
                      </Button>
                  </div>
                   {activeForm.focusAreas && (<p className="text-sm text-muted-foreground text-center md:text-left pb-4">Focusing on: {activeForm.focusAreas}</p>)}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {questionCategories.map(({key, title, icon: Icon}) => {
                      const questions = activeForm.questions?.[key as keyof typeof activeForm.questions];
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
             {!isProcessing && !activeForm.questions && !error && (
                 <Card className="shadow-lg"><CardContent className="pt-6"><p className="text-center text-muted-foreground py-8">Select a saved set or start a new draft to begin.</p></CardContent></Card>
            )}
          </div>

           <AlertDialog open={!!setToDelete} onOpenChange={(open) => !open && setSetToDelete(null)}>
            <AlertDialogContent>
              <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the interview question set for <span className="font-semibold">{setToDelete?.roleTitle}</span>.</AlertDialogDescription></AlertDialogHeader>
              <AlertDialogFooter><AlertDialogCancel onClick={() => setSetToDelete(null)}>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Delete</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </div>
  );
}
