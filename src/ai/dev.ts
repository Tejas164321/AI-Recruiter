
import { config } from 'dotenv';
config();

import '@/ai/flows/rank-candidates.ts';
// import '@/ai/flows/generate-candidate-feedback.ts'; // This flow appears unused in the main ranking path
import '@/ai/flows/generate-interview-questions.ts';
