
"use client";

import { BrainCircuit, Users, Briefcase, BarChartBig, Loader2 } from "lucide-react";

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
    <div className="flex flex-col items-center justify-center space-y-8 py-10 text-center">
      <div className="relative">
        <BrainCircuit className="w-20 h-20 text-primary opacity-70 animate-spin [animation-duration:4s] [animation-timing-function:linear]" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-28 h-28 border-2 border-primary/30 rounded-full animate-pulse [animation-duration:2s]"></div>
        </div>
      </div>

      <div className="flex items-center space-x-6">
        <Briefcase className="w-10 h-10 text-muted-foreground animate-pulse [animation-delay:0ms] [animation-duration:1.5s]" />
        <Users className="w-10 h-10 text-muted-foreground animate-pulse [animation-delay:300ms] [animation-duration:1.5s]" />
        <BarChartBig className="w-10 h-10 text-muted-foreground animate-pulse [animation-delay:600ms] [animation-duration:1.5s]" />
      </div>

      <div>
        <p className="text-xl font-semibold text-primary mt-2">
          {message}
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          This may take a few moments. Please be patient.
        </p>
      </div>
    </div>
  );
}
