/**
 * Hybrid ATS Score Calculator
 * 
 * ARCHITECTURE:
 * 1. Document parsing (deterministic)
 * 2. Rule-based ATS analysis (deterministic)
 * 3. Optional LLM feedback generation (local Ollama, FINAL STEP ONLY)
 * 
 * This replaces the cloud-based Gemini flow with a deterministic
 * rule-based system that optionally uses local LLM for detailed feedback.
 */

'use server';

import { parseDocument, extractCandidateName } from '@/lib/processing/document-parser';
import { calculateATSScore, getATSImprovements } from '@/lib/ats/ats-analyzer';
import { getOllamaClient } from '@/ai/local-llm/ollama-client';
import {
    createATSFeedbackPrompt,
    ATSFeedbackSchema,
    SYSTEM_PROMPTS
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

// ============================================
// Main ATS Score Calculation
// ============================================

export async function calculateAtsScore(
    input: CalculateAtsScoreInput
): Promise<CalculateAtsScoreOutput> {
    const { resumeDataUri, originalResumeName } = input;

    console.log(`\n📋 Calculating ATS Score for: ${originalResumeName}`);
    console.log(`${'─'.repeat(60)}`);

    try {
        // ============================================
        // STEP 1: Parse Resume (Deterministic)
        // ============================================
        console.log(`   📄 Parsing resume...`);
        const parsedResume = await parseDocument(resumeDataUri, originalResumeName);
        console.log(`   ✓ Parsed: ${parsedResume.metadata.wordCount} words`);

        // Extract candidate name
        const candidateName = extractCandidateName(parsedResume);

        // ============================================
        // STEP 2: Rule-Based ATS Analysis (Deterministic)
        // ============================================
        console.log(`   🔍 Running ATS analysis...`);
        const atsResult = calculateATSScore(parsedResume);
        console.log(`   ✓ ATS Score: ${atsResult.atsScore}/100`);
        console.log(`      Sections found: ${Object.keys(atsResult.sectionPresence).filter(k => atsResult.sectionPresence[k as keyof typeof atsResult.sectionPresence]).length}`);
        console.log(`      Layout type: ${atsResult.layoutAnalysis.type}`);

        // Get improvement suggestions
        const improvements = getATSImprovements(atsResult);

        // ============================================
        // STEP 3: Optional LLM Detailed Feedback
        // ============================================
        let detailedFeedback = atsResult.feedback;

        try {
            console.log(`   🤖 Generating detailed feedback...`);
            const ollamaClient = getOllamaClient();

            const prompt = createATSFeedbackPrompt({
                resumeText: parsedResume.text,
                atsScore: atsResult.atsScore,
                sectionsFound: Object.keys(atsResult.sectionPresence)
                    .filter(k => atsResult.sectionPresence[k as keyof typeof atsResult.sectionPresence])
                    .map(k => k.charAt(0).toUpperCase() + k.slice(1)),
                layoutType: atsResult.layoutAnalysis.type,
            });

            const llmResult = await ollamaClient.generateJSON(
                prompt,
                ATSFeedbackSchema,
                {
                    system: SYSTEM_PROMPTS.ATS_EXPERT,
                    temperature: 0.3,
                    maxTokens: 400,
                    timeout: 10000, // 10s timeout
                }
            );

            if (llmResult.success) {
                const llmFeedback = llmResult.data;
                console.log(`   ✓ LLM feedback generated: ${llmResult.tokensGenerated} tokens`);

                // Format detailed feedback
                detailedFeedback = formatATSFeedback(llmFeedback, improvements);
            } else {
                console.warn(`   ⚠ LLM failed: ${llmResult.error}. Using rule-based feedback.`);
                detailedFeedback = formatFallbackFeedback(atsResult, improvements);
            }
        } catch (error) {
            console.error(`   ❌ LLM error:`, error);
            detailedFeedback = formatFallbackFeedback(atsResult, improvements);
        }

        console.log(`${'─'.repeat(60)}`);
        console.log(`✅ ATS Analysis Complete: ${atsResult.atsScore}/100\n`);

        return {
            atsScore: atsResult.atsScore,
            atsFeedback: detailedFeedback,
            candidateName: candidateName || undefined,
        };

    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`❌ Error calculating ATS score for ${originalResumeName}:`, message);

        return {
            atsScore: 0,
            atsFeedback: `Error processing resume for ATS score: ${message}. Please ensure the file is a valid PDF or DOCX document.`,
            candidateName: undefined,
        };
    }
}

// ============================================
// Helper Functions
// ============================================

/**
 * Format LLM-generated ATS feedback with improvements
 */
function formatATSFeedback(
    llmFeedback: any,
    improvements: string[]
): string {
    const sections: string[] = [];

    // Detailed feedback
    sections.push(`**ATS Compatibility Analysis:**\n${llmFeedback.detailedFeedback}`);

    // Strengths
    if (llmFeedback.strengths && llmFeedback.strengths.length > 0) {
        sections.push(`\n**Strengths:**\n${llmFeedback.strengths.map((s: string) => `✓ ${s}`).join('\n')}`);
    }

    // Areas for improvement
    if (llmFeedback.specificImprovements && llmFeedback.specificImprovements.length > 0) {
        sections.push(`\n**Recommended Improvements:**\n${llmFeedback.specificImprovements.map((i: string) => `• ${i}`).join('\n')}`);
    } else if (improvements.length > 0) {
        sections.push(`\n**Recommended Improvements:**\n${improvements.slice(0, 5).map(i => `• ${i}`).join('\n')}`);
    }

    return sections.join('\n');
}

/**
 * Format fallback feedback when LLM fails
 */
function formatFallbackFeedback(
    atsResult: ReturnType<typeof calculateATSScore>,
    improvements: string[]
): string {
    const sections: string[] = [];

    // Main feedback
    sections.push(`**ATS Compatibility:** ${atsResult.feedback}`);

    // Sections found
    const foundSections = Object.keys(atsResult.sectionPresence)
        .filter(k => atsResult.sectionPresence[k as keyof typeof atsResult.sectionPresence]);

    if (foundSections.length > 0) {
        sections.push(`\n**Detected Sections:** ${foundSections.map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(', ')}`);
    }

    // Layout
    sections.push(`\n**Layout Type:** ${atsResult.layoutAnalysis.type}`);

    // Improvements
    if (improvements.length > 0) {
        sections.push(`\n**Recommended Improvements:**\n${improvements.slice(0, 5).map(i => `• ${i}`).join('\n')}`);
    }

    // Score breakdown
    sections.push(`\n**Score Breakdown:**`);
    sections.push(`• Section Presence: ${atsResult.breakdown.sectionScore.toFixed(1)}/30`);
    sections.push(`• Layout Readability: ${atsResult.breakdown.layoutScore.toFixed(1)}/25`);
    sections.push(`• Formatting: ${atsResult.breakdown.formattingScore.toFixed(1)}/20`);
    sections.push(`• Keywords: ${atsResult.breakdown.keywordScore.toFixed(1)}/15`);

    return sections.join('\n');
}
