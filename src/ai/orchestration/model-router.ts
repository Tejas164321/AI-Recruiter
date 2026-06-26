// src/ai/orchestration/model-router.ts
import { type ApiConfig, DEFAULT_API_CONFIG } from '@/services/user-config';
import type { ZodSchema } from 'zod';
import { convertZodToGeminiSchema } from '@/ai/local-llm/ollama-client';

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
    endpoint?: string,
    schema?: ZodSchema<any>
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
                const genConfig: any = {
                    temperature,
                    maxOutputTokens: maxTokens,
                    responseMimeType: "application/json",
                    thinkingConfig: {
                        thinkingBudget: 0
                    }
                };
                if (schema) {
                    const responseSchema = convertZodToGeminiSchema(schema);
                    if (responseSchema) {
                        genConfig.responseSchema = responseSchema;
                    }
                }
                body = {
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: genConfig,
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

            case 'groq':
                if (!key) throw new Error("Groq API key missing");
                url = 'https://api.groq.com/openai/v1/chat/completions';
                headers['Authorization'] = `Bearer ${key}`;
                body = {
                    model: model || 'llama-3.3-70b-versatile',
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
            if (response.status === 429) {
                throw new Error("AI provider rate limit or quota exceeded. Please wait a moment before trying again, check your API billing/quota status, or try using an alternative AI model in your Profile settings.");
            }
            throw new Error(`HTTP Error ${response.status}: ${errorText.substring(0, 300)}`);
        }

        const responseData = await response.json();
        let textResult = '';

        // Extract raw JSON string from responses
        switch (provider) {
            case 'gemini':
                textResult = responseData.candidates?.[0]?.content?.parts?.[0]?.text || '';
                const candidate = responseData.candidates?.[0];
                const finishReason = candidate?.finishReason;
                console.log(`🤖 [Orchestrator] Gemini Finish Reason: ${finishReason}`);
                if (finishReason && finishReason !== 'STOP') {
                    console.warn(`⚠️ [Orchestrator] Gemini response did not finish with STOP. Full candidates:`, JSON.stringify(responseData.candidates, null, 2));
                }
                break;
            case 'gpt':
            case 'grok':
            case 'groq':
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
 * Escapes unescaped control characters within double quotes in a JSON string
 */
function cleanJsonString(str: string): string {
    let cleaned = str.trim();
    
    // Extract from markdown code blocks if present anywhere in the text
    const codeBlockRegex = /```(?:json)?\s*([\s\S]+?)\s*```/;
    const match = cleaned.match(codeBlockRegex);
    if (match) {
        cleaned = match[1].trim();
    } else {
        // If no markdown code block, extract the JSON object/array bounds
        const firstBrace = cleaned.indexOf('{');
        const lastBrace = cleaned.lastIndexOf('}');
        const firstBracket = cleaned.indexOf('[');
        const lastBracket = cleaned.lastIndexOf(']');
        
        let startIdx = -1;
        let endIdx = -1;
        
        if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
            startIdx = firstBrace;
            endIdx = lastBrace;
        } else if (firstBracket !== -1) {
            startIdx = firstBracket;
            endIdx = lastBracket;
        }
        
        if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
            cleaned = cleaned.substring(startIdx, endIdx + 1);
        }
    }
    
    let inString = false;
    let isEscaped = false;
    let result = '';
    
    for (let i = 0; i < cleaned.length; i++) {
        const char = cleaned[i];
        
        if (char === '"' && !isEscaped) {
            inString = !inString;
            result += char;
        } else if (inString) {
            if (char === '\\') {
                isEscaped = !isEscaped;
                result += char;
            } else {
                isEscaped = false;
                if (char === '\n') {
                    result += '\\n';
                } else if (char === '\r') {
                    result += '\\r';
                } else if (char === '\t') {
                    result += '\\t';
                } else {
                    result += char;
                }
            }
        } else {
            isEscaped = false;
            result += char;
        }
    }
    
    return result;
}

/**
 * Attempts to repair truncated JSON by appending closing quotes, brackets, and braces
 */
