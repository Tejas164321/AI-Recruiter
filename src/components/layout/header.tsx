
"use client";

import { BrainCircuit } from "lucide-react";
import { ThemeToggleButton } from "@/components/theme-toggle-button";
import Link from "next/link";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        <Link href="/" className="mr-4 flex items-center cursor-pointer" aria-label="Go to homepage, scroll to top">
          <BrainCircuit className="h-8 w-8 mr-2 text-primary" />
          <span className="text-2xl font-bold text-primary font-headline">ResumeRank AI</span>
        </Link>
        <div className="ml-auto flex items-center space-x-4">
          <ThemeToggleButton />
        </div>
      </div>
    </header>
  );
}
