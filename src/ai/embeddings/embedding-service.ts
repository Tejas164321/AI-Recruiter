/**
 * Embedding Service - Semantic Similarity via Transformers
 * 
 * Generates semantic embeddings for text using @xenova/transformers (ONNX Runtime for Node.js).
 * Uses all-MiniLM-L6-v2 model for 384-dimensional embeddings.
 * 
 * Features:
 * - Language-agnostic embeddings
 * - In-memory caching for performance
 * - Batch processing support
 * - Cosine similarity calculation
 */

import { pipeline, Pipeline } from '@xenova/transformers';

// ============================================
// Configuration
// ============================================

const EMBEDDING_MODEL = 'Xenova/all-MiniLM-L6-v2';
const MAX_CACHE_SIZE = 100;

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
    private pipeline: Pipeline | null = null;
    private cache: Map<string, number[]> = new Map();
    private initPromise: Promise<void> | null = null;

    /**
     * Initialize the embedding pipeline
     */
    private async initialize(): Promise<void> {
        if (this.pipeline) return;

        if (!this.initPromise) {
            this.initPromise = (async () => {
                console.log(`[EmbeddingService] Loading model: ${EMBEDDING_MODEL}...`);
                const startTime = Date.now();

                this.pipeline = await pipeline('feature-extraction', EMBEDDING_MODEL);

                const loadTime = Date.now() - startTime;
                console.log(`[EmbeddingService] Model loaded in ${loadTime}ms`);
            })();
        }

        await this.initPromise;
    }

    /**
     * Generate embedding for a single text
     */
    async generateEmbedding(text: string): Promise<EmbeddingResult> {
        await this.initialize();

        // Check cache
        const cacheKey = this.getCacheKey(text);
        if (this.cache.has(cacheKey)) {
            return {
                embedding: this.cache.get(cacheKey)!,
                model: EMBEDDING_MODEL,
                dimensions: 384,
                processingTimeMs: 0, // Cached
            };
        }

        const startTime = Date.now();

        // Generate embedding
        const output = await this.pipeline!(text, {
            pooling: 'mean',
            normalize: true,
        });

        // Convert to array
        const embedding = Array.from(output.data);

        // Cache the result
        this.cacheEmbedding(cacheKey, embedding);

        const processingTimeMs = Date.now() - startTime;

        return {
            embedding,
            model: EMBEDDING_MODEL,
            dimensions: embedding.length,
            processingTimeMs,
        };
    }

    /**
     * Generate embeddings for multiple texts (batch)
     */
    async generateEmbeddings(texts: string[]): Promise<EmbeddingResult[]> {
        await this.initialize();

        const startTime = Date.now();
        const results: EmbeddingResult[] = [];

        // Process in batches to avoid memory issues
        const batchSize = 5;
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
            throw new Error('Vectors must have the same dimensions');
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
     */
    private normalizeToScore(similarity: number): number {
        // Cosine similarity ranges from -1 to 1
        // Map to 0-100 scale
        // In practice, resume/JD similarity is usually 0.2 to 0.8
        // We'll use a slightly adjusted scale to give better differentiation

        // Simple linear mapping: [-1, 1] -> [0, 100]
        const linearScore = ((similarity + 1) / 2) * 100;

        // Apply slight sigmoid-like curve to spread mid-range scores
        // This gives better differentiation between candidates
        const adjusted = 50 + 50 * Math.tanh((similarity - 0.4) * 2);

        // Use average of both for balanced results
        const finalScore = (linearScore + adjusted) / 2;

        return Math.max(0, Math.min(100, Math.round(finalScore)));
    }

    /**
     * Cache management
     */
    private getCacheKey(text: string): string {
        // Use first 100 chars as cache key (most text is unique there)
        return text.substring(0, 100);
    }

    private cacheEmbedding(key: string, embedding: number[]): void {
        // Simple LRU: remove oldest if cache is full
        if (this.cache.size >= MAX_CACHE_SIZE) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        this.cache.set(key, embedding);
    }

    /**
     * Clear cache
     */
    clearCache(): void {
        this.cache.clear();
        console.log('[EmbeddingService] Cache cleared');
    }

    /**
     * Get cache statistics
     */
    getCacheStats(): { size: number; maxSize: number; hitRate: number } {
        return {
            size: this.cache.size,
            maxSize: MAX_CACHE_SIZE,
            hitRate: 0, // TODO: Implement hit rate tracking
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

/**
 * Generate embedding for text
 */
export async function generateEmbedding(text: string): Promise<number[]> {
    const service = getEmbeddingService();
    const result = await service.generateEmbedding(text);
    return result.embedding;
}

/**
 * Calculate semantic similarity between two texts (0-100 score)
 */
export async function calculateSemanticSimilarity(
    textA: string,
    textB: string
): Promise<number> {
    const service = getEmbeddingService();
    const result = await service.calculateSimilarity(textA, textB);
    return result.normalizedScore;
}

/**
 * Calculate semantic similarity between JD and resume
 * Returns a normalized 0-100 score
 */
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

/**
 * Batch process multiple resume comparisons against a single JD
 */
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

/**
 * Preload the embedding model (optional, for faster first request)
 */
export async function preloadEmbeddingModel(): Promise<void> {
    const service = getEmbeddingService();
    await service['initialize']();
    console.log('[EmbeddingService] Model preloaded');
}
