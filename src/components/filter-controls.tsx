
"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import type { Filters, ExtractedJobRole } from "@/lib/types";
import { SlidersHorizontal, Search, Briefcase, Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface FilterControlsProps {
  filters: Filters;
  onFilterChange: (newFilters: Partial<Filters>) => void;
  onResetFilters: () => void;
  extractedJobRoles: ExtractedJobRole[];
  selectedJobRoleId: string | null;
  onJobRoleChange: (roleId: string | null) => void;
  isLoadingRoles: boolean;
}

export function FilterControls({
  filters,
  onFilterChange,
  onResetFilters,
  extractedJobRoles,
  selectedJobRoleId,
  onJobRoleChange,
  isLoadingRoles,
}: FilterControlsProps) {
  const handleScoreChange = (value: number[]) => {
    onFilterChange({ scoreRange: [value[0], value[1]] });
  };

  const handleKeywordChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({ skillKeyword: event.target.value });
  };

  const handleJobRoleSelectChange = (roleId: string) => {
    onJobRoleChange(roleId === "none" ? null : roleId);
  };

  return (
    <div className="p-6 rounded-lg border shadow-sm space-y-6 bg-card">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground flex items-center">
          <SlidersHorizontal className="w-5 h-5 mr-2 text-primary" />
          Filter Candidates
        </h3>
        <Button variant="ghost" size="sm" onClick={onResetFilters} disabled={isLoadingRoles}>
          Reset Filters
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <Label htmlFor="jobRoleSelect" className="text-sm font-medium text-foreground">
            Select Job Role
          </Label>
          <div className="relative mt-1">
             {isLoadingRoles ? (
                <div className="flex items-center justify-center h-10 border rounded-md bg-muted">
                    <Loader2 className="w-5 h-5 mr-2 animate-spin text-muted-foreground" />
                    <span className="text-muted-foreground">Loading Roles...</span>
                </div>
             ) : (
                <>
                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
                <Select
                    value={selectedJobRoleId || "none"}
                    onValueChange={handleJobRoleSelectChange}
                    disabled={extractedJobRoles.length === 0}
                >
                    <SelectTrigger id="jobRoleSelect" className="pl-10">
                    <SelectValue placeholder="Select a Job Role" />
                    </SelectTrigger>
                    <SelectContent>
                    {extractedJobRoles.length === 0 && (
                        <SelectItem value="none" disabled>
                            No job roles extracted. Upload JDs.
                        </SelectItem>
                    )}
                    {extractedJobRoles.map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                        {role.name}
                        </SelectItem>
                    ))}
                    </SelectContent>
                </Select>
                </>
             )}
          </div>
        </div>

        <div className="md:col-span-1">
          <Label htmlFor="skillKeyword" className="text-sm font-medium text-foreground">
            Search by Name/Skill
          </Label>
          <div className="relative mt-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="skillKeyword"
              type="text"
              placeholder="e.g., React, Python, John Doe"
              value={filters.skillKeyword}
              onChange={handleKeywordChange}
              className="pl-10"
              aria-label="Skill or name keyword filter"
              disabled={isLoadingRoles}
            />
          </div>
        </div>
        
        <div className="md:col-span-1">
          <Label htmlFor="scoreRange" className="text-sm font-medium text-foreground">
            Score Range: {filters.scoreRange[0]} - {filters.scoreRange[1]}
          </Label>
          <Slider
            id="scoreRange"
            min={0}
            max={100}
            step={1}
            value={[filters.scoreRange[0], filters.scoreRange[1]]}
            onValueChange={handleScoreChange}
            className="mt-3 pt-1"
            aria-label="Score range filter"
            disabled={isLoadingRoles}
          />
        </div>
      </div>
    </div>
  );
}
