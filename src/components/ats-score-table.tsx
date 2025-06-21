
"use client";

import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Eye, ShieldCheck, FileText, User, Calendar, Trash2 } from "lucide-react";
import type { AtsScoreResult } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Timestamp } from "firebase/firestore";

interface AtsScoreTableProps {
  results: AtsScoreResult[];
  onViewInsights: (result: AtsScoreResult) => void;
  onDelete: (result: AtsScoreResult) => void;
}

export function AtsScoreTable({ results, onViewInsights, onDelete }: AtsScoreTableProps) {
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
    return <p className="text-center text-muted-foreground py-8">No results to display.</p>;
  }

  return (
    <div className="rounded-lg border shadow-sm bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[5%] text-center">#</TableHead>
            <TableHead className="w-[30%]">
              <div className="flex items-center">
                <FileText className="w-4 h-4 mr-1 text-muted-foreground" /> Resume File
              </div>
            </TableHead>
            <TableHead className="w-[20%]">
              <div className="flex items-center">
                <User className="w-4 h-4 mr-1 text-muted-foreground" /> Candidate Name
              </div>
            </TableHead>
            <TableHead className="w-[15%]">
              <div className="flex items-center">
                <ShieldCheck className="w-4 h-4 mr-1 text-muted-foreground" /> ATS Score
              </div>
            </TableHead>
            <TableHead className="w-[15%]">
              <div className="flex items-center">
                <Calendar className="w-4 h-4 mr-1 text-muted-foreground" /> Date Analyzed
              </div>
            </TableHead>
            <TableHead className="text-right w-[15%]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {results.map((result, index) => (
            <TableRow key={result.id || index} className="transition-colors hover:bg-muted/50">
              <TableCell className="font-medium text-center">{index + 1}</TableCell>
              <TableCell className="font-medium truncate" title={result.resumeName}>{result.resumeName}</TableCell>
              <TableCell>{result.candidateName || <span className="text-muted-foreground italic">Not extracted</span>}</TableCell>
              <TableCell>
                {getAtsScoreBadge(result.atsScore)}
              </TableCell>
               <TableCell>
                {result.createdAt instanceof Timestamp ? result.createdAt.toDate().toLocaleDateString() : 'N/A'}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onViewInsights(result)}
                    aria-label={`View insights for ${result.resumeName}`}
                    className="hover:text-primary transition-colors"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Insights
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(result)}
                    aria-label={`Delete result for ${result.resumeName}`}
                    className="hover:text-destructive transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
