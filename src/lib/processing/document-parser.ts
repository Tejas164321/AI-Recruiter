/**
 * Document Parser - Local Text Extraction (NO AI)
 * 
 * Extracts text from PDF and DOCX files using deterministic libraries.
 * Performs normalization, language detection, and metadata extraction.
 * 
 * Libraries used:
 * - pdf-parse: PDF text extraction
 * - mammoth: DOCX text extraction
 * - franc-min: Language detection
 */

import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import { franc } from 'franc-min';

// ============================================
// Types
// ============================================

export interface ParsedDocument {
    text: string;
    normalizedText: string;
    metadata: DocumentMetadata;
    sections: DocumentSection[];
    rawContent: string;
}

export interface DocumentMetadata {
    fileName: string;
    fileType: 'pdf' | 'docx' | 'txt' | 'unknown';
    language: string;
    languageConfidence: number;
    wordCount: number;
    characterCount: number;
    pageCount?: number;
    extractionMethod: string;
}

export interface DocumentSection {
    title: string;
    content: string;
    startIndex: number;
    endIndex: number;
}

// ============================================
// Data URI Utilities
// ============================================

/**
 * Convert data URI to Buffer
 */
function dataUriToBuffer(dataUri: string): { buffer: Buffer; mimeType: string } {
    if (!dataUri.startsWith('data:')) {
        throw new Error('Invalid data URI format');
    }

    const [header, base64Data] = dataUri.split(',');
    if (!base64Data) {
        throw new Error('Invalid data URI: no base64 data found');
    }

    const mimeType = header.match(/data:([^;]+)/)?.[1] || 'application/octet-stream';
    const buffer = Buffer.from(base64Data, 'base64');

    return { buffer, mimeType };
}

/**
 * Detect file type from MIME type
 */
function detectFileType(mimeType: string): 'pdf' | 'docx' | 'txt' | 'unknown' {
    const lowerMime = mimeType.toLowerCase();

    if (lowerMime.includes('pdf')) return 'pdf';
    if (lowerMime.includes('wordprocessingml') || lowerMime.includes('msword')) return 'docx';
    if (lowerMime.includes('text/plain')) return 'txt';

    return 'unknown';
}

// ============================================
// Text Normalization
// ============================================

/**
 * Normalize text for processing
 * - Remove excessive whitespace
 * - Fix encoding issues
 * - Remove special characters that don't add value
 */
function normalizeText(text: string): string {
    return text
        // Fix common encoding issues
        .replace(/�/g, '')
        // Remove excessive newlines
        .replace(/\n{3,}/g, '\n\n')
        // Normalize whitespace
        .replace(/[ \t]+/g, ' ')
        .replace(/\r\n/g, '\n')
        // Remove null bytes
        .replace(/\0/g, '')
        .trim();
}

/**
 * Extract clean text (lowercase, minimal punctuation)
 * Used for skill extraction and matching
 */
export function extractCleanText(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^\w\s\n.-]/g, ' ') // Keep letters, numbers, spaces, newlines, periods, hyphens
        .replace(/\s+/g, ' ')
        .trim();
}

// ============================================
// Language Detection
// ============================================

/**
 * Detect document language using franc library
 * Returns ISO 639-3 language code
 */
function detectLanguage(text: string): { language: string; confidence: number } {
    // Need sufficient text for accurate detection
    const sampleText = text.substring(0, 500);

    if (sampleText.length < 50) {
        return { language: 'und', confidence: 0 }; // undefined
    }

    const detected = franc(sampleText);

    // Map common codes to more readable format
    const languageMap: Record<string, string> = {
        'eng': 'en',
        'spa': 'es',
        'fra': 'fr',
        'deu': 'de',
        'ita': 'it',
        'por': 'pt',
        'hin': 'hi',
        'ara': 'ar',
        'zho': 'zh',
        'jpn': 'ja',
    };

    const language = languageMap[detected] || detected;
    const confidence = detected !== 'und' ? 0.8 : 0; // franc doesn't provide confidence scores

    return { language, confidence };
}

