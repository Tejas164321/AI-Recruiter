
"use client";

import React from "react";
// UI Components
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
// Icons
import { Star, Activity, ThumbsDown, ShieldCheck, Sparkles, CheckCircle2, AlertTriangle, AlertCircle, TrendingUp, Lightbulb, UserCheck, Copy, Check } from "lucide-react";
// Types
import type { RankedCandidate } from "@/lib/types";
// Loading Component
import { AIFeedbackLoading } from "@/components/ai-feedback-loading";

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
 * Shows modern loading state if AI feedback is still being generated.
 * @param {FeedbackModalProps} props - The component props.
 */
const CopyButton = ({ text }: { text: string }) => {
  const [copied, setCopied] = React.useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };
  
  return (
    <Button
      size="icon"
      variant="ghost"
      onClick={handleCopy}
      className="h-8 w-8 hover:bg-muted text-muted-foreground hover:text-foreground flex-shrink-0"
      title="Copy to clipboard"
    >
      {copied ? (
        <Check className="w-4 h-4 text-green-500" />
      ) : (
        <Copy className="w-4 h-4" />
      )}
    </Button>
  );
};

export function FeedbackModal({ isOpen, onClose, candidate }: FeedbackModalProps) {
  // Do not render if there's no candidate data.
  if (!candidate) return null;

  // Check if AI feedback is still pending
  const isFeedbackPending = candidate.feedbackStatus === 'pending' || candidate.feedbackStatus === 'generating';

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

            {/* AI Feedback Section - Show loading if pending */}
            <div>
              <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-green-500 animate-pulse" />
                AI Recruiter Insights
              </h4>

              {isFeedbackPending ? (
                // Show beautiful loading state
                <AIFeedbackLoading
                  candidateName={candidate.name}
                  score={candidate.score}
                  variant="full"
                />
              ) : candidate.detailedFeedback ? (
                // Show rich structured feedback
                <div className="space-y-6">
                  {/* Executive Summary */}
                  <div className="p-4 bg-primary/5 border border-primary/10 rounded-lg">
                    <h5 className="font-semibold text-primary mb-2 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4" /> Executive Summary
                    </h5>
                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                      {candidate.detailedFeedback.summary}
                    </p>
                  </div>

                  {/* Score Explanation */}
                  {candidate.detailedFeedback.scoreExplanation && (
                    <div className="p-4 bg-muted/40 border border-border rounded-lg">
                      <h5 className="font-semibold text-foreground mb-2 flex items-center gap-1.5">
                        <Activity className="w-4 h-4 text-orange-500" /> Rating Justification
                      </h5>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {candidate.detailedFeedback.scoreExplanation}
                      </p>
                    </div>
                  )}

                  {/* Strengths & Experience Alignment */}
                  <div className={candidate.detailedFeedback.matchedExperience ? "grid grid-cols-1 md:grid-cols-2 gap-4" : "grid grid-cols-1 gap-4"}>
                    <div className="p-4 bg-green-500/5 border border-green-500/10 rounded-lg">
                      <h5 className="font-semibold text-green-600 dark:text-green-400 mb-2 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" /> Candidate Strengths
                      </h5>
                      {candidate.detailedFeedback.strengths && candidate.detailedFeedback.strengths.length > 0 ? (
                        <ul className="space-y-2">
                          {candidate.detailedFeedback.strengths.map((strength, index) => (
                            <li key={index} className="text-sm text-foreground flex items-start gap-2">
                              <span className="text-green-500 font-bold mt-0.5">✓</span>
                              <span>{strength}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-muted-foreground">No specific strengths listed.</p>
                      )}
                    </div>

                    {candidate.detailedFeedback.matchedExperience && (
                      <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-lg">
                        <h5 className="font-semibold text-blue-600 dark:text-blue-400 mb-2 flex items-center gap-1.5">
                          <UserCheck className="w-4 h-4" /> Experience Alignment
                        </h5>
                        <p className="text-sm text-foreground leading-relaxed">
                          {candidate.detailedFeedback.matchedExperience}
                        </p>
                        {candidate.detailedFeedback.missingExperience && (
                          <div className="mt-3 pt-3 border-t border-blue-500/10">
                            <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5" /> Experience Gaps:
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {candidate.detailedFeedback.missingExperience}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Skills Gaps */}
                  {candidate.detailedFeedback.missingSkills && candidate.detailedFeedback.missingSkills.length > 0 && (
                    <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-lg">
                      <h5 className="font-semibold text-amber-600 dark:text-amber-400 mb-3 flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4" /> Skills Gap Analysis
                      </h5>
                      <div className="space-y-3">
                        <div>
                          <span className="text-xs font-medium text-muted-foreground block mb-1.5">Missing Skills in Resume:</span>
                          <div className="flex flex-wrap gap-1.5">
                            {candidate.detailedFeedback.missingSkills.map((skill, index) => (
                              <Badge key={index} variant="destructive" className="bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/25 text-xs">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action Plan & Improvements */}
                  <div className="p-4 bg-purple-500/5 border border-purple-500/10 rounded-lg space-y-3">
                    <h5 className="font-semibold text-purple-600 dark:text-purple-400 mb-2 flex items-center gap-1.5">
                      <Lightbulb className="w-4 h-4" /> Recommendation & Improvements
                    </h5>
                    {candidate.detailedFeedback.improvements && candidate.detailedFeedback.improvements.length > 0 ? (
                      <ul className="space-y-2">
                        {candidate.detailedFeedback.improvements.map((improvement, index) => (
                          <li key={index} className="text-sm text-foreground flex items-start gap-2">
                            <span className="text-purple-500 font-bold mt-0.5">•</span>
                            <span>{improvement}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground">No specific improvements recommended.</p>
                    )}

                    {candidate.detailedFeedback.scoreImpact && (
                      <div className="mt-3 p-2.5 bg-purple-500/10 border border-purple-500/20 rounded-md flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                        <span className="text-xs text-purple-700 dark:text-purple-300 font-medium">
                          {candidate.detailedFeedback.scoreImpact}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Concerns / Red Flags */}
                  {candidate.detailedFeedback.concerns && candidate.detailedFeedback.concerns.length > 0 && (
                    <div className="p-4 bg-red-500/5 border border-red-500/10 rounded-lg">
                      <h5 className="font-semibold text-red-600 dark:text-red-400 mb-2 flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4" /> Potential Concerns
                      </h5>
                      <ul className="space-y-1.5">
                        {candidate.detailedFeedback.concerns.map((concern, index) => (
                          <li key={index} className="text-sm text-foreground flex items-start gap-2">
                            <span className="text-red-500 font-bold mt-0.5">⚠</span>
                            <span>{concern}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Suggested Resume Additions */}
                  {candidate.detailedFeedback.resumeAdditions && candidate.detailedFeedback.resumeAdditions.length > 0 && (
                    <div className="p-4 bg-primary/5 border border-primary/10 rounded-lg space-y-3">
                      <h5 className="font-semibold text-primary mb-2 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-primary animate-pulse" /> Suggested Resume Bullet Points (Ready to Copy)
                      </h5>
                      <p className="text-xs text-muted-foreground leading-normal mb-2">
                        Add these exact points to your resume under your project/work experience sections to align perfectly with the job description:
                      </p>
                      <div className="space-y-2.5">
                        {candidate.detailedFeedback.resumeAdditions.map((bulletPoint, index) => (
                          <div key={index} className="flex items-start justify-between gap-3 p-3 bg-card border rounded-md group hover:border-primary/30 transition-colors">
                            <span className="text-sm text-foreground leading-relaxed">
                              {bulletPoint}
                            </span>
                            <CopyButton text={bulletPoint} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                // Show actual feedback
                <div className="p-4 bg-muted/50 rounded-md">
                  {/* whitespace-pre-wrap preserves line breaks from the AI's response */}
                  <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                    {candidate.feedback}
                  </p>
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
