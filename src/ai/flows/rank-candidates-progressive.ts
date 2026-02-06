'use server';

/**
 * Two-Phase Resume Ranking Flow
 * 
 * Phase 1: FAST - Deterministic scoring only (2-4 sec/resume)
 * Phase 2: ASYNC - Generate AI feedback in background (top scores first)
 * 
 * This allows instant results while detailed feedback streams in progressively.
 */

import type { RankedCandidate, PerformBulkScreeningInput, PerformBulkScreeningOutput, DetailedAIFeedback } from '@/lib/types';
import { parseDocument } from '@/lib/processing/document-parser';
import { extractSkills } from '@/lib/skills/skill-extractor';
import { calculateSkillMatchScore } from '@/lib/skills/skill-matcher';
import { calculateATSScore, type ATSScoreResult } from '@/lib/ats/ats-analyzer';
import { calculateJDResumeMatch } from '@/ai/embeddings/embedding-service';
import { calculateCompositeScore } from '@/lib/scoring/composite-scorer';
import { extractCandidateName, extractEmail } from '@/lib/processing/document-parser';
import {
    createQuickFeedbackSummary
} from '../progressive-enhancement/feedback-service';
import type { SkillMatchResult } from '@/lib/skills/skill-matcher';

// ============================================
// Types
// ============================================

interface QuickRankingResult {
    candidate: RankedCandidate;
    context: FeedbackGenerationContext; // Saved for Phase 2
}

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
    skillMatch: SkillMatchResult;
    atsResult: ATSScoreResult;
}

// ============================================
// Phase 1: Fast Deterministic Ranking
// ============================================

/**
 * Phase 1: Quick ranking with deterministic scores only
 * No LLM calls - just parsing, skill matching, ATS, and embeddings
 */
async function rankCandidateQuick(
    resumeDataUri: string,
    resumeName: string,
    resumeId: string,
    jdText: string,
    jdSkills: ReturnType<typeof extractSkills>
): Promise<QuickRankingResult> {
    const startTime = Date.now();

    // Parse resume
    const parsedResume = await parseDocument(resumeDataUri, resumeName);

    // Skill matching (deterministic)
    // Extract skills from resume
    const resumeSkills = extractSkills(parsedResume.text);

    // Calculate match using the dedicated matcher (handles partials, taxonomy, etc.)
    const skillMatch = calculateSkillMatchScore(jdSkills.skills, resumeSkills.skills);

    const matchedSkills = skillMatch.matchedSkills;
    const missingSkills = skillMatch.missingSkills;

    // ATS analysis (deterministic)
    const atsResult = calculateATSScore(parsedResume);

    // Semantic similarity (embedding-based)
    const semanticResult = await calculateJDResumeMatch(jdText, parsedResume.text);

    // Experience score (simple heuristic)
    const experienceScore = 70; // Placeholder - can enhance later

    // Composite score
    const compositeResult = calculateCompositeScore({
        skillMatch: skillMatch.score,
        semanticSimilarity: semanticResult.score,
        atsFormatting: atsResult.atsScore,
        experienceRelevance: experienceScore,
    });

    // Extract candidate info
    const candidateName = extractCandidateName(parsedResume) || resumeName.replace(/\.[^/.]+$/, '');
    const email = extractEmail(parsedResume) ?? undefined;

    // Create quick feedback summary (no AI)
    const quickFeedback = createQuickFeedbackSummary(
        compositeResult.finalScore,
        skillMatch.matchedSkills,
        skillMatch.missingSkills
    );

    const processingTime = Date.now() - startTime;
    console.log(`   ✓ Quick rank: ${candidateName} - ${compositeResult.finalScore}/100 (${processingTime}ms)`);

    // Build candidate result
    const candidate: RankedCandidate = {
        id: resumeId,
        name: candidateName,
        email,
        score: compositeResult.finalScore,
        atsScore: atsResult.atsScore,
        keySkills: skillMatch.matchedSkills.slice(0, 8).join(', '),
        feedback: quickFeedback,
        originalResumeName: resumeName,
        resumeDataUri,

        // Progressive enhancement fields
        feedbackStatus: 'pending',
        processingPriority: compositeResult.finalScore, // Higher scores processed first
    };

    // Save context for Phase 2
    const context: FeedbackGenerationContext = {
        jdText,
        resumeText: parsedResume.text,
        scores: {
            final: compositeResult.finalScore,
            semantic: semanticResult.score,
            skill: skillMatch.score,
            ats: atsResult.atsScore,
            experience: experienceScore,
        },
        skillMatch,
        atsResult,
    };

    return { candidate, context };
}

/**
 * Phase 1: Bulk ranking (fast, deterministic only)
 * Returns immediately with scores, queues AI feedback for Phase 2
 */
export async function performBulkScreeningFast(
    input: PerformBulkScreeningInput
): Promise<{
    results: PerformBulkScreeningOutput;
    // We return the contexts mapped by candidate ID so the client can pass them back for enrichment
    feedbackContexts: Record<string, FeedbackGenerationContext>;
}> {
    const { jobRolesToScreen, resumesToRank } = input;

    console.log(`\n${'═'.repeat(70)}`);
    console.log(`⚡ PHASE 1: FAST DETERMINISTIC RANKING`);
    console.log(`   Job Roles: ${jobRolesToScreen.length}`);
    console.log(`   Resumes: ${resumesToRank.length}`);
    console.log(`   Mode: No AI - Pure speed`);
    console.log(`${'═'.repeat(70)}\n`);

    const allResults: PerformBulkScreeningOutput = [];
    // Using Record instead of Map for easier JSON serialization over server actions
    const feedbackContexts: Record<string, FeedbackGenerationContext> = {};

    for (const jobRole of jobRolesToScreen) {
        console.log(`\n📋 Processing: ${jobRole.name}`);

        // Parse JD
        const parsedJD = await parseDocument(jobRole.contentDataUri, jobRole.name);
        const jdSkills = extractSkills(parsedJD.text);

        const candidates: RankedCandidate[] = [];

        // Process in parallel batches
        const BATCH_SIZE = 4;
        for (let i = 0; i < resumesToRank.length; i += BATCH_SIZE) {
            const batch = resumesToRank.slice(i, Math.min(i + BATCH_SIZE, resumesToRank.length));

            const batchResults = await Promise.allSettled(
                batch.map(resume =>
                    rankCandidateQuick(
                        resume.dataUri,
                        resume.name,
                        resume.id,
                        parsedJD.text,
                        jdSkills
                    )
                )
            );

            for (const result of batchResults) {
                if (result.status === 'fulfilled') {
                    candidates.push(result.value.candidate);
                    feedbackContexts[result.value.candidate.id] = result.value.context;
                }
            }
        }

        // Sort by score
        candidates.sort((a, b) => b.score - a.score);

        allResults.push({
            jobDescriptionId: jobRole.id,
            jobDescriptionName: jobRole.name,
            jobDescriptionDataUri: jobRole.contentDataUri,
            candidates,
        });

        console.log(`✓ Ranked ${candidates.length} candidates`);
    }

    console.log(`\n✅ PHASE 1 COMPLETE - Results ready for immediate display!\n`);

    return { results: allResults, feedbackContexts };
}

// ============================================
// Phase 2 logic moved to client side (feedback-service.ts) to share auth context
