
"use client";

import React from "react";
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
import { Star, Activity, ThumbsDown, ShieldCheck } from "lucide-react";
import { Separator } from "@/components/ui/separator";


interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidate: RankedCandidate | null;
}

export function FeedbackModal({ isOpen, onClose, candidate }: FeedbackModalProps) {
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
          </div>
        </ScrollArea>
        <DialogFooter className="mt-2">
          <Button onClick={onClose} variant="outline">Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
