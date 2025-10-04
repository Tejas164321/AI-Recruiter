
"use client";

import { Dot } from "lucide-react";

/**
 * Props for the LoadingIndicator component.
 */
interface LoadingIndicatorProps {
  // The stage of processing to display a relevant message.
  stage: "roles" | "screening" | "general";
}

/**
 * A component to display a themed loading animation and message for long-running AI processes.
 * It shows different messages based on the `stage` prop.
 * @param {LoadingIndicatorProps} props - The component props.
 */
export function LoadingIndicator({ stage }: LoadingIndicatorProps) {
  let message = "Processing...";
  if (stage === "roles") {
    message = "AI is extracting job roles...";
  } else if (stage === "screening") {
    message = "AI is analyzing resumes and roles...";
  }

  return (
    <div className="flex flex-col items-center justify-center space-y-6 py-10 text-center">
      {/* The animated icon */}
      <div className="relative w-24 h-24 animation-path-container">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <Dot className="w-12 h-12 text-primary animate-bounce-infinity-loop" />
        </div>
      </div>

      {/* The loading messages */}
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
