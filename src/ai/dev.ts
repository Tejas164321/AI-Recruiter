
// Import the 'config' function from the 'dotenv' package to load environment variables from a .env file.
import { config } from 'dotenv';
// Execute the config function to load the variables into the environment.
config();

// This file serves as the entry point for the Genkit development server.
// Its primary purpose is to import all the defined AI flows.
// Importing the flows registers them with Genkit, making them visible
// and testable in the Genkit developer UI.

// Import to register the flow for extracting job roles from documents.
import '@/ai/flows/extract-job-roles';
// Import to register the flow for ranking candidates against job roles.
import '@/ai/flows/rank-candidates';
// Import to register the flow for generating interview questions from a job description.
import '@/ai/flows/generate-jd-interview-questions';
// Import to register the flow for calculating a resume's Applicant Tracking System (ATS) score.
import '@/ai/flows/calculate-ats-score';
