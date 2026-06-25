/**
 * Embedding Service - Semantic Similarity via Google Gemini or Local Transformers
 * 
 * Primary: Google text-embedding-004 API (768 dimensions) for state-of-the-art semantic accuracy.
 * Fallback: Local @xenova/transformers (384 dimensions) for offline-capable fault tolerance.
 * 
 * Features:
 * - Highly accurate, production-grade cloud embeddings from Google
 * - Seamless offline/error fallback to local MiniLM transformer model
 * - In-memory caching for performance
 * - Cosine similarity calculation
 */

import { pipeline } from '@xenova/transformers';

// ============================================
// Configuration
// ============================================

const LOCAL_EMBEDDING_MODEL = 'Xenova/all-MiniLM-L6-v2';
const GEMINI_EMBEDDING_MODEL = 'gemini-embedding-2';
const MAX_CACHE_SIZE = 200; // LRU Cache size

// ============================================
// Types
// ============================================

export interface EmbeddingResult {
    embedding: number[];
    model: string;
    dimensions: number;
    processingTimeMs: number;
}

export interface SimilarityScore {
    score: number;
    normalizedScore: number; // 0-100
}

// ============================================
// Embedding Service Class
// ============================================

class EmbeddingService {
    private pipeline: any = null;
    private cache: Map<string, number[]> = new Map();
    private initPromise: Promise<void> | null = null;

    /**
     * Initialize the local embedding pipeline (only loaded as a fallback)
     */
    private async initialize(): Promise<void> {
        if (this.pipeline) return;

        if (!this.initPromise) {
            this.initPromise = (async () => {
                console.log(`[EmbeddingService] Loading local fallback model: ${LOCAL_EMBEDDING_MODEL}...`);
                const startTime = Date.now();

                this.pipeline = await pipeline('feature-extraction', LOCAL_EMBEDDING_MODEL);

                const loadTime = Date.now() - startTime;
                console.log(`[EmbeddingService] Local model loaded in ${loadTime}ms`);
            })();
        }

        await this.initPromise;
    }

