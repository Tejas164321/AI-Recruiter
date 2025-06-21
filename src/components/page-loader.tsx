
"use client";
import { BrainCircuit } from 'lucide-react';

export function PageLoader() {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-20 h-20">
          <div className="absolute inset-0 bg-primary rounded-full animate-pulse [animation-duration:1.5s] opacity-50"></div>
          <BrainCircuit className="absolute inset-0 w-full h-full text-primary animate-spin [animation-duration:2.5s]" />
        </div>
        <p className="text-lg font-semibold text-primary">Loading...</p>
      </div>
    </div>
  );
}
