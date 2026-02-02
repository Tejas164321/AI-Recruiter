/**
 * Hybrid Resume Ranking Pipeline
 * 
 * ARCHITECTURE:
 * 1. Document parsing (deterministic, no AI)
 * 2. Semantic embeddings (transformers, no cloud)
 * 3. Skill extraction & matching (regex-based, deterministic)
 * 4. ATS analysis (rule-based, deterministic)
 * 5. Composite scoring (weighted algorithm, deterministic)
 * 6. LLM qualitative analysis (local Ollama, FINAL STEP ONLY)
 * 
 * This replaces the cloud-based Gemini flow with a quota-free,
 * offline-capable, and explainable hybrid system.
 */

'use server';

import { parseDocument, extractCandidateName, extractEmail } from '@/lib/processing/document-parser';
import { calculateJDResumeMatch } from '@/ai/embeddings/embedding-service';
import { extractSkills, extractYearsOfExperience } from '@/lib/skills/skill-extractor';
import { calculateSkillMatchScore } from '@/lib/skills/skill-matcher';
import { calculateATSScore } from '@/lib/ats/ats-analyzer';
import { calculateCompositeScore, type ScoreComponents } from '@/lib/scoring/composite-scorer';
import { getOllamaClient } from '@/ai/local-llm/ollama-client';
import {
    createQualitativeAnalysisPrompt,
    QualitativeAnalysisSchema,
    SYSTEM_PROMPTS
} from '@/ai/local-llm/prompt-templates';
import type {
    ExtractedJobRole,
    ResumeFile,
    RankedCandidate,
    JobScreeningResult,
    PerformBulkScreeningInput,
    PerformBulkScreeningOutput,
    ProcessingProgress,
} from '@/lib/types';

// ============================================
// Types
// ============================================

interface HybridScoringResult {
    candidate: RankedCandidate;
    processingTimeMs: number;
    breakdown: {
        parsingTimeMs: number;
        embeddingTimeMs: number;
        skillMatchingTimeMs: number;
        atsTimeMs: number;
        llmTimeMs: number;
    };
}

interface ProcessingContext {
    jdText: string;
    jdSkills: ReturnType<typeof extractSkills>;
    totalResumes: number;
    currentIndex: number;
}

// ============================================
// Single Resume Processing (Hybrid Pipeline)
// ============================================

