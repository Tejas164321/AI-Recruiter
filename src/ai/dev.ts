
import { config } from 'dotenv';
config();

import '@/ai/flows/extract-job-roles';
import '@/ai/flows/rank-candidates'; // This now contains performBulkScreening
import '@/ai/flows/generate-jd-interview-questions'; // New flow for standalone page
import '@/ai/flows/calculate-ats-score'; // New flow for ATS Score Finder