// ============================================
// Section Detection
// ============================================

/**
 * Detect common resume sections using heuristics
 */
export function detectSections(text: string): DocumentSection[] {
    const sections: DocumentSection[] = [];

    // Common section headers (case-insensitive)
    const sectionPatterns = [
        { title: 'Contact', regex: /^(contact|personal\s+information)$/im },
        { title: 'Summary', regex: /^(summary|profile|objective|about\s+me)$/im },
        { title: 'Experience', regex: /^(experience|work\s+experience|employment|work\s+history|professional\s+experience)$/im },
        { title: 'Education', regex: /^(education|academic|qualifications)$/im },
        { title: 'Skills', regex: /^(skills|technical\s+skills|core\s+competencies|expertise)$/im },
        { title: 'Projects', regex: /^(projects|portfolio)$/im },
        { title: 'Certifications', regex: /^(certifications|certificates|licenses)$/im },
        { title: 'Awards', regex: /^(awards|honors|achievements)$/im },
    ];

    const lines = text.split('\n');
    let currentSection: DocumentSection | null = null;
    let sectionContent: string[] = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // Check if this line is a section header
        let isHeader = false;
        for (const pattern of sectionPatterns) {
            if (pattern.regex.test(line)) {
                // Save previous section
                if (currentSection && sectionContent.length > 0) {
                    currentSection.content = sectionContent.join('\n').trim();
                    currentSection.endIndex = text.indexOf(sectionContent[sectionContent.length - 1]) + sectionContent[sectionContent.length - 1].length;
                    sections.push(currentSection);
                }

                // Start new section
                currentSection = {
                    title: pattern.title,
                    content: '',
                    startIndex: text.indexOf(line),
                    endIndex: 0,
                };
                sectionContent = [];
                isHeader = true;
                break;
            }
        }

        // Add content to current section
        if (!isHeader && currentSection && line) {
            sectionContent.push(line);
        }
    }

    // Add last section
    if (currentSection && sectionContent.length > 0) {
        currentSection.content = sectionContent.join('\n').trim();
        currentSection.endIndex = text.length;
        sections.push(currentSection);
    }

    return sections;
}

// ============================================
// PDF Parsing
// ============================================

async function parsePDF(buffer: Buffer, fileName: string): Promise<ParsedDocument> {
    try {
        const data = await pdfParse(buffer);
        const rawText = data.text;
        const normalized = normalizeText(rawText);
        const language = detectLanguage(normalized);
        const sections = detectSections(normalized);

        return {
            text: normalized,
            normalizedText: extractCleanText(normalized),
            rawContent: rawText,
            sections,
            metadata: {
                fileName,
                fileType: 'pdf',
                language: language.language,
                languageConfidence: language.confidence,
                wordCount: normalized.split(/\s+/).length,
                characterCount: normalized.length,
                pageCount: data.numpages,
                extractionMethod: 'pdf-parse',
            },
        };
    } catch (error) {
        throw new Error(`PDF parsing failed: ${error instanceof Error ? error.message : String(error)}`);
    }
}

// ============================================
// DOCX Parsing
// ============================================

async function parseDOCX(buffer: Buffer, fileName: string): Promise<ParsedDocument> {
    try {
        const result = await mammoth.extractRawText({ buffer });
        const rawText = result.value;
        const normalized = normalizeText(rawText);
        const language = detectLanguage(normalized);
        const sections = detectSections(normalized);

        return {
            text: normalized,
            normalizedText: extractCleanText(normalized),
            rawContent: rawText,
            sections,
            metadata: {
                fileName,
                fileType: 'docx',
                language: language.language,
                languageConfidence: language.confidence,
                wordCount: normalized.split(/\s+/).length,
                characterCount: normalized.length,
                extractionMethod: 'mammoth',
            },
        };
    } catch (error) {
        throw new Error(`DOCX parsing failed: ${error instanceof Error ? error.message : String(error)}`);
    }
}

