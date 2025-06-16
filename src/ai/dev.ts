
import { config } from 'dotenv';
config();

import '@/ai/flows/rank-candidates.ts';
// import '@/ai/flows/generate-candidate-feedback.ts'; // This flow is not actively used by the UI now
import '@/ai/flows/generate-interview-questions.ts';
