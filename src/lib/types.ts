
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
  name: string; // Added name for consistency
}

export interface RankedCandidate {
  id: string;
  name: string; // Candidate's name, extracted by AI
  score: number; // Score against a specific job description
  atsScore: number;
  keySkills: string;
  feedback: string;
  originalResumeName: string; // Original file name of the resume
  resumeDataUri: string; // Data URI of the resume content
}

export interface Filters {
  scoreRange: [number, number];
  skillKeyword: string;
}

// New type for the output of the rankCandidates flow
export interface JobScreeningResult {
  jobDescriptionName: string;
  jobDescriptionDataUri: string;
  candidates: RankedCandidate[]; // Candidates ranked against this specific job description
}
