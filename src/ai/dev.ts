
import { config } from 'dotenv';
config();

import '@/ai/flows/extract-job-roles';
import '@/ai/flows/rank-candidates'; // This now contains performBulkScreening
// import '@/ai/flows/generate-candidate-feedback.ts'; // This flow is not actively used by the UI now
import '@/ai/flows/generate-interview-questions'; // This flow is used by the feedback modal (being phased out)
import '@/ai/flows/generate-jd-interview-questions'; // New flow for standalone page
