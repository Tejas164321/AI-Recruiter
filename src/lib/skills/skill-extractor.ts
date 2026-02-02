/**
 * Skill Extractor - Extract Skills from Text (NO AI)
 * 
 * Uses regex patterns and the skill taxonomy to extract skills from resumes and job descriptions.
 * Handles synonyms, partial matches, and contextual extraction.
 */

import { SKILL_DATABASE, SkillDefinition, normalizeSkillName, type SkillCategory } from './skill-taxonomy';

// ============================================
// Types
// ============================================

export interface ExtractedSkill {
    canonical: string;
    originalText: string;
    category: SkillCategory;
    count: number;
    context: string[];
    confidence: number;
    isRequired?: boolean;
}

export interface SkillExtractionResult {
    skills: ExtractedSkill[];
    totalMatches: number;
    uniqueSkills: number;
    keywordStuffingScore: number; // 0-100, higher = more stuffing detected
    categories: Record<SkillCategory, number>;
}

// ============================================
// Regex Utilities
// ============================================

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Create regex pattern for skill matching
 */
function createSkillPattern(skill: string): RegExp {
    const escaped = escapeRegex(skill);
    // Match word boundaries, allow for variations with dots, hyphens
    return new RegExp(`\\b${escaped}\\b`, 'gi');
}

// ============================================
// Context Extraction
// ============================================

/**
 * Extract context around a skill mention
 */
function extractContext(text: string, skillMatch: string, contextLength: number = 50): string {
    const index = text.toLowerCase().indexOf(skillMatch.toLowerCase());
    if (index === -1) return '';

    const start = Math.max(0, index - contextLength);
    const end = Math.min(text.length, index + skillMatch.length + contextLength);

    let context = text.substring(start, end).trim();

    // Clean up context
    context = context.replace(/\s+/g, ' ');

    return context;
}

/**
 * Determine if a skill is marked as required in the context
 */
function isRequiredInContext(context: string): boolean {
    const requiredKeywords = [
        'required',
        'must have',
        'essential',
        'mandatory',
        'critical',
        'necessary',
    ];

    const lowerContext = context.toLowerCase();
    return requiredKeywords.some(keyword => lowerContext.includes(keyword));
}

// ============================================
// Skill Extraction
// ============================================

/**
 * Extract skills from text using the skill taxonomy
 */
export function extractSkills(text: string): SkillExtractionResult {
    const extractedSkills = new Map<string, ExtractedSkill>();
    const normalizedText = text.toLowerCase();
    let totalMatches = 0;

    // Process each skill in the database
    for (const skillDef of SKILL_DATABASE) {
        const allVariants = [skillDef.canonical, ...skillDef.synonyms];

        let skillMatches = 0;
        const contexts: string[] = [];
        let isRequired = false;

        for (const variant of allVariants) {
            const pattern = createSkillPattern(variant);
            const matches = normalizedText.match(pattern);

            if (matches) {
                skillMatches += matches.length;
                totalMatches += matches.length;

                // Extract context for each match (up to 3 contexts)
                if (contexts.length < 3) {
                    const context = extractContext(text, variant);
                    if (context) {
                        contexts.push(context);
                        if (isRequiredInContext(context)) {
                            isRequired = true;
                        }
                    }
                }
            }
        }

        // If skill was found, add to extracted skills
        if (skillMatches > 0) {
            const existing = extractedSkills.get(skillDef.canonical);

            if (existing) {
                existing.count += skillMatches;
                existing.context.push(...contexts);
            } else {
                extractedSkills.set(skillDef.canonical, {
                    canonical: skillDef.canonical,
                    originalText: skillDef.canonical,
                    category: skillDef.category,
                    count: skillMatches,
                    context: contexts,
                    confidence: calculateConfidence(skillMatches, contexts),
                    isRequired,
                });
            }
        }
    }

    // Detect keyword stuffing
    const keywordStuffingScore = detectKeywordStuffing(Array.from(extractedSkills.values()));

    // Count skills by category
    const categories = countByCategory(Array.from(extractedSkills.values()));

    return {
        skills: Array.from(extractedSkills.values()).sort((a, b) => b.count - a.count),
        totalMatches,
        uniqueSkills: extractedSkills.size,
        keywordStuffingScore,
        categories,
    };
}

/**
 * Calculate confidence score for a skill match
 */