async function processResumeSingleJob(
    resumeDataUri: string,
    resumeName: string,
    resumeId: string,
    jobRole: ExtractedJobRole,
    context: ProcessingContext
): Promise<HybridScoringResult> {
    const startTime = Date.now();
    const breakdown = {
        parsingTimeMs: 0,
        embeddingTimeMs: 0,
        skillMatchingTimeMs: 0,
        atsTimeMs: 0,
        llmTimeMs: 0,
    };

    // ============================================
    // STEP 1: Parse Resume (Deterministic)
    // ============================================
    console.log(`📄 [${context.currentIndex + 1}/${context.totalResumes}] Parsing: ${resumeName}`);
    const parseStart = Date.now();

    const parsedResume = await parseDocument(resumeDataUri, resumeName);
    breakdown.parsingTimeMs = Date.now() - parseStart;

    console.log(`   ✓ Parsed: ${parsedResume.metadata.wordCount} words, ${parsedResume.metadata.language} language`);

    // Extract candidate info
    const candidateName = extractCandidateName(parsedResume) || resumeName.replace(/\.[^/.]+$/, '');
    const candidateEmail = extractEmail(parsedResume) || '';

    // ============================================
    // STEP 2: Semantic Similarity (Embeddings)
    // ============================================
    console.log(`   🧠 Computing semantic similarity...`);
    const embeddingStart = Date.now();

    const semanticResult = await calculateJDResumeMatch(
        context.jdText,
        parsedResume.text
    );
    breakdown.embeddingTimeMs = Date.now() - embeddingStart;

    console.log(`   ✓ Semantic score: ${semanticResult.score}/100`);

    // ============================================
    // STEP 3: Skill Matching (Deterministic)
    // ============================================
    console.log(`   🔧 Matching skills...`);
    const skillStart = Date.now();

    const resumeSkills = extractSkills(parsedResume.text);
    const skillMatchResult = calculateSkillMatchScore(
        context.jdSkills.skills,
        resumeSkills.skills
    );
    breakdown.skillMatchingTimeMs = Date.now() - skillStart;

    console.log(`   ✓ Skill match: ${skillMatchResult.score}/100 (${skillMatchResult.matchedSkills.length} matched, ${skillMatchResult.missingSkills.length} missing)`);

    // ============================================
    // STEP 4: ATS Analysis (Rule-Based)
    // ============================================
    console.log(`   📋 Analyzing ATS compatibility...`);
    const atsStart = Date.now();

    const atsResult = calculateATSScore(parsedResume);
    breakdown.atsTimeMs = Date.now() - atsStart;

    console.log(`   ✓ ATS score: ${atsResult.atsScore}/100`);

    // ============================================
    // STEP 5: Experience Relevance (Heuristic)
    // ============================================
    const yearsExp = extractYearsOfExperience(parsedResume.text);
    const experienceScore = calculateExperienceScore(yearsExp, parsedResume.text, context.jdText);

    // ============================================
    // STEP 6: Composite Scoring (Weighted)
    // ============================================
    const scoreComponents: ScoreComponents = {
        semanticSimilarity: semanticResult.score,
        skillMatch: skillMatchResult.score,
        experienceRelevance: experienceScore,
        atsFormatting: atsResult.atsScore,
    };

    const compositeResult = calculateCompositeScore(scoreComponents);

    console.log(`   📊 Composite score: ${compositeResult.finalScore}/100 (${compositeResult.grade})`);

    // ============================================
    // STEP 7: LLM Qualitative Analysis (FINAL STEP)
    // ============================================
    console.log(`   🤖 Generating qualitative feedback...`);
    const llmStart = Date.now();

    let qualitativeAnalysis;
    try {
        const ollamaClient = getOllamaClient();
        const prompt = createQualitativeAnalysisPrompt({
            jdText: context.jdText,
            resumeText: parsedResume.text,
            scores: {
                final: compositeResult.finalScore,
                semantic: semanticResult.score,
                skill: skillMatchResult.score,
                ats: atsResult.atsScore,
                experience: experienceScore,
            },
            matchedSkills: skillMatchResult.matchedSkills,
            missingSkills: skillMatchResult.missingSkills,
        });

        const llmResult = await ollamaClient.generateJSON(
            prompt,
            QualitativeAnalysisSchema,
            {
                system: SYSTEM_PROMPTS.QUALITATIVE_ANALYSIS,
                temperature: 0.3,
                maxTokens: 600,
                timeout: 15000, // 15s timeout for LLM
            }
        );

        if (llmResult.success) {
            qualitativeAnalysis = llmResult.data;
            console.log(`   ✓ LLM analysis: ${llmResult.tokensGenerated} tokens in ${llmResult.inferenceTimeMs}ms`);
        } else {
            console.warn(`   ⚠ LLM failed: ${llmResult.error}. Using fallback.`);
            qualitativeAnalysis = createFallbackAnalysis(
                compositeResult,
                skillMatchResult,
                atsResult
            );
        }
    } catch (error) {
        console.error(`   ❌ LLM error:`, error);
        qualitativeAnalysis = createFallbackAnalysis(
            compositeResult,
            skillMatchResult,
            atsResult
        );
    }

    breakdown.llmTimeMs = Date.now() - llmStart;

    // ============================================
    // Assemble Final Candidate Object
    // ============================================
    const processingTimeMs = Date.now() - startTime;

    const candidate: RankedCandidate = {
        id: resumeId,
        name: candidateName,
        email: candidateEmail,
        score: compositeResult.finalScore,
        atsScore: atsResult.atsScore,
        keySkills: skillMatchResult.matchedSkills.slice(0, 10).join(', '),
        feedback: formatFeedback(qualitativeAnalysis, skillMatchResult, atsResult),
        originalResumeName: resumeName,
        resumeDataUri: resumeDataUri,
    };

    console.log(`   ✅ Complete: ${candidateName} - ${compositeResult.finalScore}/100 in ${processingTimeMs}ms\n`);

    return {
        candidate,
        processingTimeMs,
        breakdown,
    };
}

// ============================================
// Helper Functions
// ============================================

/**
 * Calculate experience relevance score (heuristic)
 */
function calculateExperienceScore(
    yearsExp: number | null,
    resumeText: string,
    jdText: string
): number {
    let score = 50; // Base score

    // Check for years of experience
    if (yearsExp !== null) {
        if (yearsExp >= 5) score += 20;
        else if (yearsExp >= 3) score += 15;
        else if (yearsExp >= 1) score += 10;
    }

    // Check for leadership indicators
    const leadershipKeywords = ['led', 'managed', 'directed', 'supervised', 'coordinated'];
    const hasLeadership = leadershipKeywords.some(kw => resumeText.toLowerCase().includes(kw));
    if (hasLeadership) score += 10;

    // Check for project mentions
    const projectCount = (resumeText.toLowerCase().match(/\bproject\b/g) || []).length;
    score += Math.min(10, projectCount * 2);

    // Check if JD mentions seniority
    const jdLower = jdText.toLowerCase();
    if (jdLower.includes('senior') || jdLower.includes('lead')) {
        if (yearsExp && yearsExp >= 5) score += 10;
        else score -= 10; // Penalty for junior applying to senior role
    }

    return Math.max(0, Math.min(100, score));
}

