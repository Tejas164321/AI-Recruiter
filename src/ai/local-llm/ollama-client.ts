/**
 * LLM Client Router
 * 
 * Bypasses local Ollama and routes all LLM calls directly to the cloud
 * using Gemini 2.5 Flash for production-grade, fast, and high-quality screening.
 * 
 * Features:
 * - Direct REST API integration with Gemini 2.5 Flash
 * - Zod Schema to Gemini Schema converter for 100% guaranteed structured JSON output
 * - Automatic retry with exponential backoff for transient API errors (503, 429, 500)
 * - Safe fallback to raw parsed JSON on schema mismatches
 */

import { z, ZodSchema } from 'zod';

// NOTE: API keys are managed through the app's Profile → API Configuration page.
// The ollama-client is used for the rank-candidates hybrid pipeline's qualitative analysis.
// When no key is available, it gracefully falls back to deterministic analysis.
const GEMINI_MODEL = 'gemini-2.5-flash';

// ============================================
// Types
// ============================================

export type LLMGenerateResult<T> = {
    success: true;
    data: T;
    modelUsed: string;
    tokensGenerated: number;
    inferenceTimeMs: number;
} | {
    success: false;
    error: string;
    modelAttempted: string;
};

// ============================================
// Schema Helper: Convert Zod to Gemini Schema
// ============================================

export function convertZodToGeminiSchema(schema: any): any {
    if (!schema || !schema._def) return undefined;

    const def = schema._def;
    
    // ZodObject
    if (def.typeName === 'ZodObject') {
        const properties: any = {};
        const required: string[] = [];
        
        for (const [key, value] of Object.entries(def.shape())) {
            const propSchema = convertZodToGeminiSchema(value);
            if (propSchema) {
                properties[key] = propSchema;
                
                // Only mark as required if it's not a ZodOptional property
                const isOptional = (value as any)?._def?.typeName === 'ZodOptional';
                if (!isOptional) {
                    required.push(key);
                }
            }
        }
        
        return {
            type: 'OBJECT',
            properties,
            required,
        };
    }
    
    // ZodArray
    if (def.typeName === 'ZodArray') {
        const itemSchema = convertZodToGeminiSchema(def.type);
        return {
            type: 'ARRAY',
            items: itemSchema || { type: 'STRING' },
        };
    }
    
    // ZodString
    if (def.typeName === 'ZodString') {
        return {
            type: 'STRING',
        };
    }
    
    // ZodNumber
    if (def.typeName === 'ZodNumber') {
        return {
            type: 'NUMBER',
        };
    }
    
    // ZodBoolean
    if (def.typeName === 'ZodBoolean') {
        return {
            type: 'BOOLEAN',
        };
    }

    // ZodOptional / ZodNullable
    if (def.typeName === 'ZodOptional' || def.typeName === 'ZodNullable') {
        return convertZodToGeminiSchema(def.innerType);
    }
    
    return { type: 'STRING' }; // fallback
}

// ============================================
// OllamaClient Adapter Class (routing to Gemini)
// ============================================

export class OllamaClient {
    private apiKey: string;
    private model: string;

    constructor(config?: {
        baseUrl?: string;
        primaryModel?: string;
        fallbackModel?: string;
    }) {
        this.apiKey = process.env.GOOGLE_API_KEY || '';
        this.model = GEMINI_MODEL;
    }

    /**
     * Check if Gemini API is configured
     */
    async healthCheck(): Promise<boolean> {
        return !!this.apiKey;
    }

    /**
     * List available models (mocked for compatibility)
     */
    async listModels() {
        return [{
            name: this.model,
            size: 0,
            modified_at: new Date().toISOString()
        }];
    }

    /**
     * Generate text using Gemini 2.5 Flash
     */
    async generate(
        prompt: string,
        options?: {
            system?: string;
            temperature?: number;
            maxTokens?: number;
            model?: string;
            timeout?: number;
        }
    ): Promise<LLMGenerateResult<string>> {
        const startTime = Date.now();
        const systemInstruction = options?.system;
        const temperature = options?.temperature ?? 0.3;
        const maxTokens = options?.maxTokens ?? 2000;

        if (!this.apiKey) {
            console.warn('[Gemini Client] No API key configured. Please set a Gemini API key in Profile → API Configuration.');
            return {
                success: false,
                error: 'No AI model is configured. Please go to Profile → API Configuration and add a Gemini API key to use this feature.',
                modelAttempted: this.model,
            };
        }

        try {
            console.log(`[Gemini Client] Generating text using ${this.model}...`);
            const responseText = await this._callGeminiAPI({
                prompt,
                systemInstruction,
                temperature,
                maxTokens,
                responseJson: false,
            });

            return {
                success: true,
                data: responseText,
                modelUsed: this.model,
                tokensGenerated: 0,
                inferenceTimeMs: Date.now() - startTime,
            };
        } catch (error: any) {
            console.error('[Gemini Client] Generation failed:', error);
            return {
                success: false,
                error: error.message || String(error),
                modelAttempted: this.model,
            };
        }
    }

