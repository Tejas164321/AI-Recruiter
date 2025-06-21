
"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import type { Filters, ExtractedJobRole, JobScreeningResult } from "@/lib/types";
import { SlidersHorizontal, Search, Briefcase, Loader2, Trash2, RotateCw, Database } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Timestamp } from "firebase/firestore";


interface FilterControlsProps {
  filters: Filters;
  onFilterChange: (newFilters: Partial<Filters>) => void;
  onResetFilters: () => void;
  extractedJobRoles: ExtractedJobRole[];
  selectedJobRoleId: string | null;
  onJobRoleChange: (roleId: string | null) => void;
  isLoadingRoles: boolean;
  onDeleteJobRole: (roleId: string) => void;
  onRefreshScreeningForRole: (roleId: string) => void;
  screeningsForRole: JobScreeningResult[];
  selectedScreeningId: string | null;
  onScreeningChange: (screeningId: string | null) => void;
}

export function FilterControls({
  filters,
  onFilterChange,
  onResetFilters,
  extractedJobRoles,
  selectedJobRoleId,
  onJobRoleChange,
  isLoadingRoles,
  onDeleteJobRole,
  onRefreshScreeningForRole,
  screeningsForRole,
  selectedScreeningId,
  onScreeningChange,
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

  const selectedRoleName = extractedJobRoles.find(r => r.id === selectedJobRoleId)?.name || "Selected Role";

  return (
    <div className="p-6 rounded-lg border shadow-sm space-y-6 bg-card">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <h3 className="text-lg font-semibold text-foreground flex items-center">
          <SlidersHorizontal className="w-5 h-5 mr-2 text-primary" />
          Filter & Manage Roles
        </h3>
        <Button variant="ghost" size="sm" onClick={onResetFilters} disabled={isLoadingRoles}>
          Reset Filters
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
        {/* Job Role Selector */}
        <div className="space-y-1">
          <Label htmlFor="jobRoleSelect" className="text-sm font-medium text-foreground">
            Active Job Role
          </Label>
          <div className="relative">
             {isLoadingRoles && !extractedJobRoles.length ? (
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
                    disabled={extractedJobRoles.length === 0 || isLoadingRoles}
                >
                    <SelectTrigger id="jobRoleSelect" className="pl-10">
                    <SelectValue placeholder="Select a Job Role" />
                    </SelectTrigger>
                    <SelectContent>
                    {extractedJobRoles.length === 0 && (
                        <SelectItem value="none" disabled>
                            No job roles. Upload JDs.
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
           {selectedJobRoleId && (
            <div className="mt-2 flex gap-2">
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="text-destructive hover:text-destructive hover:border-destructive/50 flex-1" disabled={isLoadingRoles}>
                            <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete Role
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                        <AlertDialogTitle>Delete "{selectedRoleName}"?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the job role and all its associated screening results. This action cannot be undone.
                        </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => onDeleteJobRole(selectedJobRoleId)} className="bg-destructive hover:bg-destructive/90">
                            Delete
                        </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="sm" onClick={() => onRefreshScreeningForRole(selectedJobRoleId)} disabled={isLoadingRoles} className="flex-1">
                          <RotateCw className="w-3.5 h-3.5 mr-1.5" /> Re-screen Role
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Screen newly uploaded resumes against this role.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
            </div>
            )}
        </div>

        {/* Screening History Selector */}
        <div className="space-y-1">
            <Label htmlFor="screeningHistorySelect" className="text-sm font-medium text-foreground">
                Screening History
            </Label>
            <div className="relative">
                <Database className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
                <Select
                    value={selectedScreeningId || "none"}
                    onValueChange={(val) => onScreeningChange(val === "none" ? null : val)}
                    disabled={isLoadingRoles || screeningsForRole.length === 0}
                >
                    <SelectTrigger id="screeningHistorySelect" className="pl-10">
                        <SelectValue placeholder="Select a screening..." />
                    </SelectTrigger>
                    <SelectContent>
                        {screeningsForRole.length === 0 ? (
                            <SelectItem value="none" disabled>
                                {selectedJobRoleId ? "No history for this role." : "Select a role first."}
                            </SelectItem>
                        ) : (
                            screeningsForRole.map((screening) => (
                                <SelectItem key={screening.id} value={screening.id}>
                                    {new Date((screening.createdAt as Timestamp).seconds * 1000).toLocaleString()} ({screening.candidates.length} candidates)
                                </SelectItem>
                            ))
                        )}
                    </SelectContent>
                </Select>
            </div>
        </div>

        {/* Search by Keyword */}
        <div className="space-y-1">
          <Label htmlFor="skillKeyword" className="text-sm font-medium text-foreground">
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
        
        {/* Score Range Slider */}
        <div className="space-y-1">
          <Label htmlFor="scoreRange" className="text-sm font-medium text-foreground">
            Match Score Range: {filters.scoreRange[0]} - {filters.scoreRange[1]}
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
            disabled={isLoadingRoles || !selectedJobRoleId}
          />
        </div>
      </div>
    </div>
  );
}
