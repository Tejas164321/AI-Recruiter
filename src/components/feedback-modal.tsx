
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
import { Loader2, HelpCircle, Lightbulb, Star, Activity, ThumbsDown, ShieldCheck } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";


interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidate: RankedCandidate | null;
  jobDescriptionDataUri: string | null; // This now refers to the specific JD for this feedback context
}

export function FeedbackModal({ isOpen, onClose, candidate, jobDescriptionDataUri }: FeedbackModalProps) {
  const [interviewQuestions, setInterviewQuestions] = useState<string[]>([]);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState<boolean>(false);
  const [questionError, setQuestionError] = useState<string | null>(null);

  const { toast } = useToast();

  const handleGenerateQuestions = useCallback(async () => {
    if (!candidate || !jobDescriptionDataUri || !candidate.resumeDataUri) {
      setQuestionError("Missing necessary information (candidate, job description context, or resume data) to generate questions.");
      return;
    }

    setIsGeneratingQuestions(true);
    setQuestionError(null);
    setInterviewQuestions([]);

    try {
      const input: GenerateInterviewQuestionsInput = {
        candidateName: candidate.name,
        jobDescriptionDataUri: jobDescriptionDataUri, // Use the contextual JD
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


  React.useEffect(() => {
    if (!isOpen) {
      setInterviewQuestions([]);
      setIsGeneratingQuestions(false);
      setQuestionError(null);
    }
  }, [isOpen]);
   
  // Reset questions if candidate ID or job context changes
  React.useEffect(() => {
    setInterviewQuestions([]);
    setIsGeneratingQuestions(false);
    setQuestionError(null);
  },[candidate?.id, jobDescriptionDataUri]);


  if (!candidate) return null;

  const getScoreBadge = (score: number, iconType: "match" | "ats" = "match") => {
    let IconComponent = Star;
    if (iconType === "match") {
      if (score > 75) IconComponent = Star;
      else if (score > 50) IconComponent = Activity;
      else IconComponent = ThumbsDown;
    } else { // ats
      if (score > 75) IconComponent = ShieldCheck; 
      else if (score > 50) IconComponent = ShieldCheck; 
      else IconComponent = ShieldCheck; 
    }
    
    let badgeClass = "bg-accent text-accent-foreground";
    if (score <= 50) badgeClass = "bg-destructive text-destructive-foreground";
    else if (score <= 75) badgeClass = "bg-yellow-500 text-black";


    return <Badge className={`${badgeClass} text-base px-3 py-1`}><IconComponent className="w-4 h-4 mr-1.5" /> {score}/100</Badge>;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] bg-card">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl text-primary">Feedback for {candidate.name}</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            AI-generated insights for resume: <span className="font-medium text-foreground">{candidate.originalResumeName}</span>
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="grid gap-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold text-foreground mb-2">Overall Match Score</h4>
                {getScoreBadge(candidate.score, "match")}
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-2">ATS Compatibility Score</h4>
                {getScoreBadge(candidate.atsScore, "ats")}
              </div>
            </div>
            <Separator />
            <div>
              <h4 className="font-semibold text-foreground mb-2">Key Skills Matched</h4>
              {candidate.keySkills && candidate.keySkills.split(',').filter(skill => skill.trim()).length > 0 ? (
                <div className="flex flex-wrap gap-2">
                    {candidate.keySkills.split(',').map(skill => skill.trim()).filter(skill => skill).map((skill, index) => (
                      <Badge key={`${skill.trim()}-${index}`} variant="secondary" className="text-sm">{skill}</Badge>
                    ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No specific key skills highlighted by AI.</p>
              )}
            </div>
            <Separator />
            <div>
              <h4 className="font-semibold text-foreground mb-2">AI Generated Feedback</h4>
              <div className="p-4 bg-muted/50 rounded-md ">
                <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                  {candidate.feedback}
                </p>
              </div>
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
                <div className="flex items-center justify-center py-4 space-x-2">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <p className="text-muted-foreground">Generating questions...</p>
                </div>
              )}
              {!isGeneratingQuestions && interviewQuestions.length > 0 && (
                <div className="p-4 bg-muted/50 rounded-md">
                  <ul className="space-y-3 list-decimal list-inside pl-2 text-sm text-foreground">
                    {interviewQuestions.map((question, index) => (
                      <li key={index} className="leading-relaxed">{question}</li>
                    ))}
                  </ul>
                </div>
              )}
              {!isGeneratingQuestions && interviewQuestions.length === 0 && !questionError && (
                 <p className="text-sm text-muted-foreground italic">Click the button below to generate tailored interview questions for this job context.</p>
              )}
              <Button 
                onClick={handleGenerateQuestions} 
                disabled={isGeneratingQuestions || !jobDescriptionDataUri || !candidate.resumeDataUri}
                className="mt-4 w-full sm:w-auto bg-primary hover:bg-primary/90"
                variant="default"
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
        <DialogFooter className="mt-2">
          <Button onClick={onClose} variant="outline">Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
