import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GOOGLE_API_KEY, // Explicitly pass the API key
    }),
  ],
  model: 'googleai/gemini-2.0-flash',
});
