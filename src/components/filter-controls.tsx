
"use client";

import React from "react";
// UI Components
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// Icons
import { Search, RotateCw, History } from "lucide-react";
// Types
import type { Filters, ExtractedJobRole } from "@/lib/types";

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
  onViewHistory: () => void;
  isHistoryAvailable: boolean;
  isLoading: boolean;
}

/**
 * A component that provides UI controls for filtering and selecting job roles.
 */
export function FilterControls({
  filters,
  onFilterChange,
  onResetFilters,
  extractedJobRoles,
  selectedJobRoleId,
  onJobRoleChange,
  onViewHistory,
  isHistoryAvailable,
  isLoading,
}: FilterControlsProps) {

  const handleScoreChange = (value: number[]) => onFilterChange({ scoreRange: [value[0], value[1]] });
  const handleKeywordChange = (event: React.ChangeEvent<HTMLInputElement>) => onFilterChange({ skillKeyword: event.target.value });
  const handleJobRoleSelectChange = (roleId: string) => onJobRoleChange(roleId === "none" ? null : roleId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <h3 className="text-lg font-semibold text-foreground flex items-center">
            Screening Session & Filters
          </h3>
          <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={onViewHistory} disabled={isLoading || !isHistoryAvailable}>
                  <History className="w-4 h-4 mr-2" /> View History
              </Button>
              <Button variant="ghost" size="sm" onClick={onResetFilters} disabled={isLoading}>
                  <RotateCw className="w-4 h-4 mr-2" /> Reset Filters
              </Button>
          </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
          
          {/* Column 1: Job Role Selection */}
          <div className="space-y-2 lg:col-span-1">
          <Label htmlFor="jobRoleSelect">Active Job Role</Label>
          <Select value={selectedJobRoleId || "none"} onValueChange={handleJobRoleSelectChange} disabled={isLoading || extractedJobRoles.length === 0}>
              <SelectTrigger id="jobRoleSelect"><SelectValue placeholder="Select a Job Role..." /></SelectTrigger>
              <SelectContent>
              <SelectItem value="none" disabled={!selectedJobRoleId}>Select a Job Role...</SelectItem>
              {extractedJobRoles.map((role) => (<SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>))}
              </SelectContent>
          </Select>
          </div>

          {/* Column 2: Keyword Filter */}
          <div className="space-y-2 lg:col-span-1">
              <Label htmlFor="skillKeyword">Search by Name/Skill/File</Label>
              <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input id="skillKeyword" type="text" placeholder="e.g., React, John Doe..." value={filters.skillKeyword} onChange={handleKeywordChange} className="pl-10" disabled={isLoading}/>
              </div>
          </div>
          
          {/* Column 3: Score Range Filter */}
          <div className="space-y-2 lg:col-span-1">
          <Label htmlFor="scoreRange">Match Score Range: {filters.scoreRange[0]} - {filters.scoreRange[1]}</Label>
          <Slider id="scoreRange" min={0} max={100} step={1} value={[filters.scoreRange[0], filters.scoreRange[1]]} onValueChange={handleScoreChange} className="pt-2" disabled={isLoading}/>
          </div>
      </div>
    </div>
  );
}
