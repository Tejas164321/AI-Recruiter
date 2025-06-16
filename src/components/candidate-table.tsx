"use client";

import React, { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, MessageSquareText, TrendingUp, Tags } from "lucide-react";
import type { RankedCandidate } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

interface CandidateTableProps {
  candidates: RankedCandidate[];
  onViewFeedback: (candidate: RankedCandidate) => void;
}

type SortKey = keyof Pick<RankedCandidate, "name" | "score">;

export function CandidateTable({ candidates, onViewFeedback }: CandidateTableProps) {
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: "ascending" | "descending" } | null>(null);

  const sortedCandidates = useMemo(() => {
    let sortableItems = [...candidates];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === "ascending" ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === "ascending" ? 1 : -1;
        }
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
    if (!sortConfig || sortConfig.key !== key) {
      return <ArrowUpDown className="w-4 h-4 ml-2 opacity-50" />;
    }
    return sortConfig.direction === "ascending" ? "🔼" : "🔽";
  };

  if (candidates.length === 0) {
    return <p className="text-center text-muted-foreground py-8">No candidates processed yet. Upload resumes and a job description to see results.</p>;
  }

  return (
    <div className="rounded-lg border shadow-sm bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead onClick={() => requestSort("name")} className="cursor-pointer hover:bg-muted/50 w-[30%]">
              <div className="flex items-center">
                Candidate Name {getSortIndicator("name")}
              </div>
            </TableHead>
            <TableHead onClick={() => requestSort("score")} className="cursor-pointer hover:bg-muted/50 w-[15%]">
              <div className="flex items-center">
                <TrendingUp className="w-4 h-4 mr-1 text-muted-foreground" /> Score {getSortIndicator("score")}
              </div>
            </TableHead>
            <TableHead className="w-[40%]">
              <div className="flex items-center">
                <Tags className="w-4 h-4 mr-1 text-muted-foreground" /> Key Skills
              </div>
            </TableHead>
            <TableHead className="text-right w-[15%]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedCandidates.map((candidate) => (
            <TableRow key={candidate.id}>
              <TableCell className="font-medium">{candidate.name}</TableCell>
              <TableCell>
                <Badge variant={candidate.score > 75 ? "default" : candidate.score > 50 ? "secondary" : "destructive"} className={
                    candidate.score > 75 ? `bg-accent text-accent-foreground` : candidate.score > 50 ? `bg-yellow-500 text-white` : `bg-red-500 text-white`
                }>
                  {candidate.score}/100
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {candidate.keySkills.split(',').map(skill => skill.trim()).filter(skill => skill).slice(0,5).map(skill => (
                    <Badge key={skill} variant="outline" className="text-xs">{skill}</Badge>
                  ))}
                  {candidate.keySkills.split(',').length > 5 && <Badge variant="outline" className="text-xs">...</Badge>}
                </div>
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onViewFeedback(candidate)}
                  aria-label={`View feedback for ${candidate.name}`}
                >
                  <MessageSquareText className="w-4 h-4 mr-2" />
                  Feedback
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
