
"use client";

import React, { useState, useMemo } from "react";
// UI Components
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
// Icons
import { ArrowUpDown, MessageSquareText, TrendingUp, Tags, Hash, Mail } from "lucide-react";
// Types
import type { RankedCandidate } from "@/lib/types";

/**
 * Props for the CandidateTable component.
 */
interface CandidateTableProps {
  candidates: RankedCandidate[];
  onViewFeedback: (candidate: RankedCandidate) => void;
  onSendEmail: (candidate: RankedCandidate) => void;
}

// Defines the possible keys for sorting the table.
type SortKey = keyof Pick<RankedCandidate, "name" | "score">;

/**
 * A responsive table/card list for displaying ranked candidates.
 * It shows a table on larger screens and a list of cards on mobile, with sorting functionality.
 * @param {CandidateTableProps} props - The component props.
 */
export function CandidateTable({ candidates, onViewFeedback, onSendEmail }: CandidateTableProps) {
  // State to manage the current sorting configuration (key and direction).
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: "ascending" | "descending" } | null>({ key: "score", direction: "descending" });

  // Memoized sorted list of candidates. This recalculates only when candidates or sortConfig change.
  const sortedCandidates = useMemo(() => {
    let sortableItems = [...candidates];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === "ascending" ? -1 : 1;
        if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === "ascending" ? 1 : -1;
        // As a tie-breaker, sort by name if scores are equal.
        if (sortConfig.key === "score") return a.name.localeCompare(b.name);
        return 0;
      });
    }
    return sortableItems;
  }, [candidates, sortConfig]);

  /**
   * Toggles the sort configuration when a table header is clicked.
   * @param {SortKey} key - The key to sort by ('name' or 'score').
   */
  const requestSort = (key: SortKey) => {
    let direction: "ascending" | "descending" = "ascending";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending";
    }
    setSortConfig({ key, direction });
  };

  /**
   * Renders a sort indicator icon next to the table header.
   * @param {SortKey} key - The key of the header.
   * @returns {JSX.Element | string} The sort indicator.
   */
  const getSortIndicator = (key: SortKey) => {
    if (!sortConfig || sortConfig.key !== key) return <ArrowUpDown className="w-4 h-4 ml-2 opacity-50" />;
    return sortConfig.direction === "ascending" ? "🔼" : "🔽";
  };

  /**
   * Determines the color of the score badge based on the score value.
   * @param {number} score - The match score (0-100).
   * @returns {JSX.Element} A styled Badge component.
   */
  const getScoreBadge = (score: number) => {
    if (score > 75) return <Badge className="bg-accent text-accent-foreground hover:bg-accent/90">{score}/100</Badge>;
    if (score > 50) return <Badge className="bg-yellow-500 text-black hover:bg-yellow-500/90">{score}/100</Badge>;
    return <Badge variant="destructive">{score}/100</Badge>;
  };

  // Display a message if there are no candidates to show.
  if (candidates.length === 0) {
    return <p className="text-center text-muted-foreground py-8">No candidates to display for this job role and filter combination.</p>;
  }

  return (
    <>
      {/* Mobile View: Renders a list of cards. Hidden on medium screens and up. */}
      <div className="md:hidden space-y-4">
        {sortedCandidates.map((candidate, index) => (
          <Card key={candidate.id} className="bg-card">
            <CardHeader>
              <div className="flex justify-between items-start gap-4">
                <div className="flex-grow">
                  <CardTitle className="text-lg">{candidate.name}</CardTitle>
                  <CardDescription>Rank #{index + 1}</CardDescription>
                </div>
                <div className="flex-shrink-0 ml-4">{getScoreBadge(candidate.score)}</div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center"><Tags className="w-4 h-4 mr-2" />Key Skills</h4>
                <div className="flex flex-wrap gap-1">
                  {candidate.keySkills.split(',').map(s => s.trim()).filter(Boolean).slice(0, 5).map((skill, i) => (<Badge key={i} variant="outline">{skill}</Badge>))}
                  {candidate.keySkills.split(',').length > 5 && <Badge variant="outline">...</Badge>}
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => onViewFeedback(candidate)} className="flex-1"><MessageSquareText className="w-4 h-4 mr-2" />Feedback</Button>
                <Button variant="secondary" size="sm" onClick={() => onSendEmail(candidate)} className="flex-1"><Mail className="w-4 h-4 mr-2" />Email</Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* Desktop View: Renders a table. Hidden on small screens. */}
      <div className="hidden md:block rounded-lg border shadow-sm bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[5%] text-center"><div className="flex items-center justify-center"><Hash className="w-4 h-4 mr-1" />Rank</div></TableHead>
              <TableHead onClick={() => requestSort("name")} className="cursor-pointer hover:bg-muted/50 w-[25%]"><div className="flex items-center">Candidate Name {getSortIndicator("name")}</div></TableHead>
              <TableHead onClick={() => requestSort("score")} className="cursor-pointer hover:bg-muted/50 w-[15%]"><div className="flex items-center"><TrendingUp className="w-4 h-4 mr-1" />Score {getSortIndicator("score")}</div></TableHead>
              <TableHead className="w-[35%]"><div className="flex items-center"><Tags className="w-4 h-4 mr-1" />Key Skills</div></TableHead>
              <TableHead className="text-right w-[20%]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedCandidates.map((candidate, index) => (
              <TableRow key={candidate.id} className="hover:bg-muted/50">
                <TableCell className="font-medium text-center">{index + 1}</TableCell>
                <TableCell className="font-medium">{candidate.name}</TableCell>
                <TableCell>{getScoreBadge(candidate.score)}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {candidate.keySkills.split(',').map(s => s.trim()).filter(Boolean).slice(0, 5).map((skill, i) => (<Badge key={i} variant="outline">{skill}</Badge>))}
                    {candidate.keySkills.split(',').length > 5 && <Badge variant="outline">...</Badge>}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end space-x-1">
                    <Button variant="ghost" size="sm" onClick={() => onViewFeedback(candidate)} aria-label={`View feedback for ${candidate.name}`} className="hover:text-primary"><MessageSquareText className="w-4 h-4 mr-2" />Feedback</Button>
                    <Button variant="ghost" size="sm" onClick={() => onSendEmail(candidate)} aria-label={`Send email to ${candidate.name}`} className="hover:text-primary"><Mail className="w-4 h-4 mr-2" />Email</Button>
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
