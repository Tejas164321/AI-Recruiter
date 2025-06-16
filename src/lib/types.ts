
export interface JobDescriptionFile {
  id: string;
  file: File;
  dataUri: string;
  name: string;
}

export interface ResumeFile {
  id: string;
  file: File;
  dataUri: string;
  name: string;
}

// Represents a single, distinct job role extracted from an uploaded document
export interface ExtractedJobRole {
  id: string; // Unique ID for this extracted role
  name: string; // Display name for the dropdown (e.g., "JD_File.pdf - Software Engineer")
  contentDataUri: string; // Data URI of the content specific to this role
  originalDocumentName: string; // Name of the original file it came from
}

export interface RankedCandidate {
  id: string;
  name: string;
  score: number;
  atsScore: number;
  keySkills: string;
  feedback: string;
  originalResumeName: string;
  resumeDataUri: string;
}

// Filters apply to the candidates ranked for the currently selected job role
export interface Filters {
  scoreRange: [number, number];
  skillKeyword: string;
  // selectedJobDescriptionName is now handled by selectedJobRoleId directly in page state
}

// Output for ranking candidates against a SINGLE job description
export interface JobScreeningResult {
  jobDescriptionName: string; // Name of the job role against which candidates were ranked
  jobDescriptionDataUri: string; // Data URI of the job role content used for ranking
  candidates: RankedCandidate[];
}
