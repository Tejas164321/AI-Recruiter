"use client";

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

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidate: RankedCandidate | null;
}

export function FeedbackModal({ isOpen, onClose, candidate }: FeedbackModalProps) {
  if (!candidate) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] bg-card">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl text-primary">Feedback for {candidate.name}</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            AI-generated insights for resume submitted: {candidate.originalResumeName}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="grid gap-4 py-4">
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
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button onClick={onClose} variant="outline">Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
