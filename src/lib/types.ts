
// This file contains TypeScript interfaces for the main data structures used throughout the application.
// Using well-defined types helps ensure data consistency and provides excellent developer experience with autocompletion.

import type { Timestamp } from 'firebase/firestore';

/**
 * Represents a job description file uploaded by the user on the client-side.
 */
export interface JobDescriptionFile {
  id: string; // A client-side generated UUID.
  file: File; // The raw File object from the browser.
  dataUri: string; // The file content encoded as a data URI.
  name: string; // The original name of the file.
}

/**
 * Represents a resume file uploaded by the user on the client-side.
 */
export interface ResumeFile {
  id: string; // A client-side generated UUID.
  file: File; // The raw File object from the browser.
  dataUri: string; // The file content encoded as a data URI.
  name: string; // The original name of the file.
}

/**
 * Represents a single, distinct job role that has been extracted by the AI
 * and is intended to be stored in Firestore.
 */
export interface ExtractedJobRole {
  id: string; // The Firestore document ID.
  name: string; // The display name of the role (e.g., "Senior Software Engineer").
  contentDataUri: string; // The data URI of the content specific to this role.
  originalDocumentName: string; // The name of the file it was extracted from.
  userId: string; // The ID of the user who owns this job role.
  createdAt: Timestamp; // The timestamp of when the role was created.
}

/**
 * Represents a single candidate's ranking and feedback against a specific job role.
 * This is typically part of a larger JobScreeningResult.
 * 
 * Progressive Enhancement: Supports two-phase processing where deterministic scores
 * are calculated first, then AI feedback is added asynchronously.
 */
export interface RankedCandidate {
  id: string; // A unique ID for this specific ranking entry.
  name: string; // The candidate's name as extracted by the AI.
  email?: string; // The candidate's email, if extracted.
  score: number; // The match score (0-100) against the job description.
  atsScore: number; // The ATS compatibility score (0-100).
  keySkills: string; // A comma-separated string of key skills that matched.
  feedback: string; // Detailed AI-generated feedback.
  originalResumeName: string; // The original filename of the resume.
  resumeDataUri: string; // The data URI of the resume content.

  // Progressive Enhancement Fields
  feedbackStatus?: 'pending' | 'generating' | 'complete' | 'failed'; // Status of AI feedback
  feedbackGeneratedAt?: Timestamp; // When AI feedback was generated
  processingPriority?: number; // Higher score = process first (equals score value)
  detailedFeedback?: DetailedAIFeedback; // Rich structured feedback
}

/**
 * Detailed structured AI feedback with improvements and gap analysis.
 * Generated in Phase 2 of progressive enhancement.
 */
export interface DetailedAIFeedback {
  summary: string; // Overall assessment (e.g., "Strong match for Senior Developer")

  matchedSkills: string[]; // Skills found in resume
  matchedExperience: string; // Experience level match explanation

  missingSkills: string[]; // Skills mentioned in JD but not in resume
  missingExperience?: string; // Experience gaps

  improvements: string[]; // Specific actionable improvements
  scoreImpact?: string; // How improvements could affect score

  concerns: string[]; // Red flags or concerns
  strengths: string[]; // Candidate's key strengths

  scoreExplanation: string; // Why this score was given
}

/**
 * Represents the state of the filter controls on the Resume Ranker page.
 */
export interface Filters {
  scoreRange: [number, number]; // The min and max score for filtering.
  skillKeyword: string; // The keyword for searching by name, skill, or filename.
}

/**
 * Represents the complete results of a screening session for one job role,
 * as stored in Firestore.
 */
export interface JobScreeningResult {
  id: string; // The Firestore document ID for this screening session.
  jobDescriptionId: string; // The ID of the ExtractedJobRole this result is for.
  jobDescriptionName: string; // The name of the job role (denormalized for easy display).
  jobDescriptionDataUri: string; // The data URI of the job role content used for this specific ranking.
  candidates: RankedCandidate[]; // An array of all candidates ranked in this session.
  userId: string; // The ID of the user who owns this result.
  createdAt: Timestamp; // The timestamp of when the screening was performed.
}

/**
 * Represents the input for the bulk screening AI flow.
 */