// ============================================
// Plain Text Parsing
// ============================================

function parsePlainText(buffer: Buffer, fileName: string): ParsedDocument {
    const rawText = buffer.toString('utf-8');
    const normalized = normalizeText(rawText);
    const language = detectLanguage(normalized);
    const sections = detectSections(normalized);

    return {
        text: normalized,
        normalizedText: extractCleanText(normalized),
        rawContent: rawText,
        sections,
        metadata: {
            fileName,
            fileType: 'txt',
            language: language.language,
            languageConfidence: language.confidence,
            wordCount: normalized.split(/\s+/).length,
            characterCount: normalized.length,
            extractionMethod: 'utf-8-decode',
        },
    };
}

// ============================================
// Main Parser Function
// ============================================

/**
 * Parse a document from a data URI
 * Automatically detects file type and uses appropriate parser
 */
export async function parseDocument(
    dataUri: string,
    fileName: string = 'document'
): Promise<ParsedDocument> {
    try {
        // Convert data URI to buffer
        const { buffer, mimeType } = dataUriToBuffer(dataUri);
        const fileType = detectFileType(mimeType);

        console.log(`[DocumentParser] Parsing ${fileName} (${fileType}, ${buffer.length} bytes)`);

        // Route to appropriate parser
        switch (fileType) {
            case 'pdf':
                return await parsePDF(buffer, fileName);

            case 'docx':
                return await parseDOCX(buffer, fileName);

            case 'txt':
                return parsePlainText(buffer, fileName);

            default:
                // Try PDF first, then DOCX, then plain text
                try {
                    return await parsePDF(buffer, fileName);
                } catch {
                    try {
                        return await parseDOCX(buffer, fileName);
                    } catch {
                        return parsePlainText(buffer, fileName);
                    }
                }
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[DocumentParser] Failed to parse ${fileName}:`, message);
        throw new Error(`Document parsing failed: ${message}`);
    }
}

/**
 * Batch parse multiple documents
 */
export async function parseDocuments(
    documents: Array<{ dataUri: string; fileName: string }>
): Promise<ParsedDocument[]> {
    const results = await Promise.allSettled(
        documents.map(doc => parseDocument(doc.dataUri, doc.fileName))
    );

    return results
        .filter((result): result is PromiseFulfilledResult<ParsedDocument> => result.status === 'fulfilled')
        .map(result => result.value);
}

// ============================================
// Utility Functions
// ============================================

/**
 * Extract candidate name from resume (heuristic)
 */
export function extractCandidateName(parsedDocument: ParsedDocument): string | null {
    const lines = parsedDocument.text.split('\n').map(l => l.trim()).filter(l => l);

    // Name is usually in the first 3 lines
    for (let i = 0; i < Math.min(3, lines.length); i++) {
        const line = lines[i];

        // Skip email addresses, phone numbers, URLs
        if (line.includes('@') || line.includes('http') || /\d{10}/.test(line)) {
            continue;
        }

        // Check if it looks like a name (2-4 words, each capitalized)
        const words = line.split(/\s+/);
        if (words.length >= 2 && words.length <= 4) {
            if (words.every(w => /^[A-Z][a-z]+/.test(w))) {
                return line;
            }
        }
    }

    return null;
}

/**
 * Extract email address from resume
 */
export function extractEmail(parsedDocument: ParsedDocument): string | null {
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
    const match = parsedDocument.text.match(emailRegex);
    return match ? match[0] : null;
}

/**
 * Extract phone number from resume
 */
export function extractPhoneNumber(parsedDocument: ParsedDocument): string | null {
    const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;
    const match = parsedDocument.text.match(phoneRegex);
    return match ? match[0] : null;
}
