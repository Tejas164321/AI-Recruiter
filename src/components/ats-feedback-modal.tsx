
"use client";

import React from "react";
// UI Components
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
// Icons
import { ShieldCheck, FileText, User, Loader2, Sparkles } from "lucide-react";
// Types
import type { AtsScoreResult } from "@/lib/types";

interface AtsFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: AtsScoreResult | null;
}

/**
 * A modal dialog to display detailed ATS feedback for a single resume.
 * Supports progressive enhancement — shows a loading state while AI is generating feedback,
 * and displays the actual AI feedback once it's ready.
 */
export function AtsFeedbackModal({ isOpen, onClose, result }: AtsFeedbackModalProps) {
  if (!result) return null;

  const isGenerating = result.feedbackStatus === 'pending' || result.feedbackStatus === 'generating';
  const isAiReady = result.feedbackStatus === 'complete';

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
          <div className="text-sm text-muted-foreground space-y-1 pt-1">
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
          </div>
        </DialogHeader>
        <ScrollArea className="max-h-[65vh] pr-4">
          <div className="grid gap-6 py-4">
            {/* ATS Score */}
            <div>
              <h4 className="font-semibold text-foreground mb-2">ATS Compatibility Score</h4>
              {getAtsScoreBadge(result.atsScore)}
            </div>
            <Separator />

            {/* AI Feedback Section */}
            <div>
              <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                {isAiReady
                  ? <><Sparkles className="w-4 h-4 text-green-500" /> AI Generated Feedback</>
                  : <>AI Generated Feedback &amp; Suggestions</>
                }
              </h4>

              {isGenerating ? (
                /* Loading state while AI generates in background */
                <div className="p-6 bg-muted/30 rounded-md border border-border/50 flex flex-col items-center justify-center gap-3 min-h-[120px]">
                  <Loader2 className="w-8 h-8 animate-spin text-primary/60" />
                  <p className="text-sm text-muted-foreground text-center">
                    AI is analyzing this resume in the background…
                  </p>
                  <p className="text-xs text-muted-foreground/60 text-center">
                    Close and re-open once the ✨ button appears for full AI insights.
                  </p>
                </div>
              ) : (
                <div className="p-4 bg-muted/50 rounded-md border border-border">
                  <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                    {result.atsFeedback}
                  </p>
                  {isAiReady && (
                    <p className="text-xs text-green-600 dark:text-green-400 mt-3 pt-3 border-t border-border/40 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> AI-generated analysis
                      {result.feedbackGeneratedAt && ` · ${new Date(result.feedbackGeneratedAt).toLocaleTimeString()}`}
                    </p>
                  )}
                </div>
              )}
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
