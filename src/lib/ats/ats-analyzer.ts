/**
 * ATS Analyzer - Rule-Based Resume Compatibility Checker (NO AI)
 * 
 * Evaluates resume formatting and structure for ATS (Applicant Tracking System) compatibility.
 * Uses deterministic rules to assess parseability by automated systems.
 */

import type { ParsedDocument, DocumentSection } from '../processing/document-parser';

// ============================================
// Types
// ============================================

export interface ATSScoreResult {
    atsScore: number; // 0-100
    feedback: string;
    sectionPresence: SectionPresence;
    layoutAnalysis: LayoutAnalysis;
    formattingAnalysis: FormattingAnalysis;
    breakdown: ATSScoreBreakdown;
}

export interface SectionPresence {
    contact: boolean;
    summary: boolean;
    experience: boolean;
    education: boolean;
    skills: boolean;
    score: number; // 0-30
}

export interface LayoutAnalysis {
    type: 'single-column' | 'multi-column' | 'complex';
    hasColumns: boolean;
    hasTables: boolean;
    readabilityScore: number; // 0-25
}

export interface FormattingAnalysis {
    hasStandardFonts: boolean;
    hasConsistentSpacing: boolean;
    hasExcessiveFormatting: boolean;
    formattingScore: number; // 0-20
}

export interface ATSScoreBreakdown {
    sectionScore: number;
    layoutScore: number;
    formattingScore: number;
    keywordScore: number;
    bonusPoints: number;
    penalties: number;
}

// ============================================
// Section Detection
// ============================================

const REQUIRED_SECTIONS = {
    contact: ['contact', 'personal information', 'info'],
    summary: ['summary', 'profile', 'objective', 'about'],
    experience: ['experience', 'work experience', 'employment', 'professional experience'],
    education: ['education', 'academic', 'qualifications'],
    skills: ['skills', 'technical skills', 'core competencies', 'expertise'],
};

/**
 * Analyze section presence in resume
 */
function analyzeSectionPresence(parsedDocument: ParsedDocument): SectionPresence {
    const detectedSections = new Set(
        parsedDocument.sections.map(s => s.title.toLowerCase())
    );

    const presence = {
        contact: hasSectionVariant(detectedSections, REQUIRED_SECTIONS.contact),
        summary: hasSectionVariant(detectedSections, REQUIRED_SECTIONS.summary),
        experience: hasSectionVariant(detectedSections, REQUIRED_SECTIONS.experience),
        education: hasSectionVariant(detectedSections, REQUIRED_SECTIONS.education),
        skills: hasSectionVariant(detectedSections, REQUIRED_SECTIONS.skills),
        score: 0,
    };

    // Calculate score (30 points max)
    const criticalSections = [presence.experience, presence.education, presence.skills];
    const optionalSections = [presence.contact, presence.summary];

    const criticalFound = criticalSections.filter(Boolean).length;
    const optionalFound = optionalSections.filter(Boolean).length;

    presence.score = (criticalFound / 3) * 24 + (optionalFound / 2) * 6;

    return presence;
}

/**
 * Check if any section variant is present
 */
function hasSectionVariant(sections: Set<string>, variants: string[]): boolean {
    return variants.some(variant =>
        Array.from(sections).some(section => section.includes(variant))
    );
}

// ============================================
// Layout Analysis
// ============================================

/**
 * Analyze resume layout structure
 */
function analyzeLayout(parsedDocument: ParsedDocument): LayoutAnalysis {
    const text = parsedDocument.text;

    // Detect columns (heuristic: lots of spaces in the middle of lines)
    const hasColumns = detectColumns(text);

    // Detect tables (presence of pipe characters or consistent tab patterns)
    const hasTables = detectTables(text);

    // Determine layout type
    let type: 'single-column' | 'multi-column' | 'complex' = 'single-column';
    if (hasTables || (hasColumns && text.split('\n').length > 50)) {
        type = 'complex';
    } else if (hasColumns) {
        type = 'multi-column';
    }

    // Calculate readability score
    let readabilityScore = 25; // Start at max

    if (hasColumns) {
        readabilityScore -= 10;
    }

    if (hasTables) {
        readabilityScore -= 10;
    }

    if (type === 'complex') {
        readabilityScore -= 5;
    }

    readabilityScore = Math.max(0, readabilityScore);

    return {
        type,
        hasColumns,
        hasTables,
        readabilityScore,
    };
}

/**
 * Detect multi-column layout
 */
function detectColumns(text: string): boolean {
    const lines = text.split('\n');
    let columnIndicators = 0;

    for (const line of lines) {
        // Check for excessive spaces in the middle
        const trimmed = line.trim();
        const spaceRuns = trimmed.match(/\s{5,}/g);

        if (spaceRuns && spaceRuns.length > 0) {
            columnIndicators++;
        }
    }

    // If more than 10% of lines have column indicators
    return columnIndicators > lines.length * 0.1;
}

