'use server';

import { z } from 'zod';
import type { DetailedAIFeedback } from '@/lib/types';
import { generateFeedbackOrchestrated } from '@/ai/orchestration/model-router';
import type { ApiConfig } from '@/services/user-config';

// ============================================
// Types
// ============================================

export interface FeedbackGenerationContext {
    jdText: string;
    resumeText: string;
    scores: {
        final: number;
        semantic: number;
        skill: number;
        ats: number;
        experience: number;
    };
    skillMatch: any;
    atsResult: any;
}

// ============================================
// Validation Schemas
// ============================================

const DetailedAIFeedbackSchema = z.object({
    summary: z.string(),
    matchedSkills: z.array(z.string()),
    matchedExperience: z.string(),
    missingSkills: z.array(z.string()),
    improvements: z.array(z.string()),
    scoreImpact: z.string(),
    concerns: z.array(z.string()),
    strengths: z.array(z.string()),
    scoreExplanation: z.string(),
});

// ============================================
// AI Feedback Prompt
// ============================================

function createDetailedFeedbackPrompt(context: FeedbackGenerationContext): string {
    return `You are a Senior Technical Recruiter with 15 years of experience. Write a personal, constructive feedback email to this candidate.

JOB DESCRIPTION:
${context.jdText.substring(0, 2000)}

RESUME:
${context.resumeText.substring(0, 2000)}

SCORING CONTEXT (For your reference only, do not mention these numbers explicitly):
- Overall Match: ${context.scores.final}/100
- Skill Match: ${context.scores.skill}/100
- ATS Score: ${context.atsResult.atsScore}/100

INSTRUCTIONS:
1.  **Tone**: Professional, conversational, and direct. Write like a human speaking to another human. Avoid robotic phrases like "Based on the analysis" or "The candidate displays".
2.  **Structure**:
    *   **Summary**: A 2-3 sentence "elevator pitch" about the candidate.
    *   **Strengths**: Highlight 3 specific things they do well and WHY it matters for this role.
    *   **Weaknesses (Improvements)**: brutally honest but constructive feedback on missing skills or experience gaps.
    *   **Action Plan**: What exactly should they learn or change to get this job?

OUTPUT FORMAT (JSON):
{
  "summary": "Direct, human summary of the candidate's fit.",
  "matchedSkills": ["Skill 1 (Context: why it matters)", "Skill 2 ..."],
  "matchedExperience": "Conversational assessment of their experience level.",
  "missingSkills": ["Critical missing skill 1", "Critical missing skill 2"],
  "missingExperience": "Clear explanation of any experience gaps.",
  "improvements": [
    "Weakness 1: Explanation and how to fix it",
    "Weakness 2: Explanation and how to fix it",
    "Weakness 3: Explanation and how to fix it"
  ],
  "scoreImpact": "If you fix X and Y, your profile would be much stronger.",
  "concerns": ["Major red flag 1", "Major red flag 2"],
  "strengths": ["Strength 1: Why it is impressive", "Strength 2: Why it is impressive"],
  "scoreExplanation": "Professional justification for the rating."
}`;
}

/**
 * Generate detailed AI feedback for a candidate (Phase 2 - Server Action)
 */
export async function generateDetailedFeedback(
    context: FeedbackGenerationContext,
    apiConfig?: ApiConfig
): Promise<DetailedAIFeedback> {
    try {
        const prompt = createDetailedFeedbackPrompt(context);

        const result = await generateFeedbackOrchestrated(
            prompt,
            DetailedAIFeedbackSchema,
            {
                temperature: 0.3,
                maxTokens: 800, // Detailed feedback
            },
            apiConfig
        );

        return result as DetailedAIFeedback;
    } catch (error) {
        console.error('[ProgressiveEnhancement] Server AI feedback generation failed:', error);
        throw error;
    }
}