/**
 * Create fallback analysis when LLM fails
 */
function createFallbackAnalysis(
    compositeResult: ReturnType<typeof calculateCompositeScore>,
    skillMatchResult: ReturnType<typeof calculateSkillMatchScore>,
    atsResult: ReturnType<typeof calculateATSScore>
): any {
    const strengths: string[] = [];
    const weaknesses: string[] = [];

    if (skillMatchResult.matchedSkills.length > 5) {
        strengths.push(`Strong technical skill match with ${skillMatchResult.matchedSkills.length} matched skills`);
    }
    if (atsResult.atsScore >= 75) {
        strengths.push('ATS-friendly resume formatting');
    }

    if (skillMatchResult.missingSkills.length > 3) {
        weaknesses.push(`Missing ${skillMatchResult.missingSkills.length} key skills`);
    }
    if (atsResult.atsScore < 60) {
        weaknesses.push('Resume formatting could be improved for ATS compatibility');
    }

    return {
        summary: `Candidate scored ${compositeResult.finalScore}/100 based on skill match, experience, and resume quality.`,
        strengths: strengths.length > 0 ? strengths : ['Meets basic requirements'],
        weaknesses: weaknesses.length > 0 ? weaknesses : ['None identified'],
        experienceRelevance: 'Experience appears relevant to the role',
        scoreExplanation: `Score breakdown: Semantic ${compositeResult.components.semanticSimilarity}/100, Skills ${compositeResult.components.skillMatch}/100, ATS ${compositeResult.components.atsFormatting}/100`,
    };
}

/**
 * Format feedback for UI display
 */
function formatFeedback(
    analysis: any,
    skillMatch: ReturnType<typeof calculateSkillMatchScore>,
    atsResult: ReturnType<typeof calculateATSScore>
): string {
    const sections: string[] = [];

    // Summary
    sections.push(`**Summary:** ${analysis.summary}`);

    // Strengths
    if (analysis.strengths && analysis.strengths.length > 0) {
        sections.push(`\n**Strengths:**\n${analysis.strengths.map((s: string) => `• ${s}`).join('\n')}`);
    }

    // Weaknesses
    if (analysis.weaknesses && analysis.weaknesses.length > 0) {
        sections.push(`\n**Areas for Improvement:**\n${analysis.weaknesses.map((w: string) => `• ${w}`).join('\n')}`);
    }

    // Skill details
    if (skillMatch.matchedSkills.length > 0) {
        sections.push(`\n**Matched Skills:** ${skillMatch.matchedSkills.slice(0, 8).join(', ')}`);
    }
    if (skillMatch.missingSkills.length > 0) {
        sections.push(`**Missing Skills:** ${skillMatch.missingSkills.slice(0, 5).join(', ')}`);
    }

    // Score explanation
    sections.push(`\n**Score Explanation:** ${analysis.scoreExplanation}`);

    return sections.join('\n');
}

// ============================================
// Main Bulk Screening Function
// ============================================

