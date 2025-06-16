
import { config } from 'dotenv';
config();

import '@/ai/flows/extract-job-roles';
import '@/ai/flows/rank-candidates';
// import '@/ai/flows/generate-candidate-feedback.ts'; // This flow is not actively used by the UI now
import '@/ai/flows/generate-interview-questions';
