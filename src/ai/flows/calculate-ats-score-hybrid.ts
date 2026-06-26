/**
 * Hybrid ATS Score Calculator — Two-Phase Progressive Enhancement
 *
 * PHASE 1 (Fast): `calculateAtsScoreBase`
 *   - Document parsing (deterministic)
 *   - Rule-based ATS analysis (deterministic)
 *   - Returns score immediately — no AI call
 *
 * PHASE 2 (Background): `calculateAtsScoreFeedbackOnly`
 *   - AI qualitative feedback (LLM API call)
 *   - Called in background after Phase 1 results are shown to user
 *
 * Legacy: `calculateAtsScore` — runs both phases in sequence (backward compat)
 */

'use server';

import { parseDocument, extractCandidateName } from '@/lib/processing/document-parser';
import { calculateATSScore, getATSImprovements } from '@/lib/ats/ats-analyzer';
import { generateFeedbackOrchestrated } from '@/ai/orchestration/model-router';
import type { ApiConfig } from '@/services/user-config';
import {
    createATSFeedbackPrompt,
    ATSFeedbackSchema
} from '@/ai/local-llm/prompt-templates';

// ============================================
// Types
// ============================================

export interface CalculateAtsScoreInput {
    resumeDataUri: string;
    originalResumeName: string;
}

export interface CalculateAtsScoreOutput {
    atsScore: number;
    atsFeedback: string;
    candidateName?: string;
}

/** Intermediate context from Phase 1, needed to generate Phase 2 AI feedback */
export interface AtsBaseContext {
    resumeText: string;
    atsScore: number;
    sectionsFound: string[];
    layoutType: 'single-column' | 'multi-column' | 'complex';
    improvements: string[];
    fallbackFeedback: string;
}

export interface CalculateAtsScoreBaseOutput {
    atsScore: number;
    candidateName?: string;
    baseContext: AtsBaseContext;
}

// ============================================
// Phase 1: Deterministic ATS Score (FAST)
// ============================================

/**
 * Phase 1: Parse + rule-based ATS analysis only. No LLM calls.
 * Returns the score and candidate name immediately (~1-2s).
 * Also returns a `baseContext` needed to generate AI feedback in Phase 2.
 */
export async function calculateAtsScoreBase(
    input: CalculateAtsScoreInput
): Promise<CalculateAtsScoreBaseOutput> {
    const { resumeDataUri, originalResumeName } = input;

    console.log(`\n📋 [Phase 1] ATS Score Base for: ${originalResumeName}`);

    const parsedResume = await parseDocument(resumeDataUri, originalResumeName);
    const candidateName = extractCandidateName(parsedResume);
    const atsResult = calculateATSScore(parsedResume);
    const improvements = getATSImprovements(atsResult);

    const sectionsFound = Object.keys(atsResult.sectionPresence)
        .filter(k => atsResult.sectionPresence[k as keyof typeof atsResult.sectionPresence])
        .map(k => k.charAt(0).toUpperCase() + k.slice(1));

    // Deterministic fallback feedback (shown immediately while AI generates)
    const fallbackFeedback = formatFallbackFeedback(atsResult, improvements);

    console.log(`   ✓ [Phase 1] ATS Score: ${atsResult.atsScore}/100 — ready to show.`);

    return {
        atsScore: atsResult.atsScore,
        candidateName: candidateName || undefined,
        baseContext: {
            resumeText: parsedResume.text,
            atsScore: atsResult.atsScore,
            sectionsFound,
            layoutType: atsResult.layoutAnalysis.type,
            improvements,
            fallbackFeedback,
        },
    };
}

// ============================================
// Phase 2: AI Feedback Generation (BACKGROUND)
// ============================================

/**
 * Phase 2: Generate detailed AI feedback using LLM.
 * Call this in the background after Phase 1 results are already displayed.
 * Returns the enriched atsFeedback string.
 * Throws if no API key is configured — caller must handle gracefully.
 */
