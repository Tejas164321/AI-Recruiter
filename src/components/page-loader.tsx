
"use client";
import { Loader2 } from 'lucide-react';

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
        <Loader2 className="w-16 h-16 text-primary animate-spin" />
        <p className="text-lg font-semibold text-primary">Loading...</p>
      </div>
    </div>
  );
}
