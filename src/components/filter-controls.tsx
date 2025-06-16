
"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import type { Filters } from "@/lib/types";
import { SlidersHorizontal, Search, Briefcase } from "lucide-react";
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
  availableJobDescriptions: string[];
}

export function FilterControls({
  filters,
  onFilterChange,
  onResetFilters,
  availableJobDescriptions,
}: FilterControlsProps) {
  const handleScoreChange = (value: number[]) => {
    onFilterChange({ scoreRange: [value[0], value[1]] });
  };

  const handleKeywordChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({ skillKeyword: event.target.value });
  };

  const handleJobDescriptionChange = (value: string) => {
    onFilterChange({ selectedJobDescriptionName: value === "all" ? null : value });
  };

  return (
    <div className="p-6 rounded-lg border shadow-sm space-y-6 bg-card">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground flex items-center">
          <SlidersHorizontal className="w-5 h-5 mr-2 text-primary" />
          Filter Candidates
        </h3>
        <Button variant="ghost" size="sm" onClick={onResetFilters}>
          Reset Filters
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <Label htmlFor="jobDescriptionSelect" className="text-sm font-medium text-foreground">
            Job Description
          </Label>
          <div className="relative mt-1">
             <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Select
              value={filters.selectedJobDescriptionName || "all"}
              onValueChange={handleJobDescriptionChange}
              disabled={availableJobDescriptions.length === 0}
            >
              <SelectTrigger id="jobDescriptionSelect" className="pl-10">
                <SelectValue placeholder="Select Job Description" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Job Descriptions</SelectItem>
                {availableJobDescriptions.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
          />
        </div>
      </div>
    </div>
  );
}
