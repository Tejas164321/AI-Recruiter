
// Import the main 'genkit' function from the Genkit library.
import {genkit} from 'genkit';
// Import the Google AI plugin for Genkit, which allows interaction with Google's AI models like Gemini.
import {googleAI} from '@genkit-ai/googleai';

/**
 * Initializes and configures the global Genkit instance for the application.
 * This 'ai' object is the central point for defining and running all AI-related operations,
 * such as flows, prompts, and tools.
 */
export const ai = genkit({
  // An array of plugins to extend Genkit's core functionality.
  plugins: [
    // The Google AI plugin is configured here to connect to Google's services.
    googleAI({
      // The API key for Google AI services is retrieved from environment variables.
      // It's crucial to keep this key secret and not hardcode it directly in the source code.
      // This ensures that sensitive credentials are not exposed in version control.
      apiKey: process.env.GOOGLE_API_KEY, 
    }),
  ],
  // Specifies the default AI model to be used for generation tasks if not overridden
  // in a specific prompt or generate call. 'gemini-2.0-flash' is chosen here for its
  // balance of speed and capability, making it suitable for a variety of web application tasks.
  model: 'googleai/gemini-2.0-flash',
});
