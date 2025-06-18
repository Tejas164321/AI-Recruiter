
import type { Timestamp } from 'firebase/firestore';

export interface JobDescriptionFile {
  // This type is primarily for file upload handling, not direct Firestore storage.
  // Firestore will store ExtractedJobRole.
  id: string;
  file: File;
  dataUri: string;
  name: string;
}

export interface ResumeFile {
  // This type is primarily for file upload handling.
  // Resume data (URI, name) will be part of RankedCandidate within JobScreeningResult.
  id: string;
  file: File;
  dataUri: string;
  name: string;
}

// Represents a single, distinct job role stored in Firestore
export interface ExtractedJobRole {
  id: string; // Firestore document ID
  userId: string; // ID of the user who owns this job role
  name: string; // Display name (e.g., "Software Engineer")
  contentDataUri: string; // Data URI of the content specific to this role
  originalDocumentName: string; // Name of the original file it came from
  createdAt: Timestamp;
}

export interface RankedCandidate {
  // This structure remains largely the same but will be part of JobScreeningResult in Firestore.
  id: string; // Unique ID for this candidate entry within a screening result
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
}

// Stored in Firestore, representing screening results for one job role
export interface JobScreeningResult {
  id: string; // Firestore document ID
  userId: string;
  jobDescriptionId: string; // ID of the ExtractedJobRole this result is for
  jobDescriptionName: string; // Name of the job role
  jobDescriptionDataUri: string; // Data URI of the job role content used for ranking
  candidates: RankedCandidate[];
  createdAt: Timestamp;
}

// Input for the bulk screening AI flow (remains the same, uses pre-Firestore types)
export interface PerformBulkScreeningInput {
  jobRolesToScreen: Array<Omit<ExtractedJobRole, 'userId' | 'createdAt' | 'id'> & { id: string }>; // AI flow expects this structure
  resumesToRank: ResumeFile[];
}

// Output for the bulk screening AI flow (remains the same)
export type PerformBulkScreeningOutput = Array<Omit<JobScreeningResult, 'userId' | 'createdAt' | 'id'> & { jobDescriptionId: string }>;


// Stored in Firestore, result for a single resume's ATS score analysis
export interface AtsScoreResult {
  id: string; // Firestore document ID
  userId: string;
  resumeId: string; // Original ID of the ResumeFile processed
  resumeName: string;
  candidateName?: string;
  atsScore: number;
  atsFeedback: string;
  resumeDataUri: string;
  createdAt: Timestamp;
}

// Represents a set of generated interview questions stored in Firestore
export interface InterviewQuestionsSet {
    id: string; // Firestore document ID
    userId: string;
    roleTitle: string; // The job title these questions are for
    jobDescriptionDataUri?: string; // Optional: if linked to a specific JD content
    focusAreas?: string;
    technicalQuestions: string[];
    behavioralQuestions: string[];
    situationalQuestions: string[];
    roleSpecificQuestions: string[];
    createdAt: Timestamp;
}
