"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import type { Filters } from "@/lib/types";
import { SlidersHorizontal, Search } from "lucide-react";

interface FilterControlsProps {
  filters: Filters;
  onFilterChange: (newFilters: Partial<Filters>) => void;
  onResetFilters: () => void;
}

export function FilterControls({ filters, onFilterChange, onResetFilters }: FilterControlsProps) {
  const handleScoreChange = (value: number[]) => {
    onFilterChange({ scoreRange: [value[0], value[1]] });
  };

  const handleKeywordChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({ skillKeyword: event.target.value });
  };

  return (
    <div className="p-6 rounded-lg border shadow-sm space-y-6 bg-card">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground flex items-center">
          <SlidersHorizontal className="w-5 h-5 mr-2 text-primary" />
          Filter Candidates
        </h3>
        <Button variant="ghost" size="sm" onClick={onResetFilters}>Reset Filters</Button>
      </div>
      
      <div className="space-y-4">
        <div>
          <Label htmlFor="scoreRange" className="text-sm font-medium text-foreground">Score Range: {filters.scoreRange[0]} - {filters.scoreRange[1]}</Label>
          <Slider
            id="scoreRange"
            min={0}
            max={100}
            step={1}
            value={[filters.scoreRange[0], filters.scoreRange[1]]}
            onValueChange={handleScoreChange}
            className="mt-2"
            aria-label="Score range filter"
          />
        </div>
        
        <div>
          <Label htmlFor="skillKeyword" className="text-sm font-medium text-foreground">Search by Skill Keyword</Label>
          <div className="relative mt-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="skillKeyword"
              type="text"
              placeholder="e.g., React, Python, Project Management"
              value={filters.skillKeyword}
              onChange={handleKeywordChange}
              className="pl-10"
              aria-label="Skill keyword filter"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
