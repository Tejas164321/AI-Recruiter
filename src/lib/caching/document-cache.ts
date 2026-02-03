/**
 * Document Cache - In-Memory Caching for Parsed Documents
 * 
 * Provides simple caching to avoid re-parsing the same documents.
 * Useful for testing and when processing same JDs with multiple resume sets.
 */

import type { ParsedDocument } from '../processing/document-parser';
import crypto from 'crypto';

// ============================================
// Configuration
// ============================================

const MAX_CACHE_SIZE = 100; // Store up to 100 parsed documents (for bulk operations)
const CACHE_TTL_MS = 1000 * 60 * 30; // 30 minutes

// ============================================
// Types
// ============================================

interface CacheEntry {
    document: ParsedDocument;
    timestamp: number;
}

// ============================================
// In-Memory Cache
// ============================================

class DocumentCache {
    private cache: Map<string, CacheEntry> = new Map();

    /**
     * Generate cache key from data URI
     */
    private getCacheKey(dataUri: string): string {
        // Use SHA256 hash of first 1000 characters + file size
        const sample = dataUri.substring(0, 1000);
        return crypto.createHash('sha256').update(sample + dataUri.length).digest('hex');
    }

    /**
     * Get cached document
     */
    get(dataUri: string): ParsedDocument | null {
        const key = this.getCacheKey(dataUri);
        const entry = this.cache.get(key);

        if (!entry) return null;

        // Check if expired
        if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
            this.cache.delete(key);
            return null;
        }

        console.log(`[DocumentCache] Cache hit for ${entry.document.metadata.fileName}`);
        return entry.document;
    }

    /**
     * Store document in cache
     */
    set(dataUri: string, document: ParsedDocument): void {
        const key = this.getCacheKey(dataUri);

        // Implement simple LRU: remove oldest if cache is full
        if (this.cache.size >= MAX_CACHE_SIZE) {
            const firstKey = this.cache.keys().next().value;
            if (firstKey) {
                this.cache.delete(firstKey);
                console.log(`[DocumentCache] Evicted oldest entry (cache full)`);
            }
        }

        this.cache.set(key, {
            document,
            timestamp: Date.now(),
        });

        console.log(`[DocumentCache] Cached ${document.metadata.fileName} (${this.cache.size}/${MAX_CACHE_SIZE})`);
    }

    /**
     * Clear all cached documents
     */
    clear(): void {
        this.cache.clear();
        console.log(`[DocumentCache] Cache cleared`);
    }

    /**
     * Get cache statistics
     */
    getStats(): { size: number; maxSize: number } {
        return {
            size: this.cache.size,
            maxSize: MAX_CACHE_SIZE,
        };
    }
}

// ============================================
// Singleton Instance
// ============================================

let _documentCacheInstance: DocumentCache | null = null;

export function getDocumentCache(): DocumentCache {
    if (!_documentCacheInstance) {
        _documentCacheInstance = new DocumentCache();
    }
    return _documentCacheInstance;
}

// ============================================
// Convenience Functions
// ============================================

/**
 * Get cached parsed document
 */
export function getCachedDocument(dataUri: string): ParsedDocument | null {
    return getDocumentCache().get(dataUri);
}

/**
 * Cache a parsed document
 */
export function cacheDocument(dataUri: string, document: ParsedDocument): void {
    getDocumentCache().set(dataUri, document);
}

/**
 * Clear document cache
 */
export function clearDocumentCache(): void {
    getDocumentCache().clear();
}
