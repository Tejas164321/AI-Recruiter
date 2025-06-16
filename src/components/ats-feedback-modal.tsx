
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
import type { AtsScoreResult } from "@/lib/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, FileText, User } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface AtsFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: AtsScoreResult | null;
}

export function AtsFeedbackModal({ isOpen, onClose, result }: AtsFeedbackModalProps) {
  if (!result) return null;

 const getAtsScoreBadge = (score: number) => {
    let badgeClass = "bg-green-600 text-white";
    if (score < 40) badgeClass = "bg-red-600 text-white";
    else if (score < 60) badgeClass = "bg-orange-500 text-white";
    else if (score < 80) badgeClass = "bg-yellow-500 text-black";
    
    return <Badge className={`${badgeClass} text-base px-3 py-1`}><ShieldCheck className="w-4 h-4 mr-1.5" /> {score}/100</Badge>;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[650px] bg-card">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl text-primary flex items-center">
            <ShieldCheck className="w-6 h-6 mr-2" /> ATS Insights
            </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground space-y-1 pt-1">
            <div className="flex items-center">
                <FileText className="w-4 h-4 mr-2 text-muted-foreground" /> 
                Resume: <span className="font-medium text-foreground ml-1">{result.resumeName}</span>
            </div>
            {result.candidateName && (
                <div className="flex items-center">
                    <User className="w-4 h-4 mr-2 text-muted-foreground" />
                    Candidate: <span className="font-medium text-foreground ml-1">{result.candidateName}</span>
                </div>
            )}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[65vh] pr-4">
          <div className="grid gap-6 py-4">
            <div>
              <h4 className="font-semibold text-foreground mb-2">ATS Compatibility Score</h4>
              {getAtsScoreBadge(result.atsScore)}
            </div>
            <Separator />
            <div>
              <h4 className="font-semibold text-foreground mb-2">AI Generated Feedback & Suggestions</h4>
              <div className="p-4 bg-muted/50 rounded-md border border-border">
                <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                  {result.atsFeedback}
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