function tryRepairTruncatedJson(jsonStr: string): string {
    let str = jsonStr.trim();
    if (!str) return '{}';
    if (!str.startsWith('{') && !str.startsWith('[')) return str;
    
    let braceCount = 0;
    let bracketCount = 0;
    let inString = false;
    let isEscaped = false;
    
    for (let i = 0; i < str.length; i++) {
        const char = str[i];
        if (char === '"' && !isEscaped) {
            inString = !inString;
        } else if (inString) {
            if (char === '\\') {
                isEscaped = !isEscaped;
            } else {
                isEscaped = false;
            }
        } else {
            isEscaped = false;
            if (char === '{') braceCount++;
            else if (char === '}') braceCount--;
            else if (char === '[') bracketCount++;
            else if (char === ']') bracketCount--;
        }
    }
    
    if (inString) {
        str += '"';
    }
    while (bracketCount > 0) {
        str += ']';
        bracketCount--;
    }
    while (braceCount > 0) {
        str += '}';
        braceCount--;
    }
    
    return str;
}

/**
 * Repairs and extracts JSON key-value pairs using the known schema keys to bypass unescaped quotes/newlines
 */
function repairJsonByKeys(rawText: string, knownKeys: string[]): any {
    const keyPositions: Array<{ key: string; index: number; valueStart: number }> = [];
    
    for (const key of knownKeys) {
        const regex = new RegExp(`(["']?)${key}\\1\\s*:`, 'g');
        let match;
        while ((match = regex.exec(rawText)) !== null) {
            keyPositions.push({
                key,
                index: match.index,
                valueStart: match.index + match[0].length
            });
        }
    }
    
    keyPositions.sort((a, b) => a.index - b.index);
    
    if (keyPositions.length === 0) {
        throw new Error("No known JSON keys found in response");
    }
    
    const parsedObject: Record<string, any> = {};
    
    for (let i = 0; i < keyPositions.length; i++) {
        const current = keyPositions[i];
        const next = keyPositions[i + 1];
        
        let rawValue = next 
            ? rawText.substring(current.valueStart, next.index)
            : rawText.substring(current.valueStart);
            
        rawValue = rawValue.trim();
        if (rawValue.endsWith(',')) {
            rawValue = rawValue.slice(0, -1).trim();
        }
        
        if (!next) {
            rawValue = rawValue.replace(/[\}\]\s]+$/, '').trim();
        }
        
        if (rawValue.startsWith('"') || rawValue.startsWith("'")) {
            const quoteChar = rawValue[0];
            let stringContent = rawValue.slice(1);
            if (stringContent.endsWith(quoteChar)) {
                stringContent = stringContent.slice(0, -1);
            }
            
            stringContent = stringContent
                .replace(/\r/g, '')
                .replace(/\n/g, '\\n')
                .replace(/\\"/g, '"')
                .replace(/"/g, '\\"');
                
            parsedObject[current.key] = stringContent;
        } else if (rawValue.startsWith('[')) {
            let arrayContent = rawValue.slice(1);
            if (arrayContent.endsWith(']')) {
                arrayContent = arrayContent.slice(0, -1);
            }
            
            const items: string[] = [];
            const itemRegex = /(["'])([\s\S]*?)(?<!\\)\1/g;
            let itemMatch;
            while ((itemMatch = itemRegex.exec(arrayContent)) !== null) {
                let itemText = itemMatch[2]
                    .replace(/\r/g, '')
                    .replace(/\n/g, '\\n')
                    .replace(/\\"/g, '"')
                    .replace(/"/g, '\\"');
                items.push(itemText);
            }
            
            if (items.length === 0 && arrayContent.trim()) {
                const parts = arrayContent.split(',');
                for (const part of parts) {
                    let cleanedPart = part.trim();
                    if ((cleanedPart.startsWith('"') && cleanedPart.endsWith('"')) ||
                        (cleanedPart.startsWith("'") && cleanedPart.endsWith("'"))) {
                        cleanedPart = cleanedPart.slice(1, -1);
                    }
                    items.push(cleanedPart.replace(/"/g, '\\"'));
                }
            }
            
            parsedObject[current.key] = items;
        } else {
            let val: any = rawValue;
            if (val === 'true') val = true;
            else if (val === 'false') val = false;
            else if (val === 'null') val = null;
            else if (!isNaN(Number(val))) val = Number(val);
            parsedObject[current.key] = val;
        }
    }
    
    return parsedObject;
}

/**
 * Helper to unwrap nested single-key JSON wrapper objects returned by some models.
 */
function unwrapNestedJson(obj: any): any {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
        return obj;
    }
    
    const keys = Object.keys(obj);
    if (keys.length === 1) {
        const child = obj[keys[0]];
        if (child && typeof child === 'object' && !Array.isArray(child)) {
            const childKeys = Object.keys(child).map(k => k.toLowerCase().replace(/[^a-z0-9]/g, ''));
            const expected = ['strengths', 'improvements', 'weaknesses', 'resumeadditions', 'bulletpoints', 'suggestedresumebulletpoints'];
            const hasExpected = childKeys.some(ck => expected.includes(ck));
            if (hasExpected) {
                console.log(`[Orchestrator] Unwrapping nested JSON structure under key: "${keys[0]}"`);
                return unwrapNestedJson(child);
            }
        }
    }
    
    return obj;
}

/**
 * Normalizes keys in parsed JSON objects using known synonyms for robust Zod schema validation.
 */
function normalizeJsonKeys(obj: any): any {
    if (!obj || typeof obj !== 'object') {
        return obj;
    }
    if (Array.isArray(obj)) {
        return obj.map(normalizeJsonKeys);
    }
    
    const normalized: any = {};
    
    const keyMap: Record<string, string[]> = {
        'strengths': [
            'strengths', 'candidatestrengths', 'candidate_strengths', 'strength',
            'candidatestrength', 'strength1', 'strength2'
        ],
        'improvements': [
            'improvements', 'weaknesses', 'gaps', 'recommendations', 'specificimprovements',
            'specific_improvements', 'improvement', 'weakness', 'gap', 'recommendation',
            'recommendationimprovements', 'recommendationsimprovements', 'recommendationandimprovements'
        ],
        'resumeAdditions': [
            'resumeadditions', 'suggestedresumebulletpoints', 'bulletpoints', 'additions',
            'resumebulletpoints', 'suggestedbulletpoints', 'resumeadditions', 'resume_additions',
            'suggestedresumebulletpoint', 'resumeadditionsbulletpoints', 'bulletpointsfeedback'
        ],
        'summary': ['summary', 'fit_summary', 'overallfit', 'overall_fit', 'fitoverview'],
        'experienceRelevance': ['experiencerelevance', 'experience_relevance', 'relevance', 'experiencefit'],
        'scoreExplanation': ['scoreexplanation', 'score_explanation', 'explanation', 'explanationofscore'],
        'detailedFeedback': ['detailedfeedback', 'detailed_feedback', 'feedback', 'detailedatsfeedback'],
        'specificImprovements': ['specificimprovements', 'specific_improvements', 'atsimprovements']
    };
    
    for (const rawKey in obj) {
        if (!Object.prototype.hasOwnProperty.call(obj, rawKey)) continue;
        
        let mappedKey = rawKey;
        const cleanRawKey = rawKey.toLowerCase().replace(/[^a-z0-9]/g, '');
        
        for (const [expectedKey, synonyms] of Object.entries(keyMap)) {
            if (synonyms.map(s => s.toLowerCase().replace(/[^a-z0-9]/g, '')).includes(cleanRawKey)) {
                mappedKey = expectedKey;
                break;
            }
        }
        
        normalized[mappedKey] = normalizeJsonKeys(obj[rawKey]);
    }
    
    return normalized;
}

/**
 * Parse JSON string robustly with fallback repair strategies
 */
function robustJsonParse(rawText: string, knownKeys?: string[]): any {
    const cleaned = cleanJsonString(rawText);
    let parsed: any;
    try {
        parsed = JSON.parse(cleaned);
    } catch (firstErr) {
        console.warn("[Orchestrator] Standard JSON parse failed. Raw response was:\n", rawText);
        console.warn("[Orchestrator] Standard JSON parse failed. Attempting to repair malformed JSON...", firstErr);
        
        if (knownKeys && knownKeys.length > 0) {
            try {
                console.log("[Orchestrator] Attempting key-based JSON extraction...");
                parsed = repairJsonByKeys(rawText, knownKeys);
            } catch (keyErr) {
                console.warn("[Orchestrator] Key-based extraction failed:", keyErr);
            }
        }
        
        if (!parsed) {
            try {
                const repaired = tryRepairTruncatedJson(cleaned);
                parsed = JSON.parse(repaired);
            } catch (repairErr: any) {
                console.error("[Orchestrator] JSON repair failed. Raw response length:", rawText.length);
                throw new Error(`Failed to parse LLM response as JSON: ${repairErr.message || repairErr}. Raw: ${rawText.substring(0, 100)}...`);
            }
        }
    }

    if (parsed) {
        parsed = unwrapNestedJson(parsed);
        parsed = normalizeJsonKeys(parsed);
    }
    return parsed;
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
            case 'gemini': return config.keys.gemini;
            case 'gpt': return config.keys.gpt;
            case 'claude': return config.keys.claude;
            case 'grok': return config.keys.grok;
            case 'groq': return config.keys.groq;
            default: return undefined;
        }
    };

    const getProviderModel = (provider: string): string => {
        switch (provider) {
            case 'gemini': return 'gemini-2.5-flash';
            case 'gpt': return 'gpt-4o-mini';
            case 'claude': return 'claude-3-5-haiku-20241022';
            case 'grok': return 'grok-beta';
            case 'groq': return 'llama-3.3-70b-versatile';
            case 'local': return config.localModel || 'qwen2.5';
            default: return '';
        }
    };

    if (config.mode === 'manual') {
        const provider = config.activeModel;
        const key = getProviderKey(provider);
        if (provider !== 'local' && (!key || !key.trim())) {
            const friendlyName = {
                gemini: 'Google Gemini',
                gpt: 'OpenAI GPT',
                claude: 'Anthropic Claude',
                grok: 'xAI Grok',
                groq: 'Groq Cloud'
            }[provider] || provider;
            throw new Error(
                `The API key for ${friendlyName} is not configured. ` +
                `Please go to your Profile → API Configuration to add the key.`
            );
        }
        modelsToTry.push({
            provider,
            model: getProviderModel(provider),
            key,
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
        if (isEnabled('gemini') && config.keys.gemini) {
            modelsToTry.push({ provider: 'gemini', model: 'gemini-2.5-flash', key: config.keys.gemini });
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
        // Try Groq Cloud
        if (isEnabled('groq') && config.keys.groq) {
            modelsToTry.push({ provider: 'groq', model: 'llama-3.3-70b-versatile', key: config.keys.groq });
        }
        // Try Local LLM (Ollama)
        if (isEnabled('local')) {
            modelsToTry.push({ provider: 'local', model: config.localModel || 'qwen2.5', key: '', endpoint: config.localUrl });
        }
    }

    // No models configured — guide the user to set up their API keys
    if (modelsToTry.length === 0) {
        throw new Error(
            "No AI model is configured. Please go to your Profile → API Configuration and add an API key " +
            "(e.g. Gemini, OpenAI, Claude, or Grok) or enable a Local LLM to use this feature."
        );
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
                attempt.endpoint,
                schema
            );

            let knownKeys: string[] = [];
            if (schema && (schema as any).shape) {
                knownKeys = Object.keys((schema as any).shape);
            }
            const parsed = robustJsonParse(rawText, knownKeys);
            
            // Validate with zod schema
            try {
                const validated = schema.parse(parsed);
                console.log(`✅ [Orchestrator] Success with ${attempt.provider.toUpperCase()}`);
                return validated;
            } catch (zodErr) {
                console.error(`❌ [Orchestrator] Zod parsing failed for parsed JSON:\n`, JSON.stringify(parsed, null, 2));
                console.error(`❌ [Orchestrator] Raw text was:\n`, rawText);
                throw zodErr;
            }
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
