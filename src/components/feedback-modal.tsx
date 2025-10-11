
"use client";

import React from "react";
// UI Components
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
// Icons
import { Star, Activity, ThumbsDown, ShieldCheck } from "lucide-react";
// Types
import type { RankedCandidate } from "@/lib/types";

/**
 * Props for the FeedbackModal component.
 */
interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidate: RankedCandidate | null;
}

/**
 * A modal dialog to display detailed AI-generated feedback for a ranked candidate.
 * @param {FeedbackModalProps} props - The component props.
 */
export function FeedbackModal({ isOpen, onClose, candidate }: FeedbackModalProps) {
  // Do not render if there's no candidate data.
  if (!candidate) return null;

  /**
   * Determines the icon and style for a score badge.
   * @param {number} score - The score value (0-100).
   * @param {"match" | "ats"} [iconType="match"] - The type of score to determine the icon.
   * @returns {JSX.Element} A styled Badge component.
   */
  const getScoreBadge = (score: number, iconType: "match" | "ats" = "match") => {
    let IconComponent = iconType === "match" ? Star : ShieldCheck;
    if (iconType === "match") {
      if (score <= 50) IconComponent = ThumbsDown;
      else if (score <= 75) IconComponent = Activity;
    }
    
    let badgeClass = "bg-accent text-accent-foreground"; // Default: Good score
    if (score <= 50) badgeClass = "bg-destructive text-destructive-foreground"; // Low score
    else if (score <= 75) badgeClass = "bg-yellow-500 text-black"; // Medium score

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
            {/* Scores Section */}
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
            {/* Key Skills Section */}
            <div>
              <h4 className="font-semibold text-foreground mb-2">Key Skills Matched</h4>
              {candidate.keySkills && candidate.keySkills.split(',').filter(skill => skill.trim()).length > 0 ? (
                <div className="flex flex-wrap gap-2">
                    {candidate.keySkills.split(',').map(skill => skill.trim()).filter(Boolean).map((skill, index) => (
                      <Badge key={index} variant="secondary">{skill}</Badge>
                    ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No specific key skills were highlighted by the AI.</p>
              )}
            </div>
            <Separator />
            {/* AI Feedback Section */}
            <div>
              <h4 className="font-semibold text-foreground mb-2">AI Generated Feedback</h4>
              <div className="p-4 bg-muted/50 rounded-md border border-border">
                {/* whitespace-pre-wrap preserves line breaks from the AI's response */}
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
