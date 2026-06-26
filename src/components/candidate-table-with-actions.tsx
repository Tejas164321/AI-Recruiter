
"use client";

import React, { useState, useMemo } from "react";
// UI Components
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
// Icons
import { ArrowUpDown, MessageSquareText, Mail, Tags, Hash, AlertTriangle, Loader2, Sparkles } from "lucide-react";
// Types
import type { RankedCandidate } from "@/lib/types";

interface CandidateTableWithActionsProps {
  candidates: RankedCandidate[];
  onViewFeedback: (candidate: RankedCandidate) => void;
  onEmailCandidate: (candidate: RankedCandidate) => void;
}

type SortKey = keyof Pick<RankedCandidate, "name" | "score">;

export function CandidateTableWithActions({ candidates, onViewFeedback, onEmailCandidate }: CandidateTableWithActionsProps) {
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: "ascending" | "descending" } | null>(null);

  const sortedCandidates = useMemo(() => {
    let sortableItems = [...candidates];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === "ascending" ? -1 : 1;
        if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === "ascending" ? 1 : -1;
        if (sortConfig.key === "score") return a.name.localeCompare(b.name);
        return 0;
      });
    }
    return sortableItems;
  }, [candidates, sortConfig]);

  const requestSort = (key: SortKey) => {
    let direction: "ascending" | "descending" = "ascending";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending";
    }
    setSortConfig({ key, direction });
  };

  const getSortIndicator = (key: SortKey) => {
    if (!sortConfig || sortConfig.key !== key) return <ArrowUpDown className="w-4 h-4 ml-2 opacity-50" />;
    return sortConfig.direction === "ascending" ? "🔼" : "🔽";
  };

  const getScoreBadge = (score: number) => {
    if (score > 75) return <Badge className="bg-accent text-accent-foreground hover:bg-accent/90">{score}/100</Badge>;
    if (score > 50) return <Badge className="bg-yellow-500 text-black hover:bg-yellow-500/90">{score}/100</Badge>;
    return <Badge variant="destructive">{score}/100</Badge>;
  };

  const CandidateEmail = ({ candidate }: { candidate: RankedCandidate }) => {
    if (candidate.email) {
      return <span className="text-sm text-muted-foreground truncate" title={candidate.email}>{candidate.email}</span>;
    }
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center text-sm text-yellow-600 dark:text-yellow-400">
              <AlertTriangle className="w-4 h-4 mr-1.5" />
              <span>Not Found</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>The AI could not extract an email from this resume.</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  /**
   * Renders the Feedback button with progressive status indicators:
   * - pending / generating → pulsing spinner, disabled
   * - complete             → green sparkle, clickable
   * - default / failed     → normal button, clickable
   */
  const FeedbackButton = ({ candidate, compact = false }: { candidate: RankedCandidate; compact?: boolean }) => {
    const status = candidate.feedbackStatus;
    const isGenerating = status === 'pending' || status === 'generating';
    const isReady = status === 'complete';

    if (isGenerating) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled
                  className={`${compact ? "w-full" : ""} opacity-75 cursor-not-allowed`}
                >
                  <Loader2 className="w-4 h-4 mr-2 animate-spin text-primary" />
                  <span className="text-xs">Analyzing…</span>
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>AI is generating detailed feedback for this candidate…</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    if (isReady) {
      return (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onViewFeedback(candidate)}
          className={`${compact ? "w-full" : ""} border-green-500/60 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 hover:border-green-500 transition-all duration-300 relative overflow-hidden group`}
          title="AI feedback ready — click to view"
        >
          {/* Subtle shimmer sweep on hover */}
          <span className="absolute inset-0 bg-gradient-to-r from-transparent via-green-400/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
          <Sparkles className="w-4 h-4 mr-2 text-green-500" />
          Feedback
        </Button>
      );
    }

    // Default / failed / old records without status
    return (
      <Button
        variant={compact ? "outline" : "ghost"}
        size="sm"
        onClick={() => onViewFeedback(candidate)}
        className={`${compact ? "w-full" : "hover:text-primary"}`}
      >
        <MessageSquareText className="w-4 h-4 mr-2" />Feedback
      </Button>
    );
  };

  if (candidates.length === 0) {
    return <p className="text-center text-muted-foreground py-8">No candidates to display for this filter combination.</p>;
  }

  return (
    <>
      {/* Mobile View */}
      <div className="md:hidden space-y-4">
        {sortedCandidates.map((candidate, index) => (
          <Card key={candidate.id} className="bg-card">
            <CardHeader>
              <div className="flex justify-between items-start gap-4">
                <div className="flex-grow overflow-hidden">
                  <CardTitle className="text-lg truncate">{candidate.name}</CardTitle>
                  <CardDescription>Rank #{index + 1}</CardDescription>
                </div>
                <div className="flex-shrink-0 ml-4">{getScoreBadge(candidate.score)}</div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
               <div>
                  <h4 className="text-sm font-semibold text-muted-foreground mb-1">Email</h4>
                  <CandidateEmail candidate={candidate} />
               </div>
               <div>
                <h4 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center"><Tags className="w-4 h-4 mr-2" />Key Skills</h4>
                <div className="flex flex-wrap gap-1">
                  {candidate.keySkills.split(',').map(s => s.trim()).filter(Boolean).slice(0, 5).map((skill, i) => (<Badge key={i} variant="outline">{skill}</Badge>))}
                  {candidate.keySkills.split(',').length > 5 && <Badge variant="outline">...</Badge>}
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => onEmailCandidate(candidate)} disabled={!candidate.email}><Mail className="w-4 h-4 mr-2" />Email</Button>
              <FeedbackButton candidate={candidate} compact />
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* Desktop View */}
      <div className="hidden md:block rounded-lg border shadow-sm bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[5%] text-center"><div className="flex items-center justify-center"><Hash className="w-4 h-4 mr-1" />Rank</div></TableHead>
              <TableHead onClick={() => requestSort("name")} className="cursor-pointer hover:bg-muted/50 w-[20%]"><div className="flex items-center">Candidate Name {getSortIndicator("name")}</div></TableHead>
              <TableHead className="w-[15%]"><div className="flex items-center"><Mail className="w-4 h-4 mr-1" />Email</div></TableHead>
              <TableHead onClick={() => requestSort("score")} className="cursor-pointer hover:bg-muted/50 w-[10%]"><div className="flex items-center">Score {getSortIndicator("score")}</div></TableHead>
              <TableHead className="w-[30%]"><div className="flex items-center"><Tags className="w-4 h-4 mr-1" />Key Skills</div></TableHead>
              <TableHead className="text-right w-[20%]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedCandidates.map((candidate, index) => (
              <TableRow key={candidate.id} className="hover:bg-muted/50 transition-colors">
                <TableCell className="font-medium text-center">{index + 1}</TableCell>
                <TableCell className="font-medium">{candidate.name}</TableCell>
                <TableCell><CandidateEmail candidate={candidate} /></TableCell>
                <TableCell>{getScoreBadge(candidate.score)}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {candidate.keySkills.split(',').map(s => s.trim()).filter(Boolean).slice(0, 5).map((skill, i) => (<Badge key={i} variant="outline">{skill}</Badge>))}
                    {candidate.keySkills.split(',').length > 5 && <Badge variant="outline">...</Badge>}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                    <div className="flex items-center justify-end space-x-1">
                        <Button variant="ghost" size="sm" onClick={() => onEmailCandidate(candidate)} className="hover:text-primary" disabled={!candidate.email}><Mail className="w-4 h-4 mr-2" />Email</Button>
                        <FeedbackButton candidate={candidate} />
                    </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

    