export async function performBulkScreening(
    input: PerformBulkScreeningInput
): Promise<PerformBulkScreeningOutput> {
    const { jobRolesToScreen, resumesToRank } = input;
    const results: PerformBulkScreeningOutput = [];

    console.log(`\n${'═'.repeat(70)}`);
    console.log(`🚀 HYBRID RESUME RANKING PIPELINE`);
    console.log(`   Architecture: Deterministic + Semantic + Local LLM`);
    console.log(`   Job Roles: ${jobRolesToScreen.length}`);
    console.log(`   Resumes: ${resumesToRank.length}`);
    console.log(`   Total Operations: ${jobRolesToScreen.length * resumesToRank.length}`);
    console.log(`${'═'.repeat(70)}\n`);

    // Early exit
    if (jobRolesToScreen.length === 0 || resumesToRank.length === 0) {
        console.warn('⚠ No job roles or resumes provided');
        return [];
    }

    // Process each job role
    for (const jobRole of jobRolesToScreen) {
        console.log(`\n📋 Processing Job Role: "${jobRole.name}"`);
        console.log(`${'─'.repeat(70)}`);

        const jobStartTime = Date.now();

        // Parse JD once
        const parsedJD = await parseDocument(jobRole.contentDataUri, jobRole.name);
        const jdSkills = extractSkills(parsedJD.text);

        console.log(`   JD parsed: ${parsedJD.metadata.wordCount} words, ${jdSkills.uniqueSkills} unique skills found\n`);

        const context: ProcessingContext = {
            jdText: parsedJD.text,
            jdSkills,
            totalResumes: resumesToRank.length,
            currentIndex: 0,
        };

        const candidates: RankedCandidate[] = [];
        let successCount = 0;
        let failCount = 0;

        // Process resumes sequentially to avoid overwhelming local LLM
        for (let i = 0; i < resumesToRank.length; i++) {
            const resume = resumesToRank[i];
            context.currentIndex = i;

            try {
                const result = await processResumeSingleJob(
                    resume.dataUri,
                    resume.name,
                    resume.id,
                    jobRole,
                    context
                );

                candidates.push(result.candidate);
                successCount++;

                // Small delay between resumes to prevent overload
                if (i < resumesToRank.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            } catch (error) {
                failCount++;
                console.error(`   ❌ Failed to process ${resume.name}:`, error);

                // Create error candidate
                candidates.push({
                    id: resume.id,
                    name: resume.name.replace(/\.[^/.]+$/, ''),
                    email: '',
                    score: 0,
                    atsScore: 0,
                    keySkills: 'Processing failed',
                    feedback: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                    originalResumeName: resume.name,
                    resumeDataUri: resume.dataUri,
                });
            }
        }

        // Sort by score (descending)
        candidates.sort((a, b) => b.score - a.score);

        const jobTimeMs = Date.now() - jobStartTime;
        const avgTimeMs = Math.round(jobTimeMs / resumesToRank.length);

        console.log(`${'─'.repeat(70)}`);
        console.log(`✅ Completed "${jobRole.name}"`);
        console.log(`   Success: ${successCount}, Failed: ${failCount}`);
        console.log(`   Total Time: ${(jobTimeMs / 1000).toFixed(1)}s (avg ${avgTimeMs}ms per resume)`);

        results.push({
            jobDescriptionId: jobRole.id,
            jobDescriptionName: jobRole.name,
            jobDescriptionDataUri: jobRole.contentDataUri,
            candidates,
        });
    }

    console.log(`\n${'═'.repeat(70)}`);
    console.log(`🎉 BULK SCREENING COMPLETE`);
    console.log(`${'═'.repeat(70)}\n`);

    return results;
}

// ============================================
// Enhanced Version with Progress Tracking
// ============================================

export async function performBulkScreeningWithProgress(
    input: PerformBulkScreeningInput,
    options: {
        onProgress?: (progress: ProcessingProgress) => void;
    } = {}
): Promise<PerformBulkScreeningOutput> {
    const { jobRolesToScreen, resumesToRank } = input;
    const { onProgress } = options;

    const totalOperations = jobRolesToScreen.length * resumesToRank.length;
    let processedCount = 0;
    let succeededCount = 0;
    let failedCount = 0;

    const sendProgress = (status: string) => {
        onProgress?.({
            current: processedCount,
            total: totalOperations,
            succeeded: succeededCount,
            failed: failedCount,
            percentComplete: Math.round((processedCount / totalOperations) * 100),
            status,
        });
    };

    const results: PerformBulkScreeningOutput = [];

    for (const jobRole of jobRolesToScreen) {
        sendProgress(`Processing job: ${jobRole.name}`);

        const parsedJD = await parseDocument(jobRole.contentDataUri, jobRole.name);
        const jdSkills = extractSkills(parsedJD.text);

        const context: ProcessingContext = {
            jdText: parsedJD.text,
            jdSkills,
            totalResumes: resumesToRank.length,
            currentIndex: 0,
        };

        const candidates: RankedCandidate[] = [];

        for (let i = 0; i < resumesToRank.length; i++) {
            const resume = resumesToRank[i];
            context.currentIndex = i;

            sendProgress(`Processing: ${resume.name}`);

            try {
                const result = await processResumeSingleJob(
                    resume.dataUri,
                    resume.name,
                    resume.id,
                    jobRole,
                    context
                );

                candidates.push(result.candidate);
                succeededCount++;
            } catch (error) {
                failedCount++;
                candidates.push({
                    id: resume.id,
                    name: resume.name.replace(/\.[^/.]+$/, ''),
                    email: '',
                    score: 0,
                    atsScore: 0,
                    keySkills: 'Error',
                    feedback: `Processing error: ${error instanceof Error ? error.message : 'Unknown'}`,
                    originalResumeName: resume.name,
                    resumeDataUri: resume.dataUri,
                });
            }

            processedCount++;
            sendProgress(`Completed: ${resume.name}`);

            // Delay between resumes
            if (i < resumesToRank.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }

        candidates.sort((a, b) => b.score - a.score);

        results.push({
            jobDescriptionId: jobRole.id,
            jobDescriptionName: jobRole.name,
            jobDescriptionDataUri: jobRole.contentDataUri,
            candidates,
        });
    }

    sendProgress('Complete');

    return results;
}
