
"use client";

import React from "react";
// UI Components
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
// Icons
import { SlidersHorizontal, Search, Briefcase, RotateCw, History, Trash2 } from "lucide-react";
// Types
import type { Filters, ExtractedJobRole, JobScreeningResult } from "@/lib/types";

/**
 * Props for the FilterControls component.
 */
interface FilterControlsProps {
  filters: Filters;
  onFilterChange: (newFilters: Partial<Filters>) => void;
  onResetFilters: () => void;
  extractedJobRoles: ExtractedJobRole[];
  selectedJobRoleId: string | null;
  onJobRoleChange: (roleId: string | null) => void;
  isLoading: boolean;
  screeningHistory: JobScreeningResult[];
  selectedHistoryId: string | null;
  onHistoryChange: (historyId: string | null) => void;
  onDeleteHistory: (historyId: string) => void;
}

/**
 * A component that provides UI controls for filtering and selecting job roles and screening history.
 * @param {FilterControlsProps} props - The component props.
 */
export function FilterControls({
  filters,
  onFilterChange,
  onResetFilters,
  extractedJobRoles,
  selectedJobRoleId,
  onJobRoleChange,
  isLoading,
  screeningHistory,
  selectedHistoryId,
  onHistoryChange,
  onDeleteHistory,
}: FilterControlsProps) {

  // Handlers to update parent state when filter values change.
  const handleScoreChange = (value: number[]) => onFilterChange({ scoreRange: [value[0], value[1]] });
  const handleKeywordChange = (event: React.ChangeEvent<HTMLInputElement>) => onFilterChange({ skillKeyword: event.target.value });
  const handleJobRoleSelectChange = (roleId: string) => onJobRoleChange(roleId === "none" ? null : roleId);
  const handleHistorySelectChange = (historyId: string) => onHistoryChange(historyId === "none" ? null : historyId);

  const hasHistory = screeningHistory && screeningHistory.length > 0;

  return (
    <div className="p-6 rounded-lg border shadow-sm space-y-6 bg-card">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <h3 className="text-lg font-semibold text-foreground flex items-center">
          <SlidersHorizontal className="w-5 h-5 mr-2 text-primary" />
          Filter & Select Role
        </h3>
        <Button variant="ghost" size="sm" onClick={onResetFilters} disabled={isLoading}>
          <RotateCw className="w-4 h-4 mr-2" />
          Reset Filters
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-x-8 gap-y-6">
        
        {/* Column 1: Selections (Job Role and History) */}
        <div className="space-y-4">
           <div className="space-y-2">
            <Label htmlFor="jobRoleSelect">Job Role</Label>
            <div className="relative">
              <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
              <Select value={selectedJobRoleId || "none"} onValueChange={handleJobRoleSelectChange} disabled={isLoading || extractedJobRoles.length === 0}>
                  <SelectTrigger id="jobRoleSelect" className="pl-10"><SelectValue placeholder="Select a Job Role..." /></SelectTrigger>
                  <SelectContent>
                  <SelectItem value="none" disabled={!selectedJobRoleId}>Select a Job Role...</SelectItem>
                  {extractedJobRoles.map((role) => (<SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>))}
                  </SelectContent>
              </Select>
            </div>
          </div>
          {hasHistory && (
          <div className="space-y-2">
             <Label htmlFor="historySelect">Screening History</Label>
            <div className="flex items-center gap-2">
              <div className="relative flex-grow">
                <History className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
                <Select value={selectedHistoryId || "none"} onValueChange={handleHistorySelectChange} disabled={isLoading || screeningHistory.length === 0}>
                    <SelectTrigger id="historySelect" className="pl-10"><SelectValue placeholder="Select a session..." /></SelectTrigger>
                    <SelectContent>
                    <SelectItem value="none" disabled>Select a session...</SelectItem>
                    {screeningHistory.map((hist) => (<SelectItem key={hist.id} value={hist.id}>{hist.createdAt.toDate().toLocaleString()}</SelectItem>))}
                    </SelectContent>
                </Select>
              </div>
               <TooltipProvider><Tooltip><TooltipTrigger asChild>
                    <Button variant="outline" size="icon" onClick={() => { if (selectedHistoryId) onDeleteHistory(selectedHistoryId) }} disabled={!selectedHistoryId || isLoading} className="shrink-0 text-destructive hover:bg-destructive/10" aria-label="Delete selected history">
                        <Trash2 className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger><TooltipContent><p>Delete selected session</p></TooltipContent></Tooltip></TooltipProvider>
            </div>
          </div>
          )}
        </div>

        {/* Column 2: Filters (Keyword and Score) */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="skillKeyword">Search by Name/Skill/File</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input id="skillKeyword" type="text" placeholder="e.g., React, John Doe" value={filters.skillKeyword} onChange={handleKeywordChange} className="pl-10" disabled={isLoading || !selectedJobRoleId}/>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="scoreRange">Match Score Range: {filters.scoreRange[0]} - {filters.scoreRange[1]}</Label>
            <Slider id="scoreRange" min={0} max={100} step={1} value={[filters.scoreRange[0], filters.scoreRange[1]]} onValueChange={handleScoreChange} className="pt-2" disabled={isLoading || !selectedJobRoleId}/>
          </div>
        </div>
      </div>
    </div>
  );
}

    