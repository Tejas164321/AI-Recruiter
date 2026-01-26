// src/lib/data-uri-validator.ts

/**
 * Validates and provides diagnostic information for data URIs used in AI processing
 */

export interface DataURIValidationResult {
    isValid: boolean;
    mimeType: string | null;
    encoding: string | null;
    dataLength: number;
    error: string | null;
    warnings: string[];
}

/**
 * Validates a data URI and returns detailed diagnostic information
 * @param dataUri - The data URI string to validate
 * @param allowedMimeTypes - Optional array of allowed MIME types
 * @returns Validation result with details
 */
export function validateDataURI(
    dataUri: string,
    allowedMimeTypes?: string[]
): DataURIValidationResult {
    const warnings: string[] = [];

    // Check if string is empty
    if (!dataUri || dataUri.trim() === '') {
        return {
            isValid: false,
            mimeType: null,
            encoding: null,
            dataLength: 0,
            error: 'Data URI is empty or undefined',
            warnings: [],
        };
    }

    // Check basic data URI format
    if (!dataUri.startsWith('data:')) {
        return {
            isValid: false,
            mimeType: null,
            encoding: null,
            dataLength: dataUri.length,
            error: 'Data URI does not start with "data:" prefix',
            warnings: [],
        };
    }

    // Parse the data URI
    const match = dataUri.match(/^data:([^;,]+)(?:;([^,]+))?,(.*)$/);

    if (!match) {
        return {
            isValid: false,
            mimeType: null,
            encoding: null,
            dataLength: dataUri.length,
            error: 'Invalid data URI format. Expected: data:<mimetype>;encoding,<data>',
            warnings: [],
        };
    }

    const [, mimeType, encoding, data] = match;

    // Validate encoding (should be base64 for AI processing)
    if (encoding && encoding !== 'base64') {
        warnings.push(`Encoding is "${encoding}" but "base64" is recommended for AI processing`);
    }

    if (!encoding) {
        warnings.push('No encoding specified in data URI. Base64 encoding is recommended.');
    }

    // Check if data portion exists
    if (!data || data.length === 0) {
        return {
            isValid: false,
            mimeType,
            encoding: encoding || null,
            dataLength: 0,
            error: 'Data URI has no data content',
            warnings,
        };
    }

    // Validate MIME type if allowed types are specified
    if (allowedMimeTypes && allowedMimeTypes.length > 0) {
        const normalizedMime = mimeType.toLowerCase();
        const isAllowed = allowedMimeTypes.some(allowed =>
            normalizedMime.includes(allowed.toLowerCase())
        );

        if (!isAllowed) {
            return {
                isValid: false,
                mimeType,
                encoding: encoding || null,
                dataLength: data.length,
                error: `MIME type "${mimeType}" is not allowed. Allowed types: ${allowedMimeTypes.join(', ')}`,
                warnings,
            };
        }
    }

    // Check data size (warn if > 4MB as base64)
    const estimatedBytes = (data.length * 3) / 4; // Rough base64 size estimate
    if (estimatedBytes > 4 * 1024 * 1024) {
        warnings.push(`Large data URI detected (~${Math.round(estimatedBytes / 1024 / 1024)}MB). This may cause performance issues.`);
    }

    // Validate base64 encoding if specified
    if (encoding === 'base64') {
        const base64Pattern = /^[A-Za-z0-9+/]*={0,2}$/;
        if (!base64Pattern.test(data)) {
            return {
                isValid: false,
                mimeType,
                encoding,
                dataLength: data.length,
                error: 'Invalid base64 encoding detected',
                warnings,
            };
        }
    }

    return {
        isValid: true,
        mimeType,
        encoding: encoding || null,
        dataLength: data.length,
        error: null,
        warnings,
    };
}

/**
 * Logs validation results to console in a formatted way
 * @param validation - The validation result to log
 * @param context - Optional context string (e.g., "Resume Upload", "Job Description")
 */
export function logValidationResult(
    validation: DataURIValidationResult,
    context?: string
): void {
    const prefix = context ? `[${context}]` : '[Data URI Validation]';

    if (validation.isValid) {
        console.log(`✅ ${prefix} Valid data URI`);
        console.log(`   MIME Type: ${validation.mimeType}`);
        console.log(`   Encoding: ${validation.encoding || 'not specified'}`);
        console.log(`   Size: ~${Math.round((validation.dataLength * 3) / 4 / 1024)}KB`);

        if (validation.warnings.length > 0) {
            console.warn(`⚠️  ${prefix} Warnings:`);
            validation.warnings.forEach(warning => console.warn(`   - ${warning}`));
        }
    } else {
        console.error(`❌ ${prefix} Invalid data URI`);
        console.error(`   Error: ${validation.error}`);
        if (validation.mimeType) console.error(`   MIME Type: ${validation.mimeType}`);
        if (validation.encoding) console.error(`   Encoding: ${validation.encoding}`);
    }
}

/**
 * Common MIME types for document processing
 */
export const ALLOWED_DOCUMENT_MIME_TYPES = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/msword', // .doc
    'text/plain',
    'text/html',
];