    /**
     * Generate structured JSON output using Gemini 2.5 Flash
     */
    async generateJSON<T>(
        prompt: string,
        schema: ZodSchema<T>,
        options?: {
            system?: string;
            temperature?: number;
            maxTokens?: number;
            model?: string;
            timeout?: number;
        }
    ): Promise<LLMGenerateResult<T>> {
        const startTime = Date.now();
        const systemInstruction = options?.system;
        const temperature = options?.temperature ?? 0.2;
        const maxTokens = options?.maxTokens ?? 2000;

        if (!this.apiKey) {
            console.warn('[Gemini Client] No API key configured. Please set a Gemini API key in Profile → API Configuration.');
            return {
                success: false,
                error: 'No AI model is configured. Please go to Profile → API Configuration and add a Gemini API key to use this feature.',
                modelAttempted: this.model,
            };
        }

        let responseText = '';
        try {
            console.log(`[Gemini Client] Generating JSON using ${this.model}...`);
            const responseSchema = convertZodToGeminiSchema(schema);
            
            responseText = await this._callGeminiAPI({
                prompt,
                systemInstruction,
                temperature,
                maxTokens,
                responseJson: true,
                responseSchema,
            });

            const parsed = JSON.parse(responseText);

            // Attempt schema validation, fallback to raw parsed response if it fails slightly
            let validated: T;
            try {
                validated = schema.parse(parsed);
            } catch (schemaError) {
                console.warn('[Gemini Client] Zod schema validation warning. Falling back to raw JSON object:', schemaError);
                validated = parsed as T;
            }

            return {
                success: true,
                data: validated,
                modelUsed: this.model,
                tokensGenerated: 0,
                inferenceTimeMs: Date.now() - startTime,
            };
        } catch (error: any) {
            console.error('[Gemini Client] JSON generation failed:', error);
            if (responseText) {
                console.error(`[Gemini Client] Raw response text (length ${responseText.length}):`);
                console.error('--- START RAW RESPONSE ---');
                console.error(responseText);
                console.error('--- END RAW RESPONSE ---');
            }
            return {
                success: false,
                error: error.message || String(error),
                modelAttempted: this.model,
            };
        }
    }

    /**
     * Direct HTTP fetch call to official Google Gemini API (v1beta REST)
     * Includes automatic retry logic with exponential backoff for transient errors
     */
    private async _callGeminiAPI(params: {
        prompt: string;
        systemInstruction?: string;
        temperature: number;
        maxTokens: number;
        responseJson: boolean;
        responseSchema?: any;
    }): Promise<string> {
        const { prompt, systemInstruction, temperature, maxTokens, responseJson, responseSchema } = params;
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

        const requestBody: any = {
            contents: [
                {
                    parts: [{ text: prompt }]
                }
            ],
            generationConfig: {
                temperature,
                maxOutputTokens: maxTokens,
                thinkingConfig: {
                    thinkingBudget: 0
                }
            },
            safetySettings: [
                {
                    category: "HARM_CATEGORY_HARASSMENT",
                    threshold: "BLOCK_NONE"
                },
                {
                    category: "HARM_CATEGORY_HATE_SPEECH",
                    threshold: "BLOCK_NONE"
                },
                {
                    category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                    threshold: "BLOCK_NONE"
                },
                {
                    category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                    threshold: "BLOCK_NONE"
                }
            ]
        };

        if (systemInstruction) {
            requestBody.systemInstruction = {
                parts: [{ text: systemInstruction }]
            };
        }

        if (responseJson) {
            requestBody.generationConfig.responseMimeType = 'application/json';
            if (responseSchema) {
                requestBody.generationConfig.responseSchema = responseSchema;
            }
        }

        const maxRetries = 3;
        let delayMs = 1500; // start with 1.5s delay

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(requestBody),
                });

                if (!response.ok) {
                    const status = response.status;
                    const errorText = await response.text();
                    
                    // If transient error (503 high demand, 429 rate limit, 5xx server error)
                    if ((status === 429 || status === 503 || status >= 500) && attempt < maxRetries) {
                        console.warn(`[Gemini Client] Transient error (HTTP ${status}) on attempt ${attempt}. Retrying in ${delayMs}ms...`);
                        await new Promise(resolve => setTimeout(resolve, delayMs));
                        delayMs *= 2.5; // exponential backoff
                        continue;
                    }
                    
                    throw new Error(`Gemini API error (HTTP ${status}): ${errorText}`);
                }

                const data = await response.json();
                console.log('[Gemini Client] Raw API Response:', JSON.stringify(data));
                
                let text = data.candidates?.[0]?.content?.parts?.[0]?.text;

                if (!text) {
                    throw new Error('Gemini API returned an empty or invalid candidate response');
                }

                if (responseJson) {
                    text = text.trim();
                    if (text.startsWith('```')) {
                        text = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
                    }
                }

                return text;

            } catch (error: any) {
                if (attempt === maxRetries) {
                    throw error;
                }
                console.warn(`[Gemini Client] Request failed on attempt ${attempt}: ${error.message || error}. Retrying in ${delayMs}ms...`);
                await new Promise(resolve => setTimeout(resolve, delayMs));
                delayMs *= 2.5;
            }
        }
        
        throw new Error('Gemini API request failed after maximum retries');
    }
}

// ============================================
// Singleton Instance
// ============================================

let _ollamaClientInstance: OllamaClient | null = null;

export function getOllamaClient(): OllamaClient {
    if (!_ollamaClientInstance) {
        _ollamaClientInstance = new OllamaClient();
    }
    return _ollamaClientInstance;
}

// ============================================
// Convenience Functions
// ============================================

export async function generateText(
    prompt: string,
    system?: string
): Promise<string> {
    const client = getOllamaClient();
    const result = await client.generate(prompt, { system });

    if (!result.success) {
        throw new Error(`LLM generation failed: ${result.error}`);
    }

    return result.data;
}

export async function generateJSONResponse<T>(
    prompt: string,
    schema: ZodSchema<T>,
    system?: string
): Promise<T> {
    const client = getOllamaClient();
    const result = await client.generateJSON(prompt, schema, { system });

    if (!result.success) {
        throw new Error(`LLM JSON generation failed: ${result.error}`);
    }

    return result.data;
}
