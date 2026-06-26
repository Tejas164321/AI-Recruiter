// src/services/user-config.ts
import { db } from '@/lib/firebase/config';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export interface ApiConfig {
  mode: 'auto' | 'manual';
  activeModel: 'gemini' | 'claude' | 'gpt' | 'grok' | 'groq' | 'local';
  enableLocal: boolean;
  localUrl: string;
  localModel: string;
  keys: {
    gemini?: string;
    claude?: string;
    gpt?: string;
    grok?: string;
    groq?: string;
  };
  enabledModels?: {
    gemini?: boolean;
    gpt?: boolean;
    claude?: boolean;
    grok?: boolean;
    groq?: boolean;
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
    groq: '',
  },
  enabledModels: {
    gemini: true,
    gpt: false,
    claude: false,
    grok: false,
    groq: false,
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
          groq: data.keys?.groq || '',
        },
        enabledModels: {
          gemini: data.enabledModels?.gemini ?? (data.activeModel === 'gemini' || !!data.keys?.gemini),
          gpt: data.enabledModels?.gpt ?? (data.activeModel === 'gpt' || !!data.keys?.gpt),
          claude: data.enabledModels?.claude ?? (data.activeModel === 'claude' || !!data.keys?.claude),
          grok: data.enabledModels?.grok ?? (data.activeModel === 'grok' || !!data.keys?.grok),
          groq: data.enabledModels?.groq ?? (data.activeModel === 'groq' || !!data.keys?.groq),
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

/**
 * Validates the API configuration.
 * Returns an error message if invalid, or null if valid.
 */
export const validateApiConfig = (config: ApiConfig): string | null => {
  if (config.mode === 'manual') {
    const provider = config.activeModel;
    if (provider !== 'local') {
      const key = config.keys?.[provider];
      if (!key || !key.trim()) {
        const friendlyName = {
          gemini: 'Google Gemini',
          gpt: 'OpenAI GPT',
          claude: 'Anthropic Claude',
          grok: 'xAI Grok',
          groq: 'Groq Cloud'
        }[provider] || provider;
        return `The API key for ${friendlyName} is not configured. Please go to your Profile → API Configuration to add the key.`;
      }
    }
  } else {
    // Auto Mode: check if at least one enabled model has a key, or local is enabled
    const hasGemini = config.enabledModels?.gemini && config.keys?.gemini?.trim();
    const hasGpt = config.enabledModels?.gpt && config.keys?.gpt?.trim();
    const hasClaude = config.enabledModels?.claude && config.keys?.claude?.trim();
    const hasGrok = config.enabledModels?.grok && config.keys?.grok?.trim();
    const hasGroq = config.enabledModels?.groq && config.keys?.groq?.trim();
    const hasLocal = config.enabledModels?.local || config.enableLocal;

    if (!hasGemini && !hasGpt && !hasClaude && !hasGrok && !hasGroq && !hasLocal) {
      return "No AI models are configured with valid API keys. Please go to your Profile → API Configuration to enable at least one model and add its API key.";
    }
  }
  return null;
};