function calculateConfidence(matchCount: number, contexts: string[]): number {
    // Base confidence from match count
    let confidence = Math.min(matchCount * 20, 80);

    // Bonus for having context
    if (contexts.length > 0) {
        confidence += 10;
    }

    // Bonus for appearing in multiple contexts
    if (contexts.length > 1) {
        confidence += 10;
    }

    return Math.min(100, confidence);
}

/**
 * Detect keyword stuffing (excessive repetition)
 */
export function detectKeywordStuffing(skills: ExtractedSkill[]): number {
    if (skills.length === 0) return 0;

    let stuffingScore = 0;

    // Check for excessive repetition
    for (const skill of skills) {
        if (skill.count > 5) {
            stuffingScore += (skill.count - 5) * 5;
        }
    }

    // Check for unrealistic skill counts
    const totalMentions = skills.reduce((sum, s) => sum + s.count, 0);
    if (totalMentions > 50) {
        stuffingScore += (totalMentions - 50) * 2;
    }

    return Math.min(100, stuffingScore);
}

/**
 * Count skills by category
 */
function countByCategory(skills: ExtractedSkill[]): Record<SkillCategory, number> {
    const categories: Record<string, number> = {};

    for (const skill of skills) {
        categories[skill.category] = (categories[skill.category] || 0) + 1;
    }

    return categories as Record<SkillCategory, number>;
}

// ============================================
// Specialized Extractors
// ============================================

/**
 * Extract years of experience from text
 */
export function extractYearsOfExperience(text: string): number | null {
    const patterns = [
        /(\d+)\+?\s*years?\s+(?:of\s+)?experience/gi,
        /experience:\s*(\d+)\+?\s*years?/gi,
        /(\d+)\+?\s*yrs?\s+(?:of\s+)?experience/gi,
    ];

    const years: number[] = [];

    for (const pattern of patterns) {
        const matches = text.matchAll(pattern);
        for (const match of matches) {
            const yearValue = parseInt(match[1], 10);
            if (yearValue > 0 && yearValue < 50) {
                years.push(yearValue);
            }
        }
    }

    if (years.length === 0) return null;

    // Return the maximum years mentioned (most relevant)
    return Math.max(...years);
}

/**
 * Extract job titles from text
 */
export function extractJobTitles(text: string): string[] {
    const titles: string[] = [];

    // Common title patterns
    const titleKeywords = [
        'software engineer',
        'senior software engineer',
        'junior software engineer',
        'full stack developer',
        'frontend developer',
        'backend developer',
        'data scientist',
        'ml engineer',
        'devops engineer',
        'product manager',
        'project manager',
        'technical lead',
        'team lead',
        'engineering manager',
    ];

    const normalizedText = text.toLowerCase();

    for (const title of titleKeywords) {
        const pattern = new RegExp(`\\b${escapeRegex(title)}\\b`, 'i');
        if (pattern.test(normalizedText)) {
            const match = text.match(pattern);
            if (match) {
                titles.push(match[0]);
            }
        }
    }

    return titles;
}

/**
 * Extract required vs optional skills from JD
 */
export function categorizeRequiredSkills(text: string, skills: ExtractedSkill[]): {
    required: string[];
    optional: string[];
} {
    const required: string[] = [];
    const optional: string[] = [];

    for (const skill of skills) {
        if (skill.isRequired || skill.context.some(ctx => isRequiredInContext(ctx))) {
            required.push(skill.canonical);
        } else {
            optional.push(skill.canonical);
        }
    }

    return { required, optional };
}

/**
 * Extract skill level indicators
 */
export function extractSkillLevels(text: string): Map<string, 'beginner' | 'intermediate' | 'expert'> {
    const levels = new Map<string, 'beginner' | 'intermediate' | 'expert'>();

    const levelPatterns = [
        { level: 'expert' as const, keywords: ['expert', 'advanced', 'senior', 'lead', 'principal'] },
        { level: 'intermediate' as const, keywords: ['intermediate', 'mid-level', 'proficient'] },
        { level: 'beginner' as const, keywords: ['beginner', 'junior', 'entry-level', 'basic'] },
    ];

    for (const { level, keywords } of levelPatterns) {
        for (const keyword of keywords) {
            const pattern = new RegExp(`${keyword}[^.]*?(${SKILL_DATABASE.map(s => escapeRegex(s.canonical)).join('|')})`, 'gi');
            const matches = text.matchAll(pattern);

            for (const match of matches) {
                const skill = match[1];
                const normalized = normalizeSkillName(skill);
                if (!levels.has(normalized)) {
                    levels.set(normalized, level);
                }
            }
        }
    }

    return levels;
}
