/**
 * Prompt Templates for Local LLM
 * 
 * Centralized prompt templates for qualitative analysis using Ollama.
 * All prompts are designed to return strict JSON outputs that can be validated with Zod.
 * 
 * LLM is used ONLY for:
 * - Final qualitative evaluation
 * - Score explanation ("why this score")
 * - Strengths and weaknesses summary
 * - Edge-case reasoning
 * - Internal multilingual normalization
 */

import { z } from 'zod';

// ============================================
// Output Schemas
// ============================================

export const QualitativeAnalysisSchema = z.object({
    summary: z.string().describe('2-3 sentence summary of candidate fit'),
    strengths: z.array(z.string()).min(2).max(4).describe('Top strengths of the candidate'),
    weaknesses: z.array(z.string()).min(1).max(3).describe('Key gaps or areas for improvement'),
    experienceRelevance: z.string().describe('Assessment of experience relevance (1 sentence)'),
    scoreExplanation: z.string().describe('Why the candidate received this score (2-3 sentences)'),
});

export type QualitativeAnalysis = z.infer<typeof QualitativeAnalysisSchema>;

export const ATSFeedbackSchema = z.object({
    detailedFeedback: z.string().describe('Detailed ATS compatibility feedback (3-5 sentences)'),
    specificImprovements: z.array(z.string()).min(2).max(5).describe('Specific actionable improvements'),
    strengths: z.array(z.string()).min(1).max(3).describe('ATS-friendly elements found'),
});

export type ATSFeedback = z.infer<typeof ATSFeedbackSchema>;

export const MultilingualNormalizationSchema = z.object({
    detectedLanguage: z.string().describe('ISO language code (e.g., en, es, fr, de)'),
    jobTitle: z.string().describe('Job title normalized to English'),
    skillsExtracted: z.array(z.string()).describe('Skills found, normalized to English'),
    yearsOfExperience: z.number().optional().describe('Total years of professional experience mentioned'),
});

export type MultilingualNormalization = z.infer<typeof MultilingualNormalizationSchema>;

// ============================================
// Prompt Templates
// ============================================

/**
 * Generate qualitative analysis for a resume against a JD
 * 
 * This is used AFTER deterministic scoring is complete.
 * The LLM provides explanations and human-readable feedback.
 */
export function createQualitativeAnalysisPrompt(params: {
    jdText: string;
    resumeText: string;
    scores: {
        final: number;
        semantic: number;
        skill: number;
        ats: number;
        experience: number;
    };
    matchedSkills: string[];
    missingSkills: string[];
}): string {
    return `You are an expert technical recruiter analyzing a candidate for a job opening.

**Job Description:**
${params.jdText.substring(0, 1500)}

**Candidate Resume:**
${params.resumeText.substring(0, 2000)}

**Deterministic Scores (Already Calculated):**
- Final Score: ${params.scores.final}/100
- Semantic Similarity: ${params.scores.semantic}/100
- Skill Match: ${params.scores.skill}/100
- ATS Formatting: ${params.scores.ats}/100
- Experience Relevance: ${params.scores.experience}/100

**Matched Skills:** ${params.matchedSkills.join(', ') || 'None'}
**Missing Skills:** ${params.missingSkills.join(', ') || 'None'}

Your task is to provide qualitative feedback that EXPLAINS these scores (DO NOT re-score).

Return a JSON object with:
{
  "summary": "A 2-3 sentence overview of the candidate's fit",
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "weaknesses": ["gap 1", "gap 2"],
  "experienceRelevance": "One sentence on experience relevance",
  "scoreExplanation": "Explain why the candidate received a ${params.scores.final}/100 score based on the metrics above"
}

Be concise, professional, and specific. Reference actual skills and experiences from the resume.`;
}

/**
 * Generate detailed ATS feedback
 * 
 * This explains the rule-based ATS score and provides actionable improvements.
 */
export function createATSFeedbackPrompt(params: {
    resumeText: string;
    atsScore: number;
    sectionsFound: string[];
    layoutType: 'single-column' | 'multi-column' | 'complex';
}): string {
    return `You are an ATS (Applicant Tracking System) expert. Analyze this resume for ATS compatibility.

**Resume:**
${params.resumeText.substring(0, 2000)}

**Deterministic ATS Score:** ${params.atsScore}/100
**Sections Detected:** ${params.sectionsFound.join(', ')}
**Layout Type:** ${params.layoutType}

Your task is to provide DETAILED feedback explaining the ATS score and actionable improvements.

Return a JSON object with:
{
  "detailedFeedback": "3-5 sentences explaining what works and what doesn't for ATS",
  "specificImprovements": ["improvement 1", "improvement 2", "improvement 3"],
  "strengths": ["strength 1", "strength 2"]
}

Focus on:
- Section presence and naming
- Font and formatting choices
- Keyword usage (general, not job-specific)
- Layout simplicity
- Machine readability

Be specific and actionable.`;
}

/**
 * Normalize multilingual resume content
 * 
 * For non-English resumes, extract key information and normalize to English.
 * This is INTERNAL ONLY and not shown to the user.
 */
export function createMultilingualNormalizationPrompt(params: {
    resumeText: string;
    detectedLanguage: string;
}): string {
    return `You are analyzing a resume written in ${params.detectedLanguage}.

**Resume:**
${params.resumeText.substring(0, 2000)}

Your task is to extract and NORMALIZE key information to English for internal analysis.

Return a JSON object with:
{
  "detectedLanguage": "${params.detectedLanguage}",
  "jobTitle": "Most recent job title (translated to English)",
  "skillsExtracted": ["skill1", "skill2", "skill3"],
  "yearsOfExperience": <number or null>
}

Extract:
- Job titles (translate to English equivalents)
- Technical skills (use English canonical names, e.g., "React.js", "Python")
- Total years of professional experience mentioned

Keep company names in original language.`;
}

/**
 * System prompts for different tasks
 */
export const SYSTEM_PROMPTS = {
    QUALITATIVE_ANALYSIS: `You are an expert technical recruiter with 10+ years of experience in resume screening and candidate evaluation. You provide clear, concise, and actionable feedback. Always return valid JSON.`,

    ATS_EXPERT: `You are an ATS (Applicant Tracking System) compatibility expert. You understand how resume parsing software works and provide specific, actionable advice. Always return valid JSON.`,

    MULTILINGUAL: `You are a multilingual resume analyst. You can read resumes in any language and extract normalized information in English. Always return valid JSON.`,

    STRICT_JSON: `You are a helpful assistant that ALWAYS returns valid, properly formatted JSON. Never include markdown, code blocks, or any text outside the JSON object.`,
};

// ============================================
// Prompt Helpers
// ============================================

/**
 * Truncate text to fit within token limits
 */
export function truncateText(text: string, maxChars: number): string {
    if (text.length <= maxChars) {
        return text;
    }
    return text.substring(0, maxChars) + '... [truncated]';
}

/**
 * Sanitize text for use in prompts (remove special characters that might confuse LLM)
 */
export function sanitizeForPrompt(text: string): string {
    // Remove excessive whitespace
    return text.replace(/\s+/g, ' ').trim();
}

/**
 * Validate that text is not empty or too short
 */
export function validateTextInput(text: string, minLength: number = 50): { valid: boolean; error?: string } {
    if (!text || text.trim().length === 0) {
        return { valid: false, error: 'Text is empty' };
    }

    if (text.trim().length < minLength) {
        return { valid: false, error: `Text too short (minimum ${minLength} characters)` };
    }

    return { valid: true };
}