/**
 * Detect table structures
 */
function detectTables(text: string): boolean {
    const lines = text.split('\n');

    // Look for pipe characters (markdown tables)
    const pipeLines = lines.filter(line => line.includes('|')).length;
    if (pipeLines > 3) return true;

    // Look for consistent tab patterns
    const tabLines = lines.filter(line => line.includes('\t')).length;
    if (tabLines > lines.length * 0.2) return true;

    return false;
}

// ============================================
// Formatting Analysis
// ============================================

/**
 * Analyze resume formatting
 */
function analyzeFormatting(parsedDocument: ParsedDocument): FormattingAnalysis {
    const text = parsedDocument.text;

    // Check for excessive formatting indicators
    const hasExcessiveFormatting = detectExcessiveFormatting(text);

    // Assume standard fonts (can't detect from text, give benefit of doubt)
    const hasStandardFonts = true;

    // Check spacing consistency
    const hasConsistentSpacing = checkSpacingConsistency(text);

    // Calculate formatting score
    let formattingScore = 20;

    if (hasExcessiveFormatting) {
        formattingScore -= 8;
    }

    if (!hasConsistentSpacing) {
        formattingScore -= 5;
    }

    return {
        hasStandardFonts,
        hasConsistentSpacing,
        hasExcessiveFormatting,
        formattingScore: Math.max(0, formattingScore),
    };
}

/**
 * Detect excessive formatting (symbols, decorative characters)
 */
function detectExcessiveFormatting(text: string): boolean {
    // Count special decorative characters
    const decorativeChars = text.match(/[★☆●○■□▪▫◆◇•]/g);
    if (decorativeChars && decorativeChars.length > 10) return true;

    // Count excessive symbols
    const symbols = text.match(/[►▸►▶▷»]/g);
    if (symbols && symbols.length > 5) return true;

    return false;
}

/**
 * Check spacing consistency
 */
function checkSpacingConsistency(text: string): boolean {
    const lines = text.split('\n').filter(l => l.trim());

    if (lines.length === 0) return true;

    // Check if lines have wildly inconsistent spacing
    const spacingVariance = calculateSpacingVariance(lines);

    // High variance indicates inconsistent spacing
    return spacingVariance < 0.5;
}

/**
 * Calculate spacing variance (simple heuristic)
 */
function calculateSpacingVariance(lines: string[]): number {
    const leadingSpaces = lines.map(line => {
        const match = line.match(/^(\s*)/);
        return match ? match[1].length : 0;
    });

    const uniqueSpaces = new Set(leadingSpaces);

    // Variance is the ratio of unique spacing values to total lines
    return uniqueSpaces.size / lines.length;
}

// ============================================
// Keyword Analysis
// ============================================

/**
 * Analyze general keyword usage (not job-specific)
 */
function analyzeKeywords(parsedDocument: ParsedDocument): number {
    const text = parsedDocument.normalizedText;

    // Count professional keywords
    const professionalKeywords = [
        'experience', 'skilled', 'developed', 'managed', 'led',
        'implemented', 'designed', 'created', 'improved', 'achieved',
        'delivered', 'collaborated', 'responsible', 'proficient',
    ];

    let keywordCount = 0;
    for (const keyword of professionalKeywords) {
        const pattern = new RegExp(`\\b${keyword}\\b`, 'gi');
        const matches = text.match(pattern);
        if (matches) {
            keywordCount += Math.min(matches.length, 3); // Cap per keyword
        }
    }

    // Score: 15 points max for keyword usage
    const score = Math.min(15, keywordCount * 0.5);

    return score;
}

// ============================================
// Bonus Points & Penalties
// ============================================

/**
 * Calculate bonus points for good practices
 */
function calculateBonusPoints(parsedDocument: ParsedDocument): number {
    let bonus = 0;

    // Bonus for good length (not too short, not too long)
    const wordCount = parsedDocument.metadata.wordCount;
    if (wordCount >= 300 && wordCount <= 800) {
        bonus += 5;
    }

    // Bonus for having dates in consistent format
    const datePattern = /\b\d{4}\b/g;
    const dates = parsedDocument.text.match(datePattern);
    if (dates && dates.length >= 2) {
        bonus += 3;
    }

    // Bonus for having email and phone
    const hasEmail = /@/.test(parsedDocument.text);
    const hasPhone = /\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/.test(parsedDocument.text);

    if (hasEmail) bonus += 2;
    if (hasPhone) bonus += 2;

    return Math.min(10, bonus);
}

/**
 * Calculate penalties for bad practices
 */