export interface PerformBulkScreeningInput {
  jobRolesToScreen: Array<Omit<ExtractedJobRole, 'userId' | 'createdAt'>>; // The job roles to screen against.
  resumesToRank: ResumeFile[]; // The resumes to be ranked.
}

/**

 * Represents the output from the bulk screening AI flow. This is then transformed
 * into a JobScreeningResult for storage in Firestore.
 */
export type PerformBulkScreeningOutput = Array<Omit<JobScreeningResult, 'id' | 'userId' | 'createdAt'>>;

/**
 * Represents the result of a single resume's ATS score analysis, as stored in Firestore.
 */
export interface AtsScoreResult {
  id: string; // The Firestore document ID.
  resumeId: string; // The original client-side ID of the ResumeFile processed.
  resumeName: string; // The original filename of the resume.
  candidateName?: string; // The candidate's name, if extracted.
  atsScore: number; // The calculated ATS score.
  atsFeedback: string; // Detailed feedback on ATS compatibility.
  resumeDataUri: string; // The data URI of the resume, stored for context.
  userId: string; // The ID of the user who owns this result.
  createdAt: Timestamp; // The timestamp of when the analysis was performed.
}

/**
 * Represents a set of generated interview questions for a specific role,
 * as stored in Firestore.
 */
export interface InterviewQuestionsSet {
  id: string; // The Firestore document ID.
  roleTitle: string; // The job title these questions are for.
  jobDescriptionDataUri?: string; // Optional link to the specific JD content used.
  focusAreas?: string; // Optional focus areas provided by the user.
  technicalQuestions: string[];
  behavioralQuestions: string[];
  situationalQuestions: string[];
  roleSpecificQuestions: string[];
  userId: string; // The ID of the user who owns this set.
  createdAt: Timestamp; // The timestamp of when the questions were generated.
}

// ============================================
// Processing Types for Robust Bulk Operations
// ============================================

/**
 * Real-time progress information for bulk screening operations.
 */
export interface ProcessingProgress {
  /** Current item being processed (1-indexed) */
  current: number;
  /** Total number of items to process */
  total: number;
  /** Number of items successfully processed */
  succeeded: number;
  /** Number of items that failed */
  failed: number;
  /** Current batch number (if batching is used) */
  currentBatch?: number;
  /** Total number of batches */
  totalBatches?: number;
  /** Percentage complete (0-100) */
  percentComplete: number;
  /** Human-readable status message */
  status: string;
  /** Estimated time remaining in seconds */
  estimatedTimeRemaining?: number;
}

/**
 * Detailed error information for failed processing items.
 */
export interface ProcessingError {
  /** Index of the failed item in the original array */
  index: number;
  /** ID of the resume that failed */
  resumeId: string;
  /** Name of the resume file */
  resumeName: string;
  /** Error message */
  message: string;
  /** Error type for categorization */
  type: 'rate_limit' | 'timeout' | 'parse_error' | 'api_error' | 'unknown';
  /** Whether this error is retryable */
  retryable: boolean;
  /** Number of retry attempts made */
  retryAttempts?: number;
}

/**
 * Configuration options for bulk screening processing.
 */
export interface BulkScreeningOptions {
  /** Maximum concurrent API calls (default: 3) */
  concurrency?: number;
  /** Maximum retry attempts per resume (default: 3) */
  maxRetries?: number;
  /** Enable adaptive rate limiting based on error rates (default: true) */
  adaptiveRateLimiting?: boolean;
  /** Progress callback for real-time updates */
  onProgress?: (progress: ProcessingProgress) => void;
}

/**
 * Extended output from bulk screening with partial results and error tracking.
 */
export interface BulkScreeningResultWithErrors {
  /** Results for each job role (same as PerformBulkScreeningOutput) */
  results: PerformBulkScreeningOutput;
  /** Detailed errors for any failed resumes */
  errors: ProcessingError[];
  /** Processing statistics */
  stats: {
    totalResumes: number;
    successfulResumes: number;
    failedResumes: number;
    totalTimeMs: number;
    averageTimePerResume: number;
  };
  /** Whether any items failed (true if errors.length > 0) */
  hasErrors: boolean;
  /** Whether partial results are available */
  partialResults: boolean;
}
