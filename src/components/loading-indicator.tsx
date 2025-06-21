
"use client";

import { BrainCircuit } from "lucide-react";

interface LoadingIndicatorProps {
  stage: "roles" | "screening" | "general";
}

export function LoadingIndicator({ stage }: LoadingIndicatorProps) {
  let message = "Processing...";
  if (stage === "roles") {
    message = "Extracting job roles...";
  } else if (stage === "screening") {
    message = "AI is analyzing resumes and roles...";
  }

  return (
    <div className="flex flex-col items-center justify-center space-y-6 py-10 text-center">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 bg-primary rounded-full animate-pulse opacity-30"></div>
        <BrainCircuit className="absolute inset-0 w-full h-full text-primary animate-spin" />
      </div>

      <div>
        <p className="text-xl font-semibold text-primary">
          {message}
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          This may take a few moments. Please be patient.
        </p>
      </div>
    </div>
  );
}
