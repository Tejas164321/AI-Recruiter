
"use client";

import React, { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { RankedCandidate } from "@/lib/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { generateInterviewQuestions, type GenerateInterviewQuestionsInput, type GenerateInterviewQuestionsOutput } from "@/ai/flows/generate-interview-questions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, HelpCircle, Lightbulb } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";


interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidate: RankedCandidate | null;
  jobDescriptionDataUri: string | null;
}

export function FeedbackModal({ isOpen, onClose, candidate, jobDescriptionDataUri }: FeedbackModalProps) {
  const [interviewQuestions, setInterviewQuestions] = useState<string[]>([]);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState<boolean>(false);
  const [questionError, setQuestionError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleGenerateQuestions = useCallback(async () => {
    if (!candidate || !jobDescriptionDataUri || !candidate.resumeDataUri) {
      setQuestionError("Missing necessary information (candidate, job description, or resume data) to generate questions.");
      return;
    }

    setIsGeneratingQuestions(true);
    setQuestionError(null);
    setInterviewQuestions([]);

    try {
      const input: GenerateInterviewQuestionsInput = {
        candidateName: candidate.name,
        jobDescriptionDataUri: jobDescriptionDataUri,
        resumeDataUri: candidate.resumeDataUri,
        keySkills: candidate.keySkills,
      };
      const output: GenerateInterviewQuestionsOutput = await generateInterviewQuestions(input);
      setInterviewQuestions(output.interviewQuestions);
      if (output.interviewQuestions.length === 0) {
        toast({ title: "No Questions Generated", description: "The AI couldn't generate questions based on the provided information.", variant: "default"});
      }
    } catch (error) {
      console.error("Error generating interview questions:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      setQuestionError(`Failed to generate interview questions: ${errorMessage}`);
      toast({ title: "Error Generating Questions", description: `An error occurred: ${errorMessage}`, variant: "destructive"});
    } finally {
      setIsGeneratingQuestions(false);
    }
  }, [candidate, jobDescriptionDataUri, toast]);

  // Reset questions when modal closes or candidate changes
  React.useEffect(() => {
    if (!isOpen) {
      setInterviewQuestions([]);
      setIsGeneratingQuestions(false);
      setQuestionError(null);
    }
  }, [isOpen]);
   
  React.useEffect(() => {
    setInterviewQuestions([]);
    setIsGeneratingQuestions(false);
    setQuestionError(null);
  },[candidate?.id]);


  if (!candidate) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] bg-card">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl text-primary">Feedback for {candidate.name}</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            AI-generated insights for resume submitted: {candidate.originalResumeName}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="grid gap-6 py-4">
            <div>
              <h4 className="font-semibold text-foreground mb-1">Overall Score</h4>
              <Badge variant={candidate.score > 75 ? "default" : candidate.score > 50 ? "secondary" : "destructive"} className={
                    candidate.score > 75 ? `bg-accent text-accent-foreground` : candidate.score > 50 ? `bg-yellow-500 text-white` : `bg-red-500 text-white`
                }>
                  {candidate.score}/100
              </Badge>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-1">Key Skills Matched</h4>
              <div className="flex flex-wrap gap-1">
                  {candidate.keySkills.split(',').map(skill => skill.trim()).filter(skill => skill).map(skill => (
                    <Badge key={skill} variant="outline" className="text-xs">{skill}</Badge>
                  ))}
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-1">Detailed Feedback</h4>
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                {candidate.feedback}
              </p>
            </div>

            <Separator />

            <div>
              <h4 className="font-semibold text-foreground mb-2 flex items-center">
                <HelpCircle className="w-5 h-5 mr-2 text-primary" />
                Suggested Interview Questions
              </h4>
              {questionError && (
                <Alert variant="destructive" className="mb-4">
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{questionError}</AlertDescription>
                </Alert>
              )}
              {isGeneratingQuestions && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-8 h-8 mr-2 animate-spin text-primary" />
                  <p className="text-muted-foreground">Generating questions...</p>
                </div>
              )}
              {!isGeneratingQuestions && interviewQuestions.length > 0 && (
                <ul className="space-y-2 list-disc list-inside pl-2 text-sm text-foreground">
                  {interviewQuestions.map((question, index) => (
                    <li key={index}>{question}</li>
                  ))}
                </ul>
              )}
              {!isGeneratingQuestions && interviewQuestions.length === 0 && !questionError && (
                 <p className="text-sm text-muted-foreground">Click the button below to generate questions.</p>
              )}
              <Button 
                onClick={handleGenerateQuestions} 
                disabled={isGeneratingQuestions || !jobDescriptionDataUri || !candidate.resumeDataUri}
                className="mt-4 w-full sm:w-auto"
                variant="outline"
              >
                {isGeneratingQuestions ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Lightbulb className="w-4 h-4 mr-2" />
                )}
                {interviewQuestions.length > 0 ? "Regenerate Questions" : "Generate Interview Questions"}
              </Button>
            </div>
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button onClick={onClose} variant="outline">Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
