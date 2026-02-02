/**
 * Skill Matcher - Match Skills Between JD and Resume
 * 
 * Compares extracted skills to calculate match scores.
 * Handles partial matches, synonyms, and related skills.
 */

import type { ExtractedSkill } from './skill-extractor';
import { getSkillByName } from './skill-taxonomy';

// ============================================
// Types
// ============================================

export interface SkillMatchResult {
    score: number; // 0-100
    matchedSkills: string[];
    missingSkills: string[];
    extraSkills: string[];
    partialMatches: PartialMatch[];
    breakdown: SkillMatchBreakdown;
}

export interface SkillMatchBreakdown {
    requiredMatched: number;
    requiredTotal: number;
    optionalMatched: number;
    optionalTotal: number;
    categoryMatches: Record<string, { matched: number; total: number }>;
}

export interface PartialMatch {
    jdSkill: string;
    resumeSkill: string;
    matchType: 'related' | 'category' | 'partial';
    confidence: number;
}

// ============================================
// Skill Matching Logic
// ============================================

/**
 * Calculate skill match score between JD and resume
 */
export function calculateSkillMatchScore(
    jdSkills: ExtractedSkill[],
    resumeSkills: ExtractedSkill[]
): SkillMatchResult {
    if (jdSkills.length === 0) {
        return {
            score: 0,
            matchedSkills: [],
            missingSkills: [],
            extraSkills: resumeSkills.map(s => s.canonical),
            partialMatches: [],
            breakdown: {
                requiredMatched: 0,
                requiredTotal: 0,
                optionalMatched: 0,
                optionalTotal: 0,
                categoryMatches: {},
            },
        };
    }

    // Separate required and optional skills
    const requiredJDSkills = jdSkills.filter(s => s.isRequired);
    const optionalJDSkills = jdSkills.filter(s => !s.isRequired);

    // If no skills explicitly marked as required, treat all as required
    const effectiveRequired = requiredJDSkills.length > 0 ? requiredJDSkills : jdSkills;
    const effectiveOptional = requiredJDSkills.length > 0 ? optionalJDSkills : [];

    // Find exact matches
    const resumeSkillSet = new Set(resumeSkills.map(s => s.canonical.toLowerCase()));

    const matchedSkills: string[] = [];
    const missingSkills: string[] = [];
    const partialMatches: PartialMatch[] = [];

    let requiredMatched = 0;
    let optionalMatched = 0;

    // Check required skills
    for (const skill of effectiveRequired) {
        const normalized = skill.canonical.toLowerCase();

        if (resumeSkillSet.has(normalized)) {
            matchedSkills.push(skill.canonical);
            requiredMatched++;
        } else {
            // Check for partial/related matches
            const partial = findPartialMatch(skill, resumeSkills);
            if (partial) {
                partialMatches.push(partial);
                // Count partial matches as 0.5 of a full match
                requiredMatched += 0.5;
            } else {
                missingSkills.push(skill.canonical);
            }
        }
    }

    // Check optional skills
    for (const skill of effectiveOptional) {
        const normalized = skill.canonical.toLowerCase();

        if (resumeSkillSet.has(normalized)) {
            if (!matchedSkills.includes(skill.canonical)) {
                matchedSkills.push(skill.canonical);
            }
            optionalMatched++;
        } else {
            const partial = findPartialMatch(skill, resumeSkills);
            if (partial && !partialMatches.some(p => p.jdSkill === partial.jdSkill)) {
                partialMatches.push(partial);
                optionalMatched += 0.5;
            }
        }
    }

    // Find extra skills (in resume but not in JD)
    const jdSkillSet = new Set(jdSkills.map(s => s.canonical.toLowerCase()));
    const extraSkills = resumeSkills
        .filter(s => !jdSkillSet.has(s.canonical.toLowerCase()))
        .map(s => s.canonical);

    // Calculate scores
    const requiredScore = effectiveRequired.length > 0
        ? (requiredMatched / effectiveRequired.length) * 70
        : 0;

    const optionalScore = effectiveOptional.length > 0
        ? (optionalMatched / effectiveOptional.length) * 20
        : 0;

    // Bonus for extra relevant skills
    const extraBonus = Math.min(10, extraSkills.length * 2);

    // Penalty for keyword stuffing (if detected in resume)
    const stuffingPenalty = calculateStuffingPenalty(resumeSkills);

    // Final score
    const rawScore = requiredScore + optionalScore + extraBonus - stuffingPenalty;
    const finalScore = Math.max(0, Math.min(100, Math.round(rawScore)));

    // Category breakdown
    const categoryMatches = calculateCategoryMatches(jdSkills, resumeSkills);

    return {
        score: finalScore,
        matchedSkills,
        missingSkills,
        extraSkills,
        partialMatches,
        breakdown: {
            requiredMatched,
            requiredTotal: effectiveRequired.length,
            optionalMatched,
            optionalTotal: effectiveOptional.length,
            categoryMatches,
        },
    };
}

/**
 * Find partial matches (related skills, same category)
 */
