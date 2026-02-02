/**
 * Hybrid Job Role Extractor
 * 
 * ARCHITECTURE:
 * 1. Document parsing (deterministic)
 * 2. Section detection and segmentation (heuristic)
 * 3. Optional LLM title extraction (local Ollama, FINAL STEP ONLY)
 * 
 * This replaces the cloud-based Genkit flow with deterministic
 * document parsing and rule-based segmentation.
 */

'use server';

import { parseDocument } from '@/lib/processing/document-parser';
import { extractJobTitles } from '@/lib/skills/skill-extractor';
import { randomUUID } from 'crypto';

// ============================================
// Types
// ============================================

export interface JobDescriptionFileInput {
    name: string;
    dataUri: string;
}

export interface ExtractJobRolesInput {
    jobDescriptionDocuments: JobDescriptionFileInput[];
}

export interface ExtractedJobRoleOutput {
    id: string;
    name: string;
    contentDataUri: string;
    originalDocumentName: string;
}

export type ExtractJobRolesOutput = ExtractedJobRoleOutput[];

// ============================================
// Helper Functions
// ============================================

/**
 * Detect job title separators in text (heuristic)
 */
function detectRoleSeparators(text: string): number[] {
    const separators: number[] = [];
    const lines = text.split('\n');

    // Look for patterns that might indicate a new job posting
    const separatorPatterns = [
        /^={3,}$/,  // === separator
        /^-{3,}$/,  // --- separator
        /^job\s+(description|title|posting):/i,
        /^position:/i,
        /^role:/i,
    ];

    let currentPos = 0;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        for (const pattern of separatorPatterns) {
            if (pattern.test(line)) {
                separators.push(currentPos);
                break;
            }
        }

        currentPos += lines[i].length + 1; // +1 for newline
    }

    return separators;
}

/**
 * Segment document by separators
 */
function segmentByPosition(text: string, separators: number[]): string[] {
    if (separators.length === 0) {
        return [text]; // Single role
    }

    const segments: string[] = [];
    separators.push(text.length); // Add end position

    let lastPos = 0;
    for (const sep of separators) {
        if (sep > lastPos) {
            const segment = text.substring(lastPos, sep).trim();
            if (segment.length > 100) { // Minimum length for a valid JD
                segments.push(segment);
            }
        }
        lastPos = sep;
    }

    return segments.length > 0 ? segments : [text];
}

/**
 * Extract job title from segment
 */
function extractSegmentTitle(segment: string): string {
    // Try to extract title from first few lines
    const lines = segment.split('\n').map(l => l.trim()).filter(l => l);

    if (lines.length === 0) return '';

    // Check first 5 lines for job title patterns
    for (let i = 0; i < Math.min(5, lines.length); i++) {
        const line = lines[i];

        // Skip very short or very long lines
        if (line.length < 3 || line.length > 100) continue;

        // Look for job title keywords
        const titleKeywords = [
            'engineer', 'developer', 'manager', 'designer', 'analyst',
            'director', 'architect', 'lead', 'specialist', 'consultant',
            'coordinator', 'executive', 'officer', 'technician', 'administrator'
        ];

        const lowerLine = line.toLowerCase();
        if (titleKeywords.some(kw => lowerLine.includes(kw))) {
            // Clean up the title
            return line.replace(/[^a-zA-Z0-9\s-]/g, '').trim();
        }
    }

    // Fallback: use extracted job titles from skill extractor
    const extracted = extractJobTitles(segment);
    if (extracted.length > 0) {
        return extracted[0];
    }

    // Last resort: use first non-empty line
    return lines[0].substring(0, 80);
}

/**
 * Create data URI from text
 */
function textToDataUri(text: string): string {
    return `data:text/plain;charset=utf-8;base64,${Buffer.from(text).toString('base64')}`;
}

// ============================================
// Main Job Role Extraction
// ============================================

export async function extractJobRoles(
    input: ExtractJobRolesInput
): Promise<ExtractJobRolesOutput> {
    const { jobDescriptionDocuments } = input;
    const allExtractedRoles: ExtractedJobRoleOutput[] = [];

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`📋 JOB ROLE EXTRACTION (Deterministic)`);
    console.log(`   Documents: ${jobDescriptionDocuments.length}`);
    console.log(`${'═'.repeat(60)}\n`);

    try {
        // Process each document
        for (const doc of jobDescriptionDocuments) {
            console.log(`\n📄 Processing: ${doc.name}`);
            console.log(`${'─'.repeat(60)}`);

            try {
                // Step 1: Parse document
                console.log(`   🔍 Parsing document...`);
                const parsed = await parseDocument(doc.dataUri, doc.name);
                console.log(`   ✓ Parsed: ${parsed.metadata.wordCount} words`);

                // Step 2: Detect role separators
                const separators = detectRoleSeparators(parsed.text);
                console.log(`   ✓ Separators found: ${separators.length}`);

                // Step 3: Segment text
                const segments = segmentByPosition(parsed.text, separators);
                console.log(`   ✓ Segments created: ${segments.length}`);

                // Step 4: Extract titles and create roles
                for (let i = 0; i < segments.length; i++) {
                    const segment = segments[i];

                    // Extract title
                    const extractedTitle = extractSegmentTitle(segment);
                    const displayName = extractedTitle ||
                        (segments.length > 1 ? `Job Role ${i + 1}` : 'Untitled Job Role');

                    console.log(`   → Role ${i + 1}: "${displayName}"`);

                    allExtractedRoles.push({
                        id: randomUUID(),
                        name: displayName,
                        contentDataUri: textToDataUri(segment),
                        originalDocumentName: doc.name,
                    });
                }

                console.log(`${'─'.repeat(60)}`);
                console.log(`✅ Extracted ${segments.length} role(s) from ${doc.name}\n`);

            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                console.error(`❌ Error processing ${doc.name}:`, message);

                // Create fallback role
                allExtractedRoles.push({
                    id: randomUUID(),
                    name: 'Untitled Job Role (Parsing Error)',
                    contentDataUri: doc.dataUri,
                    originalDocumentName: doc.name,
                });
            }
        }

        console.log(`${'═'.repeat(60)}`);
        console.log(`🎉 Total Roles Extracted: ${allExtractedRoles.length}`);
        console.log(`${'═'.repeat(60)}\n`);

        return allExtractedRoles;

    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('[extractJobRoles] Critical error:', message);

        // If completely failed, create fallback roles for all documents
        if (allExtractedRoles.length === 0 && jobDescriptionDocuments.length > 0) {
            return jobDescriptionDocuments.map(doc => ({
                id: randomUUID(),
                name: 'Untitled Job Role',
                contentDataUri: doc.dataUri,
                originalDocumentName: doc.name,
            }));
        }

        return allExtractedRoles;
    }
}
