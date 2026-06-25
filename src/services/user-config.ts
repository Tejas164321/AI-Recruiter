// src/services/user-config.ts
import { db } from '@/lib/firebase/config';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export interface ApiConfig {
  mode: 'auto' | 'manual';
  activeModel: 'gemini' | 'claude' | 'gpt' | 'grok' | 'local';
  enableLocal: boolean;
  localUrl: string;
  localModel: string;
  keys: {
    gemini?: string;
    claude?: string;
    gpt?: string;
    grok?: string;
  };
  enabledModels?: {
    gemini?: boolean;
    gpt?: boolean;
    claude?: boolean;
    grok?: boolean;
    local?: boolean;
  };
}

export const DEFAULT_API_CONFIG: ApiConfig = {
  mode: 'manual',
  activeModel: 'gemini',
  enableLocal: false,
  localUrl: 'http://localhost:11434',
  localModel: 'qwen2.5',
  keys: {
    gemini: '',
    claude: '',
    gpt: '',
    grok: '',
  },
  enabledModels: {
    gemini: true,
    gpt: false,
    claude: false,
    grok: false,
    local: false,
  }
};

/**
 * Saves the recruiter's system API configurations to Firestore
 */
export const saveUserApiConfig = async (userId: string, config: ApiConfig): Promise<void> => {
  if (!db) {
    // If db is not connected, store in localStorage as a fallback
    localStorage.setItem(`apiconfig_${userId}`, JSON.stringify(config));
    return;
  }

  try {
    const docRef = doc(db, "userApiConfigs", userId);
    await setDoc(docRef, {
      ...config,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    
    // Also update localStorage cache
    localStorage.setItem(`apiconfig_${userId}`, JSON.stringify(config));
  } catch (error) {
    console.error("Error saving user API config:", error);
    throw error;
  }
};

/**
 * Gets the recruiter's system API configurations from Firestore
 */
export const getUserApiConfig = async (userId: string): Promise<ApiConfig> => {
  // Check localStorage cache first for immediate load
  const cached = localStorage.getItem(`apiconfig_${userId}`);
  let cachedConfig: ApiConfig | null = null;
  if (cached) {
    try {
      cachedConfig = JSON.parse(cached);
    } catch (_) {
      // Ignored
    }
  }

  if (!db) {
    return cachedConfig || DEFAULT_API_CONFIG;
  }

  try {
    const docRef = doc(db, "userApiConfigs", userId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data() as ApiConfig;
      // Filter out meta timestamps
      const config: ApiConfig = {
        mode: data.mode || 'manual',
        activeModel: data.activeModel || 'gemini',
        enableLocal: !!data.enableLocal,
        localUrl: data.localUrl || 'http://localhost:11434',
        localModel: data.localModel || 'qwen2.5',
        keys: {
          gemini: data.keys?.gemini || '',
          claude: data.keys?.claude || '',
          gpt: data.keys?.gpt || '',
          grok: data.keys?.grok || '',
        },
        enabledModels: {
          gemini: data.enabledModels?.gemini ?? (data.activeModel === 'gemini' || !!data.keys?.gemini),
          gpt: data.enabledModels?.gpt ?? (data.activeModel === 'gpt' || !!data.keys?.gpt),
          claude: data.enabledModels?.claude ?? (data.activeModel === 'claude' || !!data.keys?.claude),
          grok: data.enabledModels?.grok ?? (data.activeModel === 'grok' || !!data.keys?.grok),
          local: data.enabledModels?.local ?? (data.activeModel === 'local' || !!data.enableLocal),
        }
      };
      
      // Update cache
      localStorage.setItem(`apiconfig_${userId}`, JSON.stringify(config));
      return config;
    }
    
    return cachedConfig || DEFAULT_API_CONFIG;
  } catch (error) {
    console.error("Error loading user API config:", error);
    return cachedConfig || DEFAULT_API_CONFIG;
  }
};
