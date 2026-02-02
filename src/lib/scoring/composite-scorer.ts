/**
 * Composite Scorer - Weighted Scoring Algorithm
 * 
 * Combines multiple scoring components into a final weighted score.
 * Handles normalization, clamping, and provides detailed breakdowns.
 */

// ============================================
// Types
// ============================================

export interface ScoreComponents {
    semanticSimilarity: number;   // 0-100
    skillMatch: number;           // 0-100
    experienceRelevance: number;  // 0-100
    atsFormatting: number;        // 0-100
    llmCalibration?: number;      // 0-100 (optional adjustment from LLM)
}

export interface ScoreWeights {
    semantic: number;     // Default: 0.45
    skill: number;        // Default: 0.25
    experience: number;   // Default: 0.15
    ats: number;          // Default: 0.10
    llm: number;          // Default: 0.05
}

export interface CompositeScoreResult {
    finalScore: number;
    components: ScoreComponents;
    weights: ScoreWeights;
    breakdown: ScoreBreakdown;
    grade: ScoreGrade;
}

export interface ScoreBreakdown {
    semanticContribution: number;
    skillContribution: number;
    experienceContribution: number;
    atsContribution: number;
    llmContribution: number;
}

export type ScoreGrade = 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'No Match';

// ============================================
// Default Weights
// ============================================

export const DEFAULT_WEIGHTS: ScoreWeights = {
    semantic: 0.45,   // Semantic similarity is most important
    skill: 0.25,      // Skill match is second most important
    experience: 0.15, // Experience relevance matters
    ats: 0.10,        // ATS formatting is good to have
    llm: 0.05,        // LLM calibration is a minor adjustment
};

// ============================================
// Scoring Functions
// ============================================

/**
 * Calculate composite score from all components
 */
export function calculateCompositeScore(
    components: ScoreComponents,
    weights: ScoreWeights = DEFAULT_WEIGHTS
): CompositeScoreResult {
    // Ensure all components are valid (0-100)
    const normalized = normalizeComponents(components);

    // Calculate weighted contributions
    const breakdown: ScoreBreakdown = {
        semanticContribution: normalized.semanticSimilarity * weights.semantic,
        skillContribution: normalized.skillMatch * weights.skill,
        experienceContribution: normalized.experienceRelevance * weights.experience,
        atsContribution: normalized.atsFormatting * weights.ats,
        llmContribution: (normalized.llmCalibration || 0) * weights.llm,
    };

    // Sum all contributions
    const rawScore =
        breakdown.semanticContribution +
        breakdown.skillContribution +
        breakdown.experienceContribution +
        breakdown.atsContribution +
        breakdown.llmContribution;

    // Clamp to 0-100 range and round
    const finalScore = Math.max(0, Math.min(100, Math.round(rawScore)));

    // Determine grade
    const grade = getScoreGrade(finalScore);

    return {
        finalScore,
        components: normalized,
        weights,
        breakdown,
        grade,
    };
}

/**
 * Normalize components to ensure they're all 0-100
 */
function normalizeComponents(components: ScoreComponents): ScoreComponents {
    return {
        semanticSimilarity: clamp(components.semanticSimilarity, 0, 100),
        skillMatch: clamp(components.skillMatch, 0, 100),
        experienceRelevance: clamp(components.experienceRelevance, 0, 100),
        atsFormatting: clamp(components.atsFormatting, 0, 100),
        llmCalibration: components.llmCalibration ? clamp(components.llmCalibration, 0, 100) : undefined,
    };
}

/**
 * Clamp a value between min and max
 */
function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

/**
 * Get letter grade for a score
 */
function getScoreGrade(score: number): ScoreGrade {
    if (score >= 85) return 'Excellent';
    if (score >= 70) return 'Good';
    if (score >= 50) return 'Fair';
    if (score >= 30) return 'Poor';
    return 'No Match';
}

// ============================================
// Custom Weighting
// ============================================

/**
 * Create custom weights for specific use cases
 */
export function createCustomWeights(overrides: Partial<ScoreWeights>): ScoreWeights {
    const weights = { ...DEFAULT_WEIGHTS, ...overrides };

    // Ensure weights sum to approximately 1.0
    const total = weights.semantic + weights.skill + weights.experience + weights.ats + weights.llm;

    if (Math.abs(total - 1.0) > 0.01) {
        console.warn(`[CompositeScorer] Weights sum to ${total.toFixed(2)}, expected 1.0. Normalizing...`);

        // Normalize weights
        return {
            semantic: weights.semantic / total,
            skill: weights.skill / total,
            experience: weights.experience / total,
            ats: weights.ats / total,
            llm: weights.llm / total,
        };
    }

    return weights;
}

/**
 * Preset weight configurations for different scenarios
 */