function findPartialMatch(
    jdSkill: ExtractedSkill,
    resumeSkills: ExtractedSkill[]
): PartialMatch | null {
    const jdSkillDef = getSkillByName(jdSkill.canonical);
    if (!jdSkillDef) return null;

    // Check for related skills
    if (jdSkillDef.relatedSkills) {
        for (const relatedSkillName of jdSkillDef.relatedSkills) {
            const match = resumeSkills.find(
                rs => rs.canonical.toLowerCase() === relatedSkillName.toLowerCase()
            );
            if (match) {
                return {
                    jdSkill: jdSkill.canonical,
                    resumeSkill: match.canonical,
                    matchType: 'related',
                    confidence: 70,
                };
            }
        }
    }

    // Check for same category
    const sameCategory = resumeSkills.find(
        rs => rs.category === jdSkill.category &&
            rs.canonical.toLowerCase() !== jdSkill.canonical.toLowerCase()
    );

    if (sameCategory) {
        return {
            jdSkill: jdSkill.canonical,
            resumeSkill: sameCategory.canonical,
            matchType: 'category',
            confidence: 40,
        };
    }

    return null;
}

/**
 * Calculate penalty for keyword stuffing
 */
function calculateStuffingPenalty(skills: ExtractedSkill[]): number {
    let penalty = 0;

    for (const skill of skills) {
        // Penalize skills mentioned more than 5 times
        if (skill.count > 5) {
            penalty += (skill.count - 5) * 2;
        }
    }

    return Math.min(20, penalty);
}

/**
 * Calculate category-level matches
 */
function calculateCategoryMatches(
    jdSkills: ExtractedSkill[],
    resumeSkills: ExtractedSkill[]
): Record<string, { matched: number; total: number }> {
    const categoryMatches: Record<string, { matched: number; total: number }> = {};

    // Group JD skills by category
    const jdByCategory = groupByCategory(jdSkills);
    const resumeByCategory = groupByCategory(resumeSkills);

    for (const [category, jdCategorySkills] of Object.entries(jdByCategory)) {
        const resumeCategorySkills = resumeByCategory[category] || [];
        const resumeSkillSet = new Set(resumeCategorySkills.map(s => s.canonical.toLowerCase()));

        const matched = jdCategorySkills.filter(skill =>
            resumeSkillSet.has(skill.canonical.toLowerCase())
        ).length;

        categoryMatches[category] = {
            matched,
            total: jdCategorySkills.length,
        };
    }

    return categoryMatches;
}

/**
 * Group skills by category
 */
function groupByCategory(skills: ExtractedSkill[]): Record<string, ExtractedSkill[]> {
    const grouped: Record<string, ExtractedSkill[]> = {};

    for (const skill of skills) {
        if (!grouped[skill.category]) {
            grouped[skill.category] = [];
        }
        grouped[skill.category].push(skill);
    }

    return grouped;
}

/**
 * Calculate skill coverage percentage
 */
export function calculateSkillCoverage(
    matchResult: SkillMatchResult
): { required: number; optional: number; overall: number } {
    const { breakdown } = matchResult;

    const requiredCoverage = breakdown.requiredTotal > 0
        ? (breakdown.requiredMatched / breakdown.requiredTotal) * 100
        : 100;

    const optionalCoverage = breakdown.optionalTotal > 0
        ? (breakdown.optionalMatched / breakdown.optionalTotal) * 100
        : 100;

    const totalRequired = breakdown.requiredTotal + breakdown.optionalTotal;
    const totalMatched = breakdown.requiredMatched + breakdown.optionalMatched;

    const overallCoverage = totalRequired > 0
        ? (totalMatched / totalRequired) * 100
        : 100;

    return {
        required: Math.round(requiredCoverage),
        optional: Math.round(optionalCoverage),
        overall: Math.round(overallCoverage),
    };
}

/**
 * Generate human-readable skill match summary
 */
export function generateSkillMatchSummary(matchResult: SkillMatchResult): string {
    const { score, matchedSkills, missingSkills, partialMatches } = matchResult;
    const coverage = calculateSkillCoverage(matchResult);

    const lines: string[] = [];

    lines.push(`Skill Match Score: ${score}/100`);
    lines.push(`Overall Coverage: ${coverage.overall}%`);

    if (matchedSkills.length > 0) {
        lines.push(`Matched Skills (${matchedSkills.length}): ${matchedSkills.slice(0, 5).join(', ')}${matchedSkills.length > 5 ? '...' : ''}`);
    }

    if (missingSkills.length > 0) {
        lines.push(`Missing Skills (${missingSkills.length}): ${missingSkills.slice(0, 5).join(', ')}${missingSkills.length > 5 ? '...' : ''}`);
    }

    if (partialMatches.length > 0) {
        lines.push(`Partial Matches (${partialMatches.length}): ${partialMatches.map(p => `${p.jdSkill}→${p.resumeSkill}`).slice(0, 3).join(', ')}`);
    }

    return lines.join('\n');
}
