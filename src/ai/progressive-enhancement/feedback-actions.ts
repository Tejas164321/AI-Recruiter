'use server';

import { z } from 'zod';
import type { DetailedAIFeedback } from '@/lib/types';
import { generateFeedbackOrchestrated } from '@/ai/orchestration/model-router';
import type { ApiConfig } from '@/services/user-config';
import { cleanDocumentTextForPrompt } from '@/ai/local-llm/prompt-templates';

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
    strengths: z.array(z.string()),
    improvements: z.array(z.string()),
    resumeAdditions: z.array(z.string()),
    
    // Optional secondary fields
    summary: z.string().optional(),
    matchedSkills: z.array(z.string()).optional(),
    matchedExperience: z.string().optional(),
    missingSkills: z.array(z.string()).optional(),
    scoreImpact: z.string().optional(),
    concerns: z.array(z.string()).optional(),
    scoreExplanation: z.string().optional(),
});

// ============================================
// AI Feedback Prompt
// ============================================

function createDetailedFeedbackPrompt(context: FeedbackGenerationContext): string {
    const cleanJd = cleanDocumentTextForPrompt(context.jdText).substring(0, 3000);
    const cleanResume = cleanDocumentTextForPrompt(context.resumeText).substring(0, 3000);

    return `You are a Senior Technical Recruiter evaluating a candidate's resume against a job description.

JOB DESCRIPTION:
${cleanJd}

RESUME:
${cleanResume}

SCORING CONTEXT (For reference, do not print):
- Match: ${context.scores.final}/100
- Skill: ${context.scores.skill}/100
- ATS: ${context.atsResult.atsScore}/100

INSTRUCTIONS:
1. Return your analysis ONLY as a valid JSON object.
2. The JSON object must contain EXACTLY the following three keys. Do not change, rename, or omit them, and do not use headers as keys:
   * "strengths": An array of exactly 2 strings. Briefly state what the candidate does well and why it fits.
   * "improvements": An array of exactly 2 strings. State key weaknesses/gaps and what specifically they must learn or improve.
   * "resumeAdditions": An array of exactly 2 strings. Write exact ready-to-copy resume bullet points they should add to their resume to perfectly match.
3. Keep descriptions and bullet points short, concise, and focused.

OUTPUT SCHEMA (JSON):
{
  "strengths": [
    "Highlight of candidate strength 1",
    "Highlight of candidate strength 2"
  ],
  "improvements": [
    "Specific gap 1 and actionable step to address it",
    "Specific gap 2 and actionable step to address it"
  ],
  "resumeAdditions": [
    "Ready-to-copy bullet point 1 for their resume",
    "Ready-to-copy bullet point 2 for their resume"
  ]
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
                maxTokens: 800, // Detailed feedback (optimized output token count)
            },
            apiConfig
        );

        return result as DetailedAIFeedback;
    } catch (error) {
        console.error('[ProgressiveEnhancement] Server AI feedback generation failed:', error);
        throw error;
    }
}
