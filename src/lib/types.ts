
import type { Timestamp } from 'firebase/firestore';

export interface JobDescriptionFile {
  id: string; // Client-side UUID before saving to DB
  file: File;
  dataUri: string;
  name: string;
}

export interface ResumeFile {
  id: string; // Client-side UUID
  file: File;
  dataUri: string;
  name: string;
}

// Represents a single, distinct job role extracted by AI, stored in Firestore
export interface ExtractedJobRole {
  id: string; // Firestore document ID (same as AI generated ID upon creation)
  name: string; // Display name (e.g., "Software Engineer")
  contentDataUri: string; // Data URI of the content specific to this role
  originalDocumentName: string; // Name of the original file it came from
  userId: string; // ID of the user who owns this job role
  createdAt: Timestamp;
}

export interface RankedCandidate {
  id: string; // Unique ID for this candidate entry, typically UUID from AI flow
  name: string;
  score: number;
  atsScore: number;
  keySkills: string;
  feedback: string;
  originalResumeName: string;
  resumeDataUri: string;
  // userId and createdAt are part of the parent JobScreeningResult
}

export interface Filters {
  scoreRange: [number, number];
  skillKeyword: string;
}

// Represents screening results for one job role, stored in Firestore
export interface JobScreeningResult {
  id: string; // Firestore document ID
  jobDescriptionId: string; // ID of the ExtractedJobRole this result is for
  jobDescriptionName: string; // Name of the job role
  jobDescriptionDataUri: string; // Data URI of the job role content used for ranking
  candidates: RankedCandidate[];
  userId: string;
  createdAt: Timestamp;
}

// Input for the bulk screening AI flow
export interface PerformBulkScreeningInput {
  jobRolesToScreen: Array<Omit<ExtractedJobRole, 'userId' | 'createdAt'>>;
  resumesToRank: ResumeFile[];
}

// Output for the bulk screening AI flow - This output is then transformed to JobScreeningResult for saving
export type PerformBulkScreeningOutput = Array<Omit<JobScreeningResult, 'id' | 'userId' | 'createdAt'>>;


// Result for a single resume's ATS score analysis, stored in Firestore
export interface AtsScoreResult {
  id: string; // Firestore document ID
  resumeId: string; // Original ID of the ResumeFile processed (can be used for local mapping if needed)
  resumeName: string;
  candidateName?: string;
  atsScore: number;
  atsFeedback: string;
  resumeDataUri: string; // Storing for display/re-analysis context if needed
  userId: string;
  createdAt: Timestamp;
}

// Represents a set of generated interview questions, stored in Firestore
export interface InterviewQuestionsSet {
    id: string; // Firestore document ID
    roleTitle: string; // The job title these questions are for
    jobDescriptionDataUri?: string; // Optional: if linked to a specific JD content
    focusAreas?: string;
    technicalQuestions: string[];
    behavioralQuestions: string[];
    situationalQuestions: string[];
    roleSpecificQuestions: string[];
    userId: string;
    createdAt: Timestamp;
}
