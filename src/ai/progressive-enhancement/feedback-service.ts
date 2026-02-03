import { z } from 'zod';
import type { RankedCandidate, DetailedAIFeedback } from '@/lib/types';
import { getOllamaClient } from '@/ai/local-llm/ollama-client';
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
    return `You are an expert recruiter analyzing a resume against a job description.

JOB DESCRIPTION:
${context.jdText.substring(0, 2000)}

RESUME:
${context.resumeText.substring(0, 2000)}

SCORING ANALYSIS:
- Overall Match: ${context.scores.final}/100
- Skill Match: ${context.scores.skill}/100
- ATS Score: ${context.atsResult.atsScore}/100
- Semantic Similarity: ${context.scores.semantic}/100

MATCHED SKILLS: ${context.skillMatch.matchedSkills.slice(0, 10).join(', ')}
MISSING SKILLS: ${context.skillMatch.missingSkills.slice(0, 10).join(', ')}

Provide a comprehensive analysis in JSON format with the following structure:
{
  "summary": "2-3 sentence overall assessment",
  "matchedSkills": ["skill with context", ...],
  "matchedExperience": "explanation of experience match",
  "missingSkills": ["critical missing skill", ...],
  "missingExperience": "if applicable, experience gaps",
  "improvements": [
    "Specific actionable improvement 1",
    "Specific actionable improvement 2",
    "Specific actionable improvement 3"
  ],
  "scoreImpact": "Adding X, Y, Z could increase score by N points",
  "concerns": ["concern 1 if any", ...],
  "strengths": ["key strength 1", "key strength 2", ...],
  "scoreExplanation": "Detailed explanation of why this score was given"
}

Focus on:
1. Be specific and actionable in improvements
2. Explain exact keyword/skill gaps
3. Mention formatting issues if ATS score is low
4. Suggest concrete changes to increase match score`;
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
                timeout: 15000, // 15s timeout
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
