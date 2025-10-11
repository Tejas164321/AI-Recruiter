

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
  jobDescription: {
    id: string;
    name: string;
    contentDataUri: string;
    originalDocumentName: string;
  };
  resumes: Array<{ id: string, dataUri: string, name: string }>;
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