    /**
     * Fetch embeddings using the official Google Gemini API (text-embedding-004)
     */
    private async generateGeminiEmbedding(text: string): Promise<number[] | null> {
        const apiKey = process.env.GOOGLE_API_KEY;
        if (!apiKey) return null;

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_EMBEDDING_MODEL}:embedContent?key=${apiKey}`;
        const requestBody = {
            model: `models/${GEMINI_EMBEDDING_MODEL}`,
            content: {
                parts: [{ text }]
            }
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            const errText = await response.text();
            console.warn(`[EmbeddingService] Gemini Embedding API error (HTTP ${response.status}): ${errText}`);
            return null;
        }

        const data = await response.json();
        const values = data.embedding?.values;

        if (!values || !Array.isArray(values)) {
            console.warn('[EmbeddingService] Gemini Embedding API response missing values.');
            return null;
        }

        return values;
    }

    /**
     * Generate embedding for a single text (Cloud primary, Local fallback)
     */
    async generateEmbedding(text: string): Promise<EmbeddingResult> {
        const cacheKey = this.getCacheKey(text);
        const startTime = Date.now();

        // 1. Check Cache
        if (this.cache.has(cacheKey)) {
            const cachedEmbedding = this.cache.get(cacheKey)!;
            return {
                embedding: cachedEmbedding,
                model: cachedEmbedding.length > 500 ? GEMINI_EMBEDDING_MODEL : LOCAL_EMBEDDING_MODEL,
                dimensions: cachedEmbedding.length,
                processingTimeMs: 0, // Cached
            };
        }

        let embedding: number[] | null = null;
        let modelUsed = GEMINI_EMBEDDING_MODEL;
        let dimensions = 768;

        // 2. Try Gemini Cloud Embedding API
        if (process.env.GOOGLE_API_KEY) {
            try {
                embedding = await this.generateGeminiEmbedding(text);
            } catch (err) {
                console.warn('[EmbeddingService] Failed to generate Gemini cloud embedding. Falling back to local model:', err);
            }
        }

        // 3. Fallback to Local Transformers Model
        if (!embedding) {
            await this.initialize();
            console.log('[EmbeddingService] Generating embedding using local fallback...');
            const output = await this.pipeline!(text, {
                pooling: 'mean',
                normalize: true,
            });
            embedding = Array.from(output.data) as number[];
            modelUsed = LOCAL_EMBEDDING_MODEL;
            dimensions = 384;
        }

        // 4. Cache and Return
        this.cacheEmbedding(cacheKey, embedding);
        const processingTimeMs = Date.now() - startTime;

        return {
            embedding,
            model: modelUsed,
            dimensions: embedding.length,
            processingTimeMs,
        };
    }

    /**
     * Generate embeddings for multiple texts (batch)
     */
    async generateEmbeddings(texts: string[]): Promise<EmbeddingResult[]> {
        const startTime = Date.now();
        const results: EmbeddingResult[] = [];

        // Process in batches
        const batchSize = 10;
        for (let i = 0; i < texts.length; i += batchSize) {
            const batch = texts.slice(i, i + batchSize);
            const batchResults = await Promise.all(
                batch.map(text => this.generateEmbedding(text))
            );
            results.push(...batchResults);
        }

        const totalTime = Date.now() - startTime;
        console.log(`[EmbeddingService] Generated ${results.length} embeddings in ${totalTime}ms`);

        return results;
    }

    /**
     * Calculate cosine similarity between two embeddings
     */
    cosineSimilarity(vecA: number[], vecB: number[]): number {
        if (vecA.length !== vecB.length) {
            throw new Error(`Vectors must have the same dimensions (got ${vecA.length} and ${vecB.length})`);
        }

        const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
        const magA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
        const magB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));

        if (magA === 0 || magB === 0) {
            return 0;
        }

        return dotProduct / (magA * magB);
    }

    /**
     * Calculate similarity score between two texts
     */
    async calculateSimilarity(textA: string, textB: string): Promise<SimilarityScore> {
        const [embeddingA, embeddingB] = await Promise.all([
            this.generateEmbedding(textA),
            this.generateEmbedding(textB),
        ]);

        const similarity = this.cosineSimilarity(
            embeddingA.embedding,
            embeddingB.embedding
        );

        const normalizedScore = this.normalizeToScore(similarity);

        return {
            score: similarity,
            normalizedScore,
        };
    }

    /**
     * Normalize cosine similarity (-1 to 1) to a 0-100 score
     * sigmoidal mapping provides high contrast for candidate comparison
     */
    private normalizeToScore(similarity: number): number {
        const linearScore = ((similarity + 1) / 2) * 100;
        const adjusted = 50 + 50 * Math.tanh((similarity - 0.4) * 2);
        const finalScore = (linearScore + adjusted) / 2;

        return Math.max(0, Math.min(100, Math.round(finalScore)));
    }

    /**
     * Cache management
     */
    private getCacheKey(text: string): string {
        return text.substring(0, 100);
    }

    private cacheEmbedding(key: string, embedding: number[]): void {
        if (this.cache.size >= MAX_CACHE_SIZE) {
            const firstKey = this.cache.keys().next().value;
            if (firstKey !== undefined) {
                this.cache.delete(firstKey);
            }
        }
        this.cache.set(key, embedding);
    }

    clearCache(): void {
        this.cache.clear();
        console.log('[EmbeddingService] Cache cleared');
    }

    getCacheStats(): { size: number; maxSize: number; hitRate: number } {
        return {
            size: this.cache.size,
            maxSize: MAX_CACHE_SIZE,
            hitRate: 0,
        };
    }
}

// ============================================
// Singleton Instance
// ============================================

let _embeddingServiceInstance: EmbeddingService | null = null;

export function getEmbeddingService(): EmbeddingService {
    if (!_embeddingServiceInstance) {
        _embeddingServiceInstance = new EmbeddingService();
    }
    return _embeddingServiceInstance;
}

// ============================================
// Convenience Functions
// ============================================

export async function generateEmbedding(text: string): Promise<number[]> {
    const service = getEmbeddingService();
    const result = await service.generateEmbedding(text);
    return result.embedding;
}

export async function calculateSemanticSimilarity(
    textA: string,
    textB: string
): Promise<number> {
    const service = getEmbeddingService();
    const result = await service.calculateSimilarity(textA, textB);
    return result.normalizedScore;
}

export async function calculateJDResumeMatch(
    jobDescription: string,
    resumeText: string
): Promise<{
    score: number;
    rawSimilarity: number;
    processingTimeMs: number;
}> {
    const startTime = Date.now();
    const service = getEmbeddingService();

    const result = await service.calculateSimilarity(jobDescription, resumeText);
    const processingTimeMs = Date.now() - startTime;

    return {
        score: result.normalizedScore,
        rawSimilarity: result.score,
        processingTimeMs,
    };
}

export async function batchCalculateMatches(
    jobDescription: string,
    resumes: string[]
): Promise<Array<{ score: number; rawSimilarity: number }>> {
    const service = getEmbeddingService();

    console.log(`[EmbeddingService] Batch processing ${resumes.length} resumes...`);
    const startTime = Date.now();

    // Generate JD embedding once
    const jdEmbedding = await service.generateEmbedding(jobDescription);

    // Generate all resume embeddings
    const resumeEmbeddings = await service.generateEmbeddings(resumes);

    // Calculate similarities
    const results = resumeEmbeddings.map(resumeEmbed => {
        const similarity = service.cosineSimilarity(
            jdEmbedding.embedding,
            resumeEmbed.embedding
        );

        return {
            score: service['normalizeToScore'](similarity),
            rawSimilarity: similarity,
        };
    });

    const totalTime = Date.now() - startTime;
    console.log(`[EmbeddingService] Batch completed in ${totalTime}ms (avg ${Math.round(totalTime / resumes.length)}ms per resume)`);

    return results;
}

export async function preloadEmbeddingModel(): Promise<void> {
    const service = getEmbeddingService();
    await service['initialize']();
    console.log('[EmbeddingService] Model preloaded');
}
