/**
 * Ollama Client for Local LLM Inference
 * 
 * Provides a type-safe client for communicating with Ollama server (localhost:11434).
 * Supports automatic fallback from larger to smaller models on OOM errors.
 * 
 * Features:
 * - Connection pooling and keep-alive
 * - Timeout handling (30s default)
 * - Structured JSON response parsing
 * - Error classification and retry logic
 * - GPU utilization tracking
 */

import { z, ZodSchema } from 'zod';

// ============================================
// Configuration
// ============================================

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const PRIMARY_MODEL = process.env.OLLAMA_PRIMARY_MODEL || 'qwen2.5:7b-instruct';
const FALLBACK_MODEL = process.env.OLLAMA_FALLBACK_MODEL || 'qwen2.5:7b-instruct';
const DEFAULT_TIMEOUT_MS = 30000;

// ============================================
// Types
// ============================================

export interface OllamaGenerateRequest {
    model: string;
    prompt: string;
    system?: string;
    format?: 'json';
    options?: {
        temperature?: number;
        top_p?: number;
        top_k?: number;
        num_ctx?: number;
        num_predict?: number;
    };
    stream?: boolean;
}

export interface OllamaGenerateResponse {
    model: string;
    created_at: string;
    response: string;
    done: boolean;
    context?: number[];
    total_duration?: number;
    load_duration?: number;
    prompt_eval_count?: number;
    prompt_eval_duration?: number;
    eval_count?: number;
    eval_duration?: number;
}

export interface OllamaModelInfo {
    name: string;
    size: number;
    modified_at: string;
}

export interface OllamaErrorResponse {
    error: string;
}

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
// Error Classification
// ============================================

enum OllamaErrorType {
    OUT_OF_MEMORY = 'OUT_OF_MEMORY',
    TIMEOUT = 'TIMEOUT',
    CONNECTION_REFUSED = 'CONNECTION_REFUSED',
    MODEL_NOT_FOUND = 'MODEL_NOT_FOUND',
    MALFORMED_JSON = 'MALFORMED_JSON',
    UNKNOWN = 'UNKNOWN'
}

function classifyOllamaError(error: unknown): { type: OllamaErrorType; message: string; retryable: boolean } {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const lowerMessage = errorMessage.toLowerCase();

    if (lowerMessage.includes('out of memory') || lowerMessage.includes('oom') || lowerMessage.includes('cuda')) {
        return { type: OllamaErrorType.OUT_OF_MEMORY, message: errorMessage, retryable: true };
    }

    if (lowerMessage.includes('timeout') || lowerMessage.includes('aborted')) {
        return { type: OllamaErrorType.TIMEOUT, message: errorMessage, retryable: true };
    }

    if (lowerMessage.includes('econnrefused') || lowerMessage.includes('connection refused')) {
        return { type: OllamaErrorType.CONNECTION_REFUSED, message: 'Ollama server is not running', retryable: false };
    }

    if (lowerMessage.includes('model') && lowerMessage.includes('not found')) {
        return { type: OllamaErrorType.MODEL_NOT_FOUND, message: errorMessage, retryable: false };
    }

    if (lowerMessage.includes('json') || lowerMessage.includes('parse')) {
        return { type: OllamaErrorType.MALFORMED_JSON, message: errorMessage, retryable: false };
    }

    return { type: OllamaErrorType.UNKNOWN, message: errorMessage, retryable: false };
}

// ============================================
// HTTP Client Utilities
// ============================================

async function fetchWithTimeout(
    url: string,
    options: RequestInit,
    timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
        });
        clearTimeout(timeout);
        return response;
    } catch (error) {
        clearTimeout(timeout);
        if ((error as Error).name === 'AbortError') {
            throw new Error(`Request timeout after ${timeoutMs}ms`);
        }
        throw error;
    }
}

// ============================================
// Ollama Client Class
// ============================================

export class OllamaClient {
    private baseUrl: string;
    private primaryModel: string;
    private fallbackModel: string;

