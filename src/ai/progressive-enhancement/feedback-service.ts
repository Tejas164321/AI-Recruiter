import { z } from 'zod';
import type { RankedCandidate, DetailedAIFeedback } from '@/lib/types';
import { getOllamaClient } from '@/ai/local-llm/ollama-client';
import { updateCandidateFeedback } from '@/services/firestoreService';
import type { SkillMatchResult } from '@/lib/skills/skill-matcher';
import type { ATSScoreResult } from '@/lib/ats/ats-analyzer';
import type { CompositeScoreResult } from '@/lib/scoring/composite-scorer';

// ============================================
// Types
// ============================================

interface FeedbackGenerationContext {
    jdText: string;
    resumeText: string;
    scores: {
        final: number;
        semantic: number;
        skill: number;
        ats: number;
        experience: number;
    };
    skillMatch: SkillMatchResult;
    atsResult: ATSScoreResult;
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

// ============================================
// AI Feedback Generation
// ============================================

/**
 * Generate detailed AI feedback for a candidate (Phase 2)
 */
export async function generateDetailedFeedback(
    context: FeedbackGenerationContext
): Promise<DetailedAIFeedback> {
    try {
        const ollamaClient = getOllamaClient();
        const prompt = createDetailedFeedbackPrompt(context);

        const result = await ollamaClient.generateJSON(
            prompt,
            DetailedAIFeedbackSchema,
            {
                temperature: 0.3,
                maxTokens: 800, // Detailed feedback
                timeout: 120000, // 120s timeout
            }
        );

        if (result.success && result.data) {
            return result.data as DetailedAIFeedback;
        } else {
            // Fallback to structured summary
            return createFallbackDetailedFeedback(context);
        }
    } catch (error) {
        console.error('[ProgressiveEnhancement] AI feedback generation failed:', error);
        return createFallbackDetailedFeedback(context);
    }
}

/**
 * Create fallback detailed feedback when AI fails
 */
function createFallbackDetailedFeedback(context: FeedbackGenerationContext): DetailedAIFeedback {
    const { scores, skillMatch } = context;

    let summary = '';
    if (scores.final >= 80) {
        summary = 'Strong match for this role based on skills and experience.';
    } else if (scores.final >= 60) {
        summary = 'Moderate match with some key skills present.';
    } else {
        summary = 'Limited match - significant skill gaps identified.';
    }

    return {
        summary,
        matchedSkills: skillMatch.matchedSkills.slice(0, 8),
        matchedExperience: `Experience alignment: ${scores.experience}/100`,
        missingSkills: skillMatch.missingSkills.slice(0, 8),
        improvements: [
            `Add missing skills: ${skillMatch.missingSkills.slice(0, 3).join(', ')}`,
            'Improve resume formatting for better ATS compatibility',
            'Add specific project examples demonstrating required skills',
        ],
        scoreImpact: `Adding critical missing skills could increase score by ${Math.min(100 - scores.final, 20)} points`,
        concerns: scores.ats < 70 ? ['Poor ATS formatting detected'] : [],
        strengths: skillMatch.matchedSkills.slice(0, 3),
        scoreExplanation: `Score based on ${skillMatch.matchedSkills.length} matched skills, ${context.atsResult.atsScore}/100 ATS compatibility, and ${scores.semantic}/100 semantic similarity.`,
    };
}

/**
 * Create simple feedback summary for Phase 1 (instant results)
 */
export function createQuickFeedbackSummary(
    score: number,
    matchedSkills: string[],
    missingSkills: string[]
): string {
    let feedback = '';

    if (score >= 80) {
        feedback = `🎯 Excellent match! Primary skills: ${matchedSkills.slice(0, 3).join(', ')}`;
    } else if (score >= 60) {
        feedback = `✓ Good match. Has ${matchedSkills.length} matching skills`;
    } else if (score >= 40) {
        feedback = `~ Moderate fit. Missing: ${missingSkills.slice(0, 3).join(', ')}`;
    } else {
        feedback = `⚠ Limited match. Significant skill gaps identified`;
    }

    return feedback;
}

// ============================================
// Priority Queue for Feedback Generation
// ============================================

/**
 * Process candidates in priority order (highest scores first)
 * and generate detailed AI feedback asynchronously
 */
export async function processCandidateFeedbackQueue(
    candidates: RankedCandidate[],
    feedbackContexts: Map<string, FeedbackGenerationContext>,
    onUpdate: (candidateId: string, feedback: DetailedAIFeedback, status: 'complete' | 'failed') => Promise<void>
): Promise<void> {
    // Sort by score (highest first)
    const sorted = [...candidates].sort((a, b) => b.score - a.score);

    console.log(`\n🤖 Starting AI Feedback Generation for ${sorted.length} candidates...`);
    console.log(`   Processing order: Top scores first`);

    for (let i = 0; i < sorted.length; i++) {
        const candidate = sorted[i];
        const context = feedbackContexts.get(candidate.id);

        if (!context) {
            console.warn(`   ⚠ No context for candidate ${candidate.id}, skipping`);
            continue;
        }

        console.log(`   [${i + 1}/${sorted.length}] Generating AI feedback for ${candidate.name} (Score: ${candidate.score})...`);

        try {
            const detailedFeedback = await generateDetailedFeedback(context);
            await onUpdate(candidate.id, detailedFeedback, 'complete');
            console.log(`   ✓ Complete: ${candidate.name}`);
        } catch (error) {
            console.error(`   ❌ Failed: ${candidate.name}`, error);
            const fallbackFeedback = createFallbackDetailedFeedback(context);
            await onUpdate(candidate.id, fallbackFeedback, 'failed');
        }
    }

    console.log(`\n✅ AI Feedback Generation Complete!\n`);
}

// ============================================
// Client-Side Feedback Enrichment
// ============================================

/**
 * Triggers AI feedback for a single candidate (Client-Side).
 * executing this on the client ensures we have the Auth Context for Firestore writes.
 */
export async function enrichCandidateWithFeedback(
    resultId: string,
    candidateId: string,
    context: FeedbackGenerationContext
): Promise<DetailedAIFeedback | null> {
    try {
        console.log(`🤖 Generating AI feedback for candidate ${candidateId}...`);

        // Update status to generating
        await updateCandidateFeedback(resultId, candidateId, {
            feedback: "Generating detailed analysis...",
            feedbackStatus: 'generating'
        });

        // Generate feedback (calls local Ollama)
        const detailedFeedback = await generateDetailedFeedback(context);

        // Update Firestore with result
        await updateCandidateFeedback(resultId, candidateId, {
            feedback: detailedFeedback.summary, // Update main feedback text
            detailedFeedback: detailedFeedback,
            feedbackStatus: 'complete',
            feedbackGeneratedAt: new Date().toISOString()
        });

        console.log(`✅ Feedback generated and saved for ${candidateId}`);
        return detailedFeedback;
    } catch (error) {
        console.error(`❌ Failed to generate feedback for ${candidateId}:`, error);

        await updateCandidateFeedback(resultId, candidateId, {
            feedback: "AI analysis failed. Please try again.",
            feedbackStatus: 'failed'
        });

        return null;
    }
}
