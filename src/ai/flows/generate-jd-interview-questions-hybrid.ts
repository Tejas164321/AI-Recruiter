/**
 * Hybrid Interview Question Generator
 * 
 * ARCHITECTURE:
 * 1. Document parsing (deterministic)
 * 2. Skill extraction (deterministic)
 * 3. Question generation (local Ollama LLM)
 * 
 * This replaces the cloud-based Genkit flow with local LLM inference.
 */

'use server';

import { parseDocument } from '@/lib/processing/document-parser';
import { extractSkills } from '@/lib/skills/skill-extractor';
import { getOllamaClient } from '@/ai/local-llm/ollama-client';
import { SYSTEM_PROMPTS } from '@/ai/local-llm/prompt-templates';
import { z } from 'zod';

// ============================================
// Types
// ============================================

export interface GenerateJDInterviewQuestionsInput {
    jobDescriptionDataUri: string;
    roleTitle?: string;
    focusAreas?: string;
}

export interface GenerateJDInterviewQuestionsOutput {
    technicalQuestions: string[];
    behavioralQuestions: string[];
    situationalQuestions: string[];
    roleSpecificQuestions: string[];
}

// ============================================
// Output Schema
// ============================================

const InterviewQuestionsSchema = z.object({
    technicalQuestions: z.array(z.string()).describe('Technical questions related to required skills'),
    behavioralQuestions: z.array(z.string()).describe('Behavioral questions for cultural fit and soft skills'),
    situationalQuestions: z.array(z.string()).describe('Situational questions for problem-solving assessment'),
    roleSpecificQuestions: z.array(z.string()).describe('Questions specific to this role and responsibilities'),
});

// ============================================
//Prompt Creation
// ============================================

function createInterviewQuestionsPrompt(params: {
    jdText: string;
    roleTitle: string;
    skills: string[];
    focusAreas?: string;
}): string {
    const { jdText, roleTitle, skills, focusAreas } = params;

    return `You are an expert technical recruiter and hiring manager with 15+ years of experience conducting interviews.

**Job Title:** ${roleTitle}

**Job Description:**
${jdText.substring(0, 1500)}

**Key Skills Required:** ${skills.join(', ')}

${focusAreas ? `**Focus Areas:** ${focusAreas}\n` : ''}

Your task is to generate insightful, targeted interview questions for this role. Generate 3-5 questions for each category below.

Return a JSON object with exactly these fields:
{
  "technicalQuestions": ["question 1", "question 2", ...],
  "behavioralQuestions": ["question 1", "question 2", ...],
  "situationalQuestions": ["question 1", "question 2", ...],
  "roleSpecificQuestions": ["question 1", "question 2", ...]
}

**Guidelines:**
1. **Technical Questions**: Assess specific technical skills and knowledge mentioned in the JD
2. **Behavioral Questions**: Probe past experiences and team dynamics
3. **Situational Questions**: Present hypothetical scenarios relevant to the role
4. **Role-Specific Questions**: Focus on unique responsibilities and challenges of this position

Make questions open-ended, clear, and directly tied to the job requirements. Avoid generic questions that could apply to any role.`;
}

// ============================================
// Main Question Generation
// ============================================

export async function generateJDInterviewQuestions(
    input: GenerateJDInterviewQuestionsInput
): Promise<GenerateJDInterviewQuestionsOutput> {
    const { jobDescriptionDataUri, roleTitle, focusAreas } = input;

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`💼 INTERVIEW QUESTION GENERATION (Local LLM)`);
    console.log(`   Role: ${roleTitle || 'Unknown'}`);
    console.log(`${'═'.repeat(60)}\n`);

    try {
        // Step 1: Parse JD
        console.log(`   📄 Parsing job description...`);
        const parsedJD = await parseDocument(jobDescriptionDataUri, roleTitle || 'job-description');
        console.log(`   ✓ Parsed: ${parsedJD.metadata.wordCount} words`);

        // Step 2: Extract skills
        console.log(`   🔍 Extracting skills...`);
        const skillsExtracted = extractSkills(parsedJD.text);
        const topSkills = skillsExtracted.skills
            .slice(0, 15)
            .map(s => s.canonical);
        console.log(`   ✓ Found ${skillsExtracted.uniqueSkills} skills`);

        // Determine role title
        const finalRoleTitle = roleTitle ||
            parsedJD.sections.find(s => s.title.toLowerCase().includes('title'))?.content.split('\n')[0] ||
            'Unknown Role';

        // Step 3: Generate questions using local LLM
        console.log(`   🤖 Generating questions...`);
        const ollamaClient = getOllamaClient();

        const prompt = createInterviewQuestionsPrompt({
            jdText: parsedJD.text,
            roleTitle: finalRoleTitle,
            skills: topSkills,
            focusAreas,
        });

        const result = await ollamaClient.generateJSON(
            prompt,
            InterviewQuestionsSchema,
            {
                system: SYSTEM_PROMPTS.STRICT_JSON,
                temperature: 0.7, // Higher temperature for creative question generation
                maxTokens: 800, // Reduced from 1200 for faster generation
                timeout: 15000, // 15s timeout
            }
        );

        if (!result.success) {
            console.error(`   ❌ LLM failed: ${result.error}`);
            return createFallbackQuestions(topSkills, finalRoleTitle);
        }

        const questions = result.data;
        console.log(`   ✓ Generated questions:`);
        console.log(`      Technical: ${questions.technicalQuestions.length}`);
        console.log(`      Behavioral: ${questions.behavioralQuestions.length}`);
        console.log(`      Situational: ${questions.situationalQuestions.length}`);
        console.log(`      Role-Specific: ${questions.roleSpecificQuestions.length}`);

        console.log(`\n${'═'.repeat(60)}`);
        console.log(`✅ Question Generation Complete`);
        console.log(`${'═'.repeat(60)}\n`);

        return questions;

    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[generateJDInterviewQuestions] Error: `, message);

        // Return fallback questions
        console.warn('Returning fallback questions due to error');
        return createFallbackQuestions([], roleTitle || 'Unknown Role');
    }
}

// ============================================
// Fallback Questions
// ============================================

function createFallbackQuestions(skills: string[], roleTitle: string): GenerateJDInterviewQuestionsOutput {
    const topSkills = skills.slice(0, 5);

    return {
        technicalQuestions: [
            `Can you describe your experience with ${topSkills[0] || 'the technologies'} mentioned in this role?`,
            `Walk me through a challenging technical problem you've solved using ${topSkills[1] || 'relevant technologies'}.`,
            `How do you stay current with industry trends and best practices?`,
            `Explain your approach to code quality and testing.`,
            `Describe a complex system you've designed or architected.`,
        ].filter(q => q),

        behavioralQuestions: [
            'Tell me about a time when you had to work with a difficult team member.',
            'Describe a situation where you had to meet a tight deadline.',
            'How do you handle constructive criticism?',
            'Give an example of when you took initiative on a project.',
            'Describe a time when you had to learn something new quickly.',
        ],

        situationalQuestions: [
            'If you inherited a codebase with poor documentation, how would you approach it?',
            'How would you handle disagreement with a senior team member on a technical decision?',
            'If a critical bug was discovered in production, what would be your response?',
            'How would you prioritize multiple high-priority tasks with competing deadlines?',
            'If you noticed a team member struggling, how would you help?',
        ],

        roleSpecificQuestions: [
            `What interests you most about this ${roleTitle} position?`,
            'What do you expect from your team leader?',
            'How would you contribute to our team culture?',
            'What are your career goals for the next 2-3 years?',
            'Why do you think you\'re a good fit for this role?',
        ],
    };
}