function calculatePenalties(parsedDocument: ParsedDocument): number {
    let penalties = 0;

    // Penalty for very short resume
    if (parsedDocument.metadata.wordCount < 200) {
        penalties += 10;
    }

    // Penalty for very long resume
    if (parsedDocument.metadata.wordCount > 1200) {
        penalties += 5;
    }

    // Penalty for lack of structure
    if (parsedDocument.sections.length < 2) {
        penalties += 10;
    }

    return Math.min(15, penalties);
}

// ============================================
// Main ATS Scoring Function
// ============================================

/**
 * Calculate ATS compatibility score for a resume
 */
export function calculateATSScore(parsedDocument: ParsedDocument): ATSScoreResult {
    // Analyze all components
    const sectionPresence = analyzeSectionPresence(parsedDocument);
    const layoutAnalysis = analyzeLayout(parsedDocument);
    const formattingAnalysis = analyzeFormatting(parsedDocument);
    const keywordScore = analyzeKeywords(parsedDocument);
    const bonusPoints = calculateBonusPoints(parsedDocument);
    const penalties = calculatePenalties(parsedDocument);

    // Calculate final score
    const breakdown: ATSScoreBreakdown = {
        sectionScore: sectionPresence.score,
        layoutScore: layoutAnalysis.readabilityScore,
        formattingScore: formattingAnalysis.formattingScore,
        keywordScore,
        bonusPoints,
        penalties,
    };

    const rawScore =
        breakdown.sectionScore +
        breakdown.layoutScore +
        breakdown.formattingScore +
        breakdown.keywordScore +
        breakdown.bonusPoints -
        breakdown.penalties;

    const atsScore = Math.max(0, Math.min(100, Math.round(rawScore)));

    // Generate feedback
    const feedback = generateATSFeedback(
        atsScore,
        sectionPresence,
        layoutAnalysis,
        formattingAnalysis
    );

    return {
        atsScore,
        feedback,
        sectionPresence,
        layoutAnalysis,
        formattingAnalysis,
        breakdown,
    };
}

/**
 * Generate human-readable ATS feedback
 */
function generateATSFeedback(
    score: number,
    sections: SectionPresence,
    layout: LayoutAnalysis,
    formatting: FormattingAnalysis
): string {
    const feedback: string[] = [];

    if (score >= 80) {
        feedback.push('Excellent ATS compatibility.');
    } else if (score >= 60) {
        feedback.push('Good ATS compatibility with room for improvement.');
    } else if (score >= 40) {
        feedback.push('Moderate ATS compatibility. Several issues should be addressed.');
    } else {
        feedback.push('Low ATS compatibility. Significant improvements needed.');
    }

    // Section feedback
    const missingSections = [];
    if (!sections.experience) missingSections.push('experience');
    if (!sections.education) missingSections.push('education');
    if (!sections.skills) missingSections.push('skills');

    if (missingSections.length > 0) {
        feedback.push(`Missing critical sections: ${missingSections.join(', ')}.`);
    }

    // Layout feedback
    if (layout.type === 'multi-column') {
        feedback.push('Multi-column layout may confuse some ATS systems. Consider single-column format.');
    } else if (layout.type === 'complex') {
        feedback.push('Complex layout with tables detected. Simplify for better ATS parsing.');
    }

    // Formatting feedback
    if (formatting.hasExcessiveFormatting) {
        feedback.push('Reduce decorative symbols and special characters.');
    }

    if (!formatting.hasConsistentSpacing) {
        feedback.push('Use consistent spacing and indentation.');
    }

    return feedback.join(' ');
}

/**
 * Get ATS improvement suggestions
 */
export function getATSImprovements(result: ATSScoreResult): string[] {
    const suggestions: string[] = [];

    // Section suggestions
    if (!result.sectionPresence.experience) {
        suggestions.push('Add a clear "Work Experience" or "Professional Experience" section');
    }
    if (!result.sectionPresence.education) {
        suggestions.push('Include an "Education" section');
    }
    if (!result.sectionPresence.skills) {
        suggestions.push('Add a "Skills" or "Technical Skills" section');
    }

    // Layout suggestions
    if (result.layoutAnalysis.type !== 'single-column') {
        suggestions.push('Use a simple single-column layout');
    }
    if (result.layoutAnalysis.hasTables) {
        suggestions.push('Avoid tables; use bullet points instead');
    }

    // Formatting suggestions
    if (result.formattingAnalysis.hasExcessiveFormatting) {
        suggestions.push('Remove decorative symbols (★, •, ►, etc.)');
    }
    if (!result.formattingAnalysis.hasConsistentSpacing) {
        suggestions.push('Use consistent spacing between sections');
    }

    // General suggestions
    if (result.atsScore < 60) {
        suggestions.push('Use standard section headers (Experience, Education, Skills)');
        suggestions.push('Use standard fonts (Arial, Calibri, Times New Roman)');
        suggestions.push('Save as .docx or .pdf (with text layer, not scanned)');
    }

    return suggestions;
}
