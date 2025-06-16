"use client";

import { BrainCircuit } from "lucide-react";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        <div className="mr-4 flex items-center">
          <BrainCircuit className="h-8 w-8 mr-2 text-primary" />
          <span className="text-2xl font-bold text-primary font-headline">ResumeRank AI</span>
        </div>
        {/* Add navigation items here if needed in the future */}
      </div>
    </header>
  );
}