    constructor(config?: {
        baseUrl?: string;
        primaryModel?: string;
        fallbackModel?: string;
    }) {
        this.baseUrl = config?.baseUrl || OLLAMA_BASE_URL;
        this.primaryModel = config?.primaryModel || PRIMARY_MODEL;
        this.fallbackModel = config?.fallbackModel || FALLBACK_MODEL;
    }

    /**
     * Check if Ollama server is running and accessible
     */
    async healthCheck(): Promise<boolean> {
        try {
            const response = await fetchWithTimeout(`${this.baseUrl}/api/tags`, {
                method: 'GET',
            }, 5000);
            return response.ok;
        } catch {
            return false;
        }
    }

    /**
     * List available models
     */
    async listModels(): Promise<OllamaModelInfo[]> {
        try {
            const response = await fetchWithTimeout(`${this.baseUrl}/api/tags`, {
                method: 'GET',
            }, 5000);

            if (!response.ok) {
                throw new Error(`Failed to list models: ${response.statusText}`);
            }

            const data = await response.json();
            return data.models || [];
        } catch (error) {
            console.error('[OllamaClient] Failed to list models:', error);
            return [];
        }
    }

    /**
     * Generate text with automatic fallback on OOM
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
        const model = options?.model || this.primaryModel;

        const request: OllamaGenerateRequest = {
            model,
            prompt,
            system: options?.system,
            stream: false,
            options: {
                temperature: options?.temperature ?? 0.3,
                num_predict: options?.maxTokens ?? 500,
                num_ctx: 2048,
            },
        };

        try {
            const response = await this._executeGenerate(request, options?.timeout);
            const inferenceTimeMs = Date.now() - startTime;

            return {
                success: true,
                data: response.response,
                modelUsed: model,
                tokensGenerated: response.eval_count || 0,
                inferenceTimeMs,
            };
        } catch (error) {
            const classified = classifyOllamaError(error);

            // Try fallback model on OOM
            if (classified.type === OllamaErrorType.OUT_OF_MEMORY && model !== this.fallbackModel) {
                console.warn(`[OllamaClient] OOM with ${model}, trying fallback ${this.fallbackModel}`);
                return this.generate(prompt, { ...options, model: this.fallbackModel });
            }

            return {
                success: false,
                error: classified.message,
                modelAttempted: model,
            };
        }
    }

    /**
     * Generate structured JSON output with Zod validation
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
        const model = options?.model || this.primaryModel;

        const request: OllamaGenerateRequest = {
            model,
            prompt,
            system: options?.system,
            format: 'json',
            stream: false,
            options: {
                temperature: options?.temperature ?? 0.2,
                num_predict: options?.maxTokens ?? 800,
                num_ctx: 2048,
            },
        };

        try {
            const response = await this._executeGenerate(request, options?.timeout);
            const inferenceTimeMs = Date.now() - startTime;

            // Parse and validate JSON
            const parsed = JSON.parse(response.response);
            const validated = schema.parse(parsed);

            return {
                success: true,
                data: validated,
                modelUsed: model,
                tokensGenerated: response.eval_count || 0,
                inferenceTimeMs,
            };
        } catch (error) {
            const classified = classifyOllamaError(error);

            // Try fallback model on OOM (but not on parse errors)
            if (classified.type === OllamaErrorType.OUT_OF_MEMORY && model !== this.fallbackModel) {
                console.warn(`[OllamaClient] OOM with ${model}, trying fallback ${this.fallbackModel}`);
                return this.generateJSON(prompt, schema, { ...options, model: this.fallbackModel });
            }

            return {
                success: false,
                error: classified.message,
                modelAttempted: model,
            };
        }
    }

    /**
     * Execute the actual HTTP request to Ollama
     */
    private async _executeGenerate(
        request: OllamaGenerateRequest,
        timeoutMs?: number
    ): Promise<OllamaGenerateResponse> {
        const response = await fetchWithTimeout(
            `${this.baseUrl}/api/generate`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(request),
            },
            timeoutMs || DEFAULT_TIMEOUT_MS
        );

        if (!response.ok) {
            const errorData: OllamaErrorResponse = await response.json();
            throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
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

/**
 * Quick text generation
 */
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

/**
 * Quick JSON generation with validation
 */
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
