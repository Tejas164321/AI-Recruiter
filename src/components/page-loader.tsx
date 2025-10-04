
"use client";
import { Send } from 'lucide-react';

/**
 * A full-screen overlay loader component.
 * It's used to block the UI and indicate that a page is loading,
 * for example, during navigation between feature pages.
 */
export function PageLoader() {
  return (
    // The fixed, full-screen container with a semi-transparent backdrop
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4">
        {/* The animated icon */}
        <div className="relative w-20 h-20">
            <Send className="w-20 h-20 text-primary animate-fly-in-loop" />
        </div>
        <p className="text-lg font-semibold text-primary">Loading...</p>
      </div>
    </div>
  );
}
