
"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import type { Filters, ExtractedJobRole } from "@/lib/types";
import { SlidersHorizontal, Search, Briefcase, Loader2, RotateCw } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface FilterControlsProps {
  filters: Filters;
  onFilterChange: (newFilters: Partial<Filters>) => void;
  onResetFilters: () => void;
  extractedJobRoles: ExtractedJobRole[];
  selectedJobRoleId: string | null;
  onJobRoleChange: (roleId: string | null) => void;
  isLoadingRoles: boolean;
  onRefreshScreeningForRole: (roleId: string) => void;
}

export function FilterControls({
  filters,
  onFilterChange,
  onResetFilters,
  extractedJobRoles,
  selectedJobRoleId,
  onJobRoleChange,
  isLoadingRoles,
  onRefreshScreeningForRole,
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
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <h3 className="text-lg font-semibold text-foreground flex items-center">
          <SlidersHorizontal className="w-5 h-5 mr-2 text-primary" />
          Filter & Select Role
        </h3>
        <Button variant="ghost" size="sm" onClick={onResetFilters} disabled={isLoadingRoles}>
          Reset Filters
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
        {/* Column 1: Role Selection & Re-screen Button */}
        <div className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="jobRoleSelect" className="text-sm font-medium">
              Active Job Role
            </Label>
            <div className="flex items-center gap-2">
                {isLoadingRoles && !extractedJobRoles.length ? (
                    <div className="flex items-center justify-center h-10 border rounded-md bg-muted w-full">
                        <Loader2 className="w-5 h-5 mr-2 animate-spin text-muted-foreground" />
                        <span className="text-muted-foreground">Loading Roles...</span>
                    </div>
                ) : (
                  <>
                    <div className="relative flex-grow">
                      <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
                      <Select
                          value={selectedJobRoleId || "none"}
                          onValueChange={handleJobRoleSelectChange}
                          disabled={extractedJobRoles.length === 0 || isLoadingRoles}
                      >
                          <SelectTrigger id="jobRoleSelect" className="pl-10">
                          <SelectValue placeholder="Select a Job Role" />
                          </SelectTrigger>
                          <SelectContent>
                          {extractedJobRoles.length === 0 && (
                              <SelectItem value="none" disabled>
                                  No roles uploaded.
                              </SelectItem>
                          )}
                          {extractedJobRoles.map((role) => (
                              <SelectItem key={role.id} value={role.id}>
                              {role.name}
                              </SelectItem>
                          ))}
                          </SelectContent>
                      </Select>
                    </div>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            onClick={() => onRefreshScreeningForRole(selectedJobRoleId!)} 
                            disabled={isLoadingRoles || !selectedJobRoleId}
                            aria-label="Re-screen selected role"
                          >
                              <RotateCw className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Screen uploaded resumes against this role again.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </>
                )}
            </div>
          </div>
        </div>

        {/* Column 2: Filters */}
        <div className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="skillKeyword" className="text-sm font-medium">
              Search by Name/Skill/File
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="skillKeyword"
                type="text"
                placeholder="e.g., React, John Doe"
                value={filters.skillKeyword}
                onChange={handleKeywordChange}
                className="pl-10"
                aria-label="Skill, name, or filename keyword filter"
                disabled={isLoadingRoles || !selectedJobRoleId}
              />
            </div>
          </div>
          
          <div className="space-y-1">
            <Label htmlFor="scoreRange" className="text-sm font-medium">
              Match Score Range: {filters.scoreRange[0]} - {filters.scoreRange[1]}
            </Label>
            <Slider
              id="scoreRange"
              min={0}
              max={100}
              step={1}
              value={[filters.scoreRange[0], filters.scoreRange[1]]}
              onValueChange={handleScoreChange}
              className="pt-2"
              aria-label="Score range filter"
              disabled={isLoadingRoles || !selectedJobRoleId}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

    