export const WEIGHT_PRESETS = {
    BALANCED: DEFAULT_WEIGHTS,

    SKILL_FOCUSED: createCustomWeights({
        semantic: 0.30,
        skill: 0.45,
        experience: 0.15,
        ats: 0.05,
        llm: 0.05,
    }),

    EXPERIENCE_FOCUSED: createCustomWeights({
        semantic: 0.30,
        skill: 0.20,
        experience: 0.35,
        ats: 0.10,
        llm: 0.05,
    }),

    ATS_FOCUSED: createCustomWeights({
        semantic: 0.35,
        skill: 0.20,
        experience: 0.15,
        ats: 0.25,
        llm: 0.05,
    }),
};

// ============================================
// Score Analysis
// ============================================

/**
 * Generate detailed score explanation
 */
export function generateScoreExplanation(result: CompositeScoreResult): string {
    const lines: string[] = [];

    lines.push(`Final Score: ${result.finalScore}/100 (${result.grade})`);
    lines.push('');
    lines.push('Score Breakdown:');
    lines.push(`  • Semantic Similarity: ${result.components.semanticSimilarity}/100 → ${result.breakdown.semanticContribution.toFixed(1)} points (${(result.weights.semantic * 100).toFixed(0)}%)`);
    lines.push(`  • Skill Match: ${result.components.skillMatch}/100 → ${result.breakdown.skillContribution.toFixed(1)} points (${(result.weights.skill * 100).toFixed(0)}%)`);
    lines.push(`  • Experience Relevance: ${result.components.experienceRelevance}/100 → ${result.breakdown.experienceContribution.toFixed(1)} points (${(result.weights.experience * 100).toFixed(0)}%)`);
    lines.push(`  • ATS Formatting: ${result.components.atsFormatting}/100 → ${result.breakdown.atsContribution.toFixed(1)} points (${(result.weights.ats * 100).toFixed(0)}%)`);

    if (result.components.llmCalibration !== undefined) {
        lines.push(`  • LLM Calibration: ${result.components.llmCalibration}/100 → ${result.breakdown.llmContribution.toFixed(1)} points (${(result.weights.llm * 100).toFixed(0)}%)`);
    }

    return lines.join('\n');
}

/**
 * Identify weak areas that need improvement
 */
export function identifyWeakAreas(components: ScoreComponents): string[] {
    const weakAreas: string[] = [];
    const threshold = 60;

    if (components.semanticSimilarity < threshold) {
        weakAreas.push(`Low semantic match (${components.semanticSimilarity}/100) - resume content may not align well with job requirements`);
    }

    if (components.skillMatch < threshold) {
        weakAreas.push(`Low skill match (${components.skillMatch}/100) - missing key technical skills`);
    }

    if (components.experienceRelevance < threshold) {
        weakAreas.push(`Low experience relevance (${components.experienceRelevance}/100) - work history may not match role requirements`);
    }

    if (components.atsFormatting < threshold) {
        weakAreas.push(`Low ATS score (${components.atsFormatting}/100) - resume formatting needs improvement`);
    }

    return weakAreas;
}

/**
 * Get strongest areas
 */
export function identifyStrongAreas(components: ScoreComponents): string[] {
    const strongAreas: string[] = [];
    const threshold = 75;

    if (components.semanticSimilarity >= threshold) {
        strongAreas.push(`Strong semantic match (${components.semanticSimilarity}/100)`);
    }

    if (components.skillMatch >= threshold) {
        strongAreas.push(`Excellent skill match (${components.skillMatch}/100)`);
    }

    if (components.experienceRelevance >= threshold) {
        strongAreas.push(`Highly relevant experience (${components.experienceRelevance}/100)`);
    }

    if (components.atsFormatting >= threshold) {
        strongAreas.push(`ATS-friendly formatting (${components.atsFormatting}/100)`);
    }

    return strongAreas;
}

// ============================================
// Batch Scoring
// ============================================

/**
 * Score multiple candidates and rank them
 */
export interface RankedCandidate {
    candidateId: string;
    name: string;
    score: CompositeScoreResult;
    rank: number;
}

export function rankCandidates(
    candidates: Array<{ id: string; name: string; components: ScoreComponents }>,
    weights: ScoreWeights = DEFAULT_WEIGHTS
): RankedCandidate[] {
    // Calculate scores for all candidates
    const scoredCandidates = candidates.map(candidate => ({
        candidateId: candidate.id,
        name: candidate.name,
        score: calculateCompositeScore(candidate.components, weights),
    }));

    // Sort by final score (descending)
    scoredCandidates.sort((a, b) => b.score.finalScore - a.score.finalScore);

    // Assign ranks
    return scoredCandidates.map((candidate, index) => ({
        ...candidate,
        rank: index + 1,
    }));
}

/**
 * Calculate percentile rank for a score
 */
export function calculatePercentile(
    targetScore: number,
    allScores: number[]
): number {
    if (allScores.length === 0) return 50;

    const sortedScores = [...allScores].sort((a, b) => a - b);
    const belowCount = sortedScores.filter(s => s < targetScore).length;

    const percentile = (belowCount / allScores.length) * 100;

    return Math.round(percentile);
}