export async function calculateAtsScoreFeedbackOnly(
    baseContext: AtsBaseContext,
    apiConfig?: ApiConfig
): Promise<string> {
    console.log(`\n🤖 [Phase 2] Generating AI ATS feedback (background)...`);

    const prompt = createATSFeedbackPrompt({
        resumeText: baseContext.resumeText,
        atsScore: baseContext.atsScore,
        sectionsFound: baseContext.sectionsFound,
        layoutType: baseContext.layoutType,
    });

    const llmFeedback = await generateFeedbackOrchestrated(
        prompt,
        ATSFeedbackSchema,
        { temperature: 0.3, maxTokens: 500 },
        apiConfig
    );

    console.log(`   ✓ [Phase 2] AI feedback generated.`);
    return formatATSFeedback(llmFeedback, baseContext.improvements);
}

// ============================================
// Legacy: Full Pipeline (Phase 1 + Phase 2 sequential)
// Kept for backward compatibility with other callers
// ============================================

export async function calculateAtsScore(
    input: CalculateAtsScoreInput,
    apiConfig?: ApiConfig
): Promise<CalculateAtsScoreOutput> {
    const { originalResumeName } = input;

    console.log(`\n📋 Calculating ATS Score for: ${originalResumeName}`);
    console.log(`${'─'.repeat(60)}`);

    try {
        const { atsScore, candidateName, baseContext } = await calculateAtsScoreBase(input);

        let detailedFeedback = baseContext.fallbackFeedback;
        try {
            detailedFeedback = await calculateAtsScoreFeedbackOnly(baseContext, apiConfig);
        } catch (error) {
            console.error(`   ❌ LLM error — using fallback feedback:`, error);
        }

        console.log(`${'─'.repeat(60)}`);
        console.log(`✅ ATS Analysis Complete: ${atsScore}/100\n`);

        return { atsScore, atsFeedback: detailedFeedback, candidateName };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`❌ Error calculating ATS score for ${originalResumeName}:`, message);
        return {
            atsScore: 0,
            atsFeedback: `Error processing resume: ${message}. Please ensure the file is a valid PDF or DOCX document.`,
            candidateName: undefined,
        };
    }
}

// ============================================
// Helper Functions
// ============================================

function formatATSFeedback(llmFeedback: any, improvements: string[]): string {
    const sections: string[] = [];

    sections.push(`**ATS Compatibility Analysis:**\n${llmFeedback.detailedFeedback}`);

    if (llmFeedback.strengths && llmFeedback.strengths.length > 0) {
        sections.push(`\n**Strengths:**\n${llmFeedback.strengths.map((s: string) => `✓ ${s}`).join('\n')}`);
    }

    if (llmFeedback.specificImprovements && llmFeedback.specificImprovements.length > 0) {
        sections.push(`\n**Recommended Improvements:**\n${llmFeedback.specificImprovements.map((i: string) => `• ${i}`).join('\n')}`);
    } else if (improvements.length > 0) {
        sections.push(`\n**Recommended Improvements:**\n${improvements.slice(0, 5).map(i => `• ${i}`).join('\n')}`);
    }

    return sections.join('\n');
}

function formatFallbackFeedback(
    atsResult: ReturnType<typeof calculateATSScore>,
    improvements: string[]
): string {
    const sections: string[] = [];

    sections.push(`**ATS Compatibility:** ${atsResult.feedback}`);

    const foundSections = Object.keys(atsResult.sectionPresence)
        .filter(k => atsResult.sectionPresence[k as keyof typeof atsResult.sectionPresence]);

    if (foundSections.length > 0) {
        sections.push(`\n**Detected Sections:** ${foundSections.map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(', ')}`);
    }

    sections.push(`\n**Layout Type:** ${atsResult.layoutAnalysis.type}`);

    if (improvements.length > 0) {
        sections.push(`\n**Recommended Improvements:**\n${improvements.slice(0, 5).map(i => `• ${i}`).join('\n')}`);
    }

    sections.push(`\n**Score Breakdown:**`);
    sections.push(`• Section Presence: ${atsResult.breakdown.sectionScore.toFixed(1)}/30`);
    sections.push(`• Layout Readability: ${atsResult.breakdown.layoutScore.toFixed(1)}/25`);
    sections.push(`• Formatting: ${atsResult.breakdown.formattingScore.toFixed(1)}/20`);
    sections.push(`• Keywords: ${atsResult.breakdown.keywordScore.toFixed(1)}/15`);

    return sections.join('\n');
}
