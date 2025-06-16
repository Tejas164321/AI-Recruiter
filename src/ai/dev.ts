
import { config } from 'dotenv';
config();

import '@/ai/flows/rank-candidates.ts';
import '@/ai/flows/generate-candidate-feedback.ts';
import '@/ai/flows/generate-interview-questions.ts';

