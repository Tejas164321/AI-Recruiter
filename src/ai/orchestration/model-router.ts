// src/ai/orchestration/model-router.ts
import { type ApiConfig, DEFAULT_API_CONFIG } from '@/services/user-config';
import type { ZodSchema } from 'zod';

/**
 * Executes a REST call to the chosen provider's JSON API.
 */
async function executeProviderRequest(
    provider: string,
    model: string,
    key: string | undefined,
    prompt: string,
    systemPrompt: string | undefined,
    temperature: number,
    maxTokens: number,
    endpoint?: string
): Promise<string> {
    const timeoutMs = 60000; // 60s timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
        let url = '';
        let headers: Record<string, string> = { 'Content-Type': 'application/json' };
        let body: any = {};

        switch (provider) {
            case 'gemini':
                if (!key) throw new Error("Google API key missing");
                url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
                body = {
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature,
                        maxOutputTokens: maxTokens,
                        responseMimeType: "application/json"
                    }
                };
                if (systemPrompt) {
                    body.systemInstruction = { parts: [{ text: systemPrompt }] };
                }
                break;

            case 'gpt':
                if (!key) throw new Error("OpenAI API key missing");
                url = 'https://api.openai.com/v1/chat/completions';
                headers['Authorization'] = `Bearer ${key}`;
                body = {
                    model: model || 'gpt-4o-mini',
                    messages: [
                        ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
                        { role: 'user', content: prompt }
                    ],
                    response_format: { type: 'json_object' },
                    temperature,
                    max_tokens: maxTokens
                };
                break;

            case 'claude':
                if (!key) throw new Error("Anthropic API key missing");
                url = 'https://api.anthropic.com/v1/messages';
                headers['x-api-key'] = key;
                headers['anthropic-version'] = '2023-06-01';
                body = {
                    model: model || 'claude-3-5-haiku-20241022',
                    max_tokens: maxTokens,
                    messages: [
                        { role: 'user', content: (systemPrompt ? `${systemPrompt}\n\n` : '') + prompt + "\n\nReturn your output ONLY as a valid JSON object." }
                    ],
                    temperature
                };
                break;

            case 'grok':
                if (!key) throw new Error("xAI Grok API key missing");
                url = 'https://api.x.ai/v1/chat/completions';
                headers['Authorization'] = `Bearer ${key}`;
                body = {
                    model: model || 'grok-beta',
                    messages: [
                        ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
                        { role: 'user', content: prompt }
                    ],
                    response_format: { type: 'json_object' },
                    temperature,
                    max_tokens: maxTokens
                };
                break;

            case 'local':
                const localBaseUrl = (endpoint || 'http://localhost:11434').replace(/\/$/, '');
                url = `${localBaseUrl}/api/chat`;
                body = {
                    model: model || 'qwen2.5',
                    messages: [
                        ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
                        { role: 'user', content: prompt }
                    ],
                    stream: false,
                    options: {
                        temperature
                    }
                };
                break;

            default:
                throw new Error(`Unsupported model provider: ${provider}`);
        }

        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP Error ${response.status}: ${errorText.substring(0, 300)}`);
        }

        const responseData = await response.json();
        let textResult = '';

        // Extract raw JSON string from responses
        switch (provider) {
            case 'gemini':
                textResult = responseData.candidates?.[0]?.content?.parts?.[0]?.text || '';
                break;
            case 'gpt':
            case 'grok':
                textResult = responseData.choices?.[0]?.message?.content || '';
                break;
            case 'claude':
                textResult = responseData.content?.[0]?.text || '';
                break;
            case 'local':
                textResult = responseData.message?.content || '';
                break;
        }

        if (!textResult.trim()) {
            throw new Error("Received empty response from LLM provider");
        }

        return textResult;
    } catch (err: any) {
        clearTimeout(timeoutId);
        throw err;
    }
}

/**
 * Orchestrates multi-LLM generation calls with schema validation and automatic failover
 */
export async function generateFeedbackOrchestrated<T>(
    prompt: string,
    schema: ZodSchema<T>,
    options: {
        system?: string;
        temperature?: number;
        maxTokens?: number;
    },
    apiConfig?: ApiConfig
): Promise<T> {
    const config = apiConfig || DEFAULT_API_CONFIG;
    
    // Failover cascade list
    const modelsToTry: Array<{ provider: string; model: string; key: string | undefined; endpoint?: string }> = [];

    const getProviderKey = (provider: string): string | undefined => {
        switch (provider) {
            case 'gemini': return config.keys.gemini || process.env.GOOGLE_API_KEY;
            case 'gpt': return config.keys.gpt;
            case 'claude': return config.keys.claude;
            case 'grok': return config.keys.grok;
            default: return undefined;
        }
    };

    const getProviderModel = (provider: string): string => {
        switch (provider) {
            case 'gemini': return 'gemini-2.5-flash';
            case 'gpt': return 'gpt-4o-mini';
            case 'claude': return 'claude-3-5-haiku-20241022';
            case 'grok': return 'grok-beta';
            case 'local': return config.localModel || 'qwen2.5';
            default: return '';
        }
    };

    if (config.mode === 'manual') {
        const provider = config.activeModel;
        modelsToTry.push({
            provider,
            model: getProviderModel(provider),
            key: getProviderKey(provider),
            endpoint: provider === 'local' ? config.localUrl : undefined
        });
    } else {
        const isEnabled = (provider: string): boolean => {
            if (config.enabledModels) {
                return !!config.enabledModels[provider as keyof typeof config.enabledModels];
            }
            if (provider === 'local') return config.enableLocal;
            return !!getProviderKey(provider);
        };

        // Auto Fallback Mode Cascade
        // Try Gemini (Cloud Default)
        if (isEnabled('gemini') && (config.keys.gemini || process.env.GOOGLE_API_KEY)) {
            modelsToTry.push({ provider: 'gemini', model: 'gemini-2.5-flash', key: config.keys.gemini || process.env.GOOGLE_API_KEY });
        }
        // Try OpenAI GPT
        if (isEnabled('gpt') && config.keys.gpt) {
            modelsToTry.push({ provider: 'gpt', model: 'gpt-4o-mini', key: config.keys.gpt });
        }
        // Try Anthropic Claude
        if (isEnabled('claude') && config.keys.claude) {
            modelsToTry.push({ provider: 'claude', model: 'claude-3-5-haiku-20241022', key: config.keys.claude });
        }
        // Try xAI Grok
        if (isEnabled('grok') && config.keys.grok) {
            modelsToTry.push({ provider: 'grok', model: 'grok-beta', key: config.keys.grok });
        }
        // Try Local LLM (Ollama)
        if (isEnabled('local')) {
            modelsToTry.push({ provider: 'local', model: config.localModel || 'qwen2.5', key: '', endpoint: config.localUrl });
        }
    }

    // Ultimate fallback if nothing configured
    if (modelsToTry.length === 0) {
        if (process.env.GOOGLE_API_KEY) {
            modelsToTry.push({ provider: 'gemini', model: 'gemini-2.5-flash', key: process.env.GOOGLE_API_KEY });
        } else {
            throw new Error("Orchestrator Failure: No API credentials or local LLM configured.");
        }
    }

    let lastError: Error | null = null;

    for (const attempt of modelsToTry) {
        console.log(`🤖 [Orchestrator] Attempting generation with provider: ${attempt.provider.toUpperCase()} (${attempt.model})...`);
        try {
            const rawText = await executeProviderRequest(
                attempt.provider,
                attempt.model,
                attempt.key,
                prompt,
                options.system,
                options.temperature ?? 0.2,
                options.maxTokens ?? 4000,
                attempt.endpoint
            );

            // Clean json response if wrapped in markdown blocks
            let jsonString = rawText.trim();
            if (jsonString.startsWith('```')) {
                const match = jsonString.match(/```(?:json)?\n([\s\S]+?)\n```/);
                if (match) {
                    jsonString = match[1].trim();
                }
            }

            const parsed = JSON.parse(jsonString);
            
            // Validate with zod schema
            let validated: T;
            try {
                validated = schema.parse(parsed);
            } catch (schemaErr) {
                console.warn(`[Orchestrator] Zod schema validation failed on raw ${attempt.provider} result. Returning raw JSON.`, schemaErr);
                validated = parsed as T;
            }

            console.log(`✅ [Orchestrator] Success with ${attempt.provider.toUpperCase()}`);
            return validated;
        } catch (error: any) {
            console.error(`❌ [Orchestrator] ${attempt.provider.toUpperCase()} failed:`, error.message || error);
            lastError = error;
            if (config.mode === 'manual') {
                break; // In manual mode, do not failover
            }
        }
    }

    throw lastError || new Error("Failed to process request with any configured LLM providers.");
}
