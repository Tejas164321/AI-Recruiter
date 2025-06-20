
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
import { ArrowUpDown, Eye, ShieldCheck, FileText, User, Hash } from "lucide-react";
import type { AtsScoreResult } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

interface AtsScoreTableProps {
  results: AtsScoreResult[];
  onViewInsights: (result: AtsScoreResult) => void;
}

type SortKey = "resumeName" | "atsScore" | "candidateName";

export function AtsScoreTable({ results, onViewInsights }: AtsScoreTableProps) {
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: "ascending" | "descending" } | null>({ key: "atsScore", direction: "descending" });

  const sortedResults = useMemo(() => {
    let sortableItems = [...results];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        let valA = a[sortConfig.key];
        let valB = b[sortConfig.key];

        if (sortConfig.key === "candidateName") {
          valA = valA || "";
          valB = valB || "";
        }
        
        if (valA === undefined || valB === undefined) return 0;

        if (valA < valB) {
          return sortConfig.direction === "ascending" ? -1 : 1;
        }
        if (valA > valB) {
          return sortConfig.direction === "ascending" ? 1 : -1;
        }
        if (sortConfig.key === "atsScore" || sortConfig.key === "candidateName") {
            return a.resumeName.localeCompare(b.resumeName);
        }
        return 0;
      });
    }
    return sortableItems;
  }, [results, sortConfig]);

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

  const getAtsScoreBadge = (score: number) => {
    if (score >= 80) {
      return <Badge className="bg-green-600 text-white hover:bg-green-600/90">{score}/100</Badge>;
    } else if (score >= 60) {
      return <Badge className="bg-yellow-500 text-black hover:bg-yellow-500/90">{score}/100</Badge>;
    } else if (score >= 40) {
        return <Badge className="bg-orange-500 text-white hover:bg-orange-500/90">{score}/100</Badge>;
    }
    else {
      return <Badge variant="destructive">{score}/100</Badge>;
    }
  };

  if (results.length === 0) {
    return <p className="text-center text-muted-foreground py-8">No resumes processed in this session. Upload resumes and click "Analyze" to see scores.</p>;
  }

  return (
    <div className="rounded-lg border shadow-sm bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[5%] text-center">
                 <div className="flex items-center justify-center">
                    <Hash className="w-4 h-4 mr-1 text-muted-foreground" /> #
                </div>
            </TableHead>
            <TableHead onClick={() => requestSort("resumeName")} className="cursor-pointer hover:bg-muted/50 w-[35%] transition-colors">
              <div className="flex items-center">
                <FileText className="w-4 h-4 mr-1 text-muted-foreground" /> Resume File {getSortIndicator("resumeName")}
              </div>
            </TableHead>
            <TableHead onClick={() => requestSort("candidateName")} className="cursor-pointer hover:bg-muted/50 w-[25%] transition-colors">
              <div className="flex items-center">
                <User className="w-4 h-4 mr-1 text-muted-foreground" /> Candidate Name {getSortIndicator("candidateName")}
              </div>
            </TableHead>
            <TableHead onClick={() => requestSort("atsScore")} className="cursor-pointer hover:bg-muted/50 w-[15%] transition-colors">
              <div className="flex items-center">
                <ShieldCheck className="w-4 h-4 mr-1 text-muted-foreground" /> ATS Score {getSortIndicator("atsScore")}
              </div>
            </TableHead>
            <TableHead className="text-right w-[20%]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedResults.map((result, index) => (
            // Use resumeId for key as AtsScoreResult might not have a top-level 'id' field after reversion
            <TableRow key={result.resumeId || index} className="transition-colors hover:bg-muted/50">
              <TableCell className="font-medium text-center">{index + 1}</TableCell>
              <TableCell className="font-medium truncate" title={result.resumeName}>{result.resumeName}</TableCell>
              <TableCell>{result.candidateName || <span className="text-muted-foreground italic">Not extracted</span>}</TableCell>
              <TableCell>
                {getAtsScoreBadge(result.atsScore)}
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onViewInsights(result)}
                  aria-label={`View insights for ${result.resumeName}`}
                  className="hover:text-primary transition-colors"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  View Insights
